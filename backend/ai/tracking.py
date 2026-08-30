"""
Person Tracking Module
Dense-crowd tracker for CCTV monitoring.

YOLO runs periodically.
Between YOLO detections, tracks are predicted using velocity.

Global assignment is used to reduce ID fragmentation in dense crowds.
"""

from typing import List, Dict, Tuple
import logging
import math

import numpy as np
from scipy.optimize import linear_sum_assignment

logger = logging.getLogger(__name__)


class SimpleTracker:

    def __init__(
        self,
        iou_threshold: float = 0.10,
        max_age: int = 20,
        min_hits: int = 1,
        max_distance: float = 150.0
    ):

        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.min_hits = min_hits
        self.max_distance = max_distance

        # All existing tracks
        self.tracks: Dict[int, dict] = {}

        # Next ID
        self.next_track_id = 1

    # =========================================================
    # MAIN UPDATE
    # =========================================================

    def update(
        self,
        detections: List[dict],
        frame_number: int,
        detections_available: bool = True
    ) -> List[dict]:

        # =====================================================
        # NO YOLO DETECTION
        # =====================================================

        if not detections_available:

            active_tracks = []

            for track_id in list(self.tracks.keys()):

                track = self.tracks[track_id]

                track["frames_since_detection"] += 1

                if (
                    track["frames_since_detection"]
                    > self.max_age
                ):
                    del self.tracks[track_id]
                    continue

                # -------------------------------------------------
                # Predict position
                # -------------------------------------------------

                x1, y1, x2, y2 = track["bbox"]

                vx, vy = track["velocity"]

                predicted_bbox = [
                    x1 + vx,
                    y1 + vy,
                    x2 + vx,
                    y2 + vy
                ]

                track["bbox"] = predicted_bbox

                track["center"] = self._get_center(
                    predicted_bbox
                )

                track["frame_number"] = frame_number

                # Gradually reduce velocity while prediction
                # continues without a fresh detection.

                track["velocity"] = (
                    vx * 0.9,
                    vy * 0.9
                )

                if (
                    track["active"]
                    and
                    track["hits"] >= self.min_hits
                ):
                    active_tracks.append(
                        track.copy()
                    )

            return active_tracks

        # =====================================================
        # YOLO DETECTION FRAME
        # =====================================================

        matched_track_ids = set()
        matched_detection_indices = set()

        track_items = list(
            self.tracks.items()
        )

        # =====================================================
        # GLOBAL ASSIGNMENT
        # =====================================================

        if track_items and detections:

            cost_matrix = np.full(
                (
                    len(detections),
                    len(track_items)
                ),
                1e6,
                dtype=np.float32
            )

            for detection_index, detection in enumerate(
                detections
            ):

                detection_bbox = detection["bbox"]

                detection_center = self._get_center(
                    detection_bbox
                )

                _, _, box_width, box_height = (
                    self._xyxy_to_xywh(
                        detection_bbox
                    )
                )

                adaptive_distance = max(
                    self.max_distance,
                    max(
                        box_width,
                        box_height
                    ) * 2.0
                )

                for track_index, (
                    track_id,
                    track
                ) in enumerate(track_items):

                    track_center = track["center"]

                    distance = self._center_distance(
                        detection_center,
                        track_center
                    )

                    # Do not allow completely unreasonable
                    # assignments.

                    recovery_multiplier = (
                        1.5
                        if not track["active"]
                        else 1.0
                    )

                    allowed_distance = (
                        adaptive_distance
                        *
                        recovery_multiplier
                    )

                    if distance > allowed_distance:
                        continue

                    iou = self._calculate_iou(
                        detection_bbox,
                        track["bbox"]
                    )

                    distance_score = max(
                        0.0,
                        1.0
                        -
                        (
                            distance
                            /
                            allowed_distance
                        )
                    )

                    iou_score = min(
                        max(iou, 0.0),
                        1.0
                    )

                    # Higher score = better match.
                    #
                    # Hungarian algorithm minimizes cost,
                    # therefore convert score into cost.

                    match_score = (
                        0.65 * distance_score
                        +
                        0.35 * iou_score
                    )

                    # Slight preference for existing active
                    # tracks.

                    if track["active"]:
                        match_score += 0.05

                    cost_matrix[
                        detection_index,
                        track_index
                    ] = 1.0 - match_score

            # -------------------------------------------------
            # Solve globally
            # -------------------------------------------------

            row_indices, col_indices = (
                linear_sum_assignment(
                    cost_matrix
                )
            )

            for (
                detection_index,
                track_index
            ) in zip(
                row_indices,
                col_indices
            ):

                cost = cost_matrix[
                    detection_index,
                    track_index
                ]

                # Invalid / impossible match
                if cost >= 1e5:
                    continue

                track_id, track = track_items[
                    track_index
                ]

                detection = detections[
                    detection_index
                ]

                self._update_track(
                    track,
                    detection,
                    frame_number
                )

                matched_track_ids.add(
                    track_id
                )

                matched_detection_indices.add(
                    detection_index
                )

        # =====================================================
        # SECOND-STAGE RECOVERY
        # =====================================================
        #
        # Any unmatched detection gets another chance against
        # recently lost tracks before a new ID is created.
        # =====================================================

        unmatched_detections = [
            i
            for i in range(
                len(detections)
            )
            if i not in matched_detection_indices
        ]

        lost_tracks = [
            (track_id, track)
            for track_id, track in self.tracks.items()
            if (
                track_id not in matched_track_ids
                and
                not track["active"]
                and
                track["frames_since_detection"]
                <= self.max_age
            )
        ]

        recovery_candidates = []

        for detection_index in unmatched_detections:

            detection = detections[
                detection_index
            ]

            detection_center = self._get_center(
                detection["bbox"]
            )

            for track_id, track in lost_tracks:

                distance = self._center_distance(
                    detection_center,
                    track["center"]
                )

                _, _, box_width, box_height = (
                    self._xyxy_to_xywh(
                        detection["bbox"]
                    )
                )

                recovery_distance = max(
                    self.max_distance * 1.5,
                    max(
                        box_width,
                        box_height
                    ) * 2.5
                )

                if distance > recovery_distance:
                    continue

                iou = self._calculate_iou(
                    detection["bbox"],
                    track["bbox"]
                )

                distance_score = max(
                    0.0,
                    1.0
                    -
                    (
                        distance
                        /
                        recovery_distance
                    )
                )

                score = (
                    0.70 * distance_score
                    +
                    0.30 * iou
                )

                recovery_candidates.append(
                    (
                        score,
                        detection_index,
                        track_id
                    )
                )

        recovery_candidates.sort(
            key=lambda x: x[0],
            reverse=True
        )

        for (
            score,
            detection_index,
            track_id
        ) in recovery_candidates:

            if detection_index in matched_detection_indices:
                continue

            if track_id in matched_track_ids:
                continue

            if track_id not in self.tracks:
                continue

            detection = detections[
                detection_index
            ]

            track = self.tracks[
                track_id
            ]

            self._update_track(
                track,
                detection,
                frame_number
            )

            matched_track_ids.add(
                track_id
            )

            matched_detection_indices.add(
                detection_index
            )

        # =====================================================
        # CREATE NEW TRACKS
        # =====================================================

        for detection_index, detection in enumerate(
            detections
        ):

            if detection_index in matched_detection_indices:
                continue

            track_id = self.next_track_id

            self.next_track_id += 1

            bbox = detection["bbox"]

            center = self._get_center(
                bbox
            )

            track = {
                "track_id": track_id,

                "bbox": bbox,

                "confidence": detection.get(
                    "confidence",
                    1.0
                ),

                "center": center,

                "velocity": (
                    0.0,
                    0.0
                ),

                "age": 1,

                "hits": 1,

                "frames_since_detection": 0,

                "frame_number": frame_number,

                "active": True
            }

            self.tracks[
                track_id
            ] = track

            matched_track_ids.add(
                track_id
            )

            matched_detection_indices.add(
                detection_index
            )

        # =====================================================
        # HANDLE UNMATCHED TRACKS
        # =====================================================

        for track_id in list(
            self.tracks.keys()
        ):

            if track_id in matched_track_ids:
                continue

            track = self.tracks[
                track_id
            ]

            track["active"] = False

            track["frames_since_detection"] += 1

            if (
                track["frames_since_detection"]
                > self.max_age
            ):
                del self.tracks[
                    track_id
                ]

        # =====================================================
        # RETURN ACTIVE TRACKS
        # =====================================================

        active_tracks = []

        for track_id in matched_track_ids:

            if track_id not in self.tracks:
                continue

            track = self.tracks[
                track_id
            ]

            if (
                track["active"]
                and
                track["hits"] >= self.min_hits
            ):
                active_tracks.append(
                    track.copy()
                )

        return active_tracks

    # =========================================================
    # UPDATE TRACK
    # =========================================================

    def _update_track(
        self,
        track: dict,
        detection: dict,
        frame_number: int
    ):

        old_center = track["center"]

        new_center = self._get_center(
            detection["bbox"]
        )

        movement_x = (
            new_center[0]
            -
            old_center[0]
        )

        movement_y = (
            new_center[1]
            -
            old_center[1]
        )

        old_vx, old_vy = track["velocity"]

        # Smooth velocity
        velocity = (
            old_vx * 0.3
            +
            movement_x * 0.7,

            old_vy * 0.3
            +
            movement_y * 0.7
        )

        track["bbox"] = detection["bbox"]

        track["confidence"] = detection.get(
            "confidence",
            1.0
        )

        track["center"] = new_center

        track["velocity"] = velocity

        track["frame_number"] = frame_number

        track["frames_since_detection"] = 0

        track["hits"] += 1

        track["age"] += 1

        track["active"] = True

    # =========================================================
    # CENTER
    # =========================================================

    def _get_center(
        self,
        bbox: List[float]
    ) -> Tuple[float, float]:

        x1, y1, x2, y2 = bbox

        return (
            (x1 + x2) / 2,
            (y1 + y2) / 2
        )

    # =========================================================
    # CENTER DISTANCE
    # =========================================================

    def _center_distance(
        self,
        center1: Tuple[float, float],
        center2: Tuple[float, float]
    ) -> float:

        return math.sqrt(
            (center1[0] - center2[0]) ** 2
            +
            (center1[1] - center2[1]) ** 2
        )

    # =========================================================
    # IOU
    # =========================================================

    def _calculate_iou(
        self,
        box1: List[float],
        box2: List[float]
    ) -> float:

        x1 = max(
            box1[0],
            box2[0]
        )

        y1 = max(
            box1[1],
            box2[1]
        )

        x2 = min(
            box1[2],
            box2[2]
        )

        y2 = min(
            box1[3],
            box2[3]
        )

        intersection_width = max(
            0.0,
            x2 - x1
        )

        intersection_height = max(
            0.0,
            y2 - y1
        )

        intersection = (
            intersection_width
            *
            intersection_height
        )

        area1 = (
            max(
                0.0,
                box1[2] - box1[0]
            )
            *
            max(
                0.0,
                box1[3] - box1[1]
            )
        )

        area2 = (
            max(
                0.0,
                box2[2] - box2[0]
            )
            *
            max(
                0.0,
                box2[3] - box2[1]
            )
        )

        union = (
            area1
            +
            area2
            -
            intersection
        )

        if union <= 0:
            return 0.0

        return intersection / union

    # =========================================================
    # BBOX CONVERSION
    # =========================================================

    def _xyxy_to_xywh(
        self,
        bbox: List[float]
    ) -> Tuple[float, float, float, float]:

        x1, y1, x2, y2 = bbox

        return (
            x1,
            y1,
            x2 - x1,
            y2 - y1
        )

    # =========================================================
    # RESET
    # =========================================================

    def reset(self):

        self.tracks.clear()

        self.next_track_id = 1

    # =========================================================
    # ACTIVE TRACK COUNT
    # =========================================================

    def get_track_count(self) -> int:

        return sum(
            1
            for track in self.tracks.values()
            if track["active"]
        )