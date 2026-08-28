"""
Person Tracking Module
Lightweight tracker for CCTV crowd monitoring.

YOLO runs periodically.
Between YOLO detections, existing tracks are predicted using velocity.
"""

from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class SimpleTracker:
    """
    Lightweight multi-person tracker.

    Features:
    - Persistent person IDs
    - YOLO detection every N frames
    - Prediction between YOLO frames
    - Confirmation before a track becomes active
    - Removes stale tracks
    - Helps prevent ghost tracks
    """

    def __init__(
        self,
        iou_threshold: float = 0.25,
        max_age: int = 5,
        min_hits: int = 2
    ):
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.min_hits = min_hits

        # Active tracks
        self.tracks: Dict[int, dict] = {}

        # Next unique ID
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

        # -----------------------------------------------------
        # Frames where YOLO is NOT executed
        # -----------------------------------------------------

        if not detections_available:

            active_tracks = []

            for track_id in list(self.tracks.keys()):

                track = self.tracks[track_id]

                track["frames_since_detection"] += 1

                # Delete stale tracks
                if (
                    track["frames_since_detection"]
                    > self.max_age
                ):
                    del self.tracks[track_id]
                    continue

                # Predict next position
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

                # Only return confirmed tracks
                if track["hits"] >= self.min_hits:
                    active_tracks.append(track.copy())

            return active_tracks

        # -----------------------------------------------------
        # YOLO detection frame
        # -----------------------------------------------------

        matched_track_ids = set()
        active_tracks = []

        # -----------------------------------------------------
        # Match detections to existing tracks
        # -----------------------------------------------------

        for detection in detections:

            bbox = detection["bbox"]

            confidence = detection.get(
                "confidence",
                1.0
            )

            best_track_id = None
            best_iou = 0.0

            for track_id, track in self.tracks.items():

                if track_id in matched_track_ids:
                    continue

                iou = self._calculate_iou(
                    bbox,
                    track["bbox"]
                )

                if (
                    iou >= self.iou_threshold
                    and iou > best_iou
                ):
                    best_iou = iou
                    best_track_id = track_id

            # -------------------------------------------------
            # Existing track matched
            # -------------------------------------------------

            if best_track_id is not None:

                track = self.tracks[best_track_id]

                old_center = track["center"]

                new_center = self._get_center(
                    bbox
                )

                # Calculate velocity
                velocity = (
                    new_center[0] - old_center[0],
                    new_center[1] - old_center[1]
                )

                track["bbox"] = bbox
                track["confidence"] = confidence
                track["center"] = new_center
                track["velocity"] = velocity

                track["frame_number"] = frame_number

                track["frames_since_detection"] = 0

                track["hits"] += 1

                track["age"] += 1

                matched_track_ids.add(
                    best_track_id
                )

                # Only confirmed tracks are returned
                if track["hits"] >= self.min_hits:
                    active_tracks.append(
                        track.copy()
                    )

            # -------------------------------------------------
            # New track
            # -------------------------------------------------

            else:

                track_id = self.next_track_id

                self.next_track_id += 1

                center = self._get_center(
                    bbox
                )

                track = {
                    "track_id": track_id,

                    "bbox": bbox,

                    "confidence": confidence,

                    "center": center,

                    "velocity": (
                        0.0,
                        0.0
                    ),

                    "age": 1,

                    "hits": 1,

                    "frames_since_detection": 0,

                    "frame_number": frame_number
                }

                self.tracks[track_id] = track

                matched_track_ids.add(
                    track_id
                )

                # Do NOT immediately count a
                # brand-new detection as a
                # confirmed person.
                #
                # It must be detected again.
                if self.min_hits <= 1:
                    active_tracks.append(
                        track.copy()
                    )

        # -----------------------------------------------------
        # Handle unmatched existing tracks
        # -----------------------------------------------------

        for track_id in list(self.tracks.keys()):

            if track_id in matched_track_ids:
                continue

            track = self.tracks[track_id]

            track["frames_since_detection"] += 1

            # Delete stale track
            if (
                track["frames_since_detection"]
                > self.max_age
            ):
                del self.tracks[track_id]

        return active_tracks

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
            * intersection_height
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
            + area2
            - intersection
        )

        if union <= 0:
            return 0.0

        return intersection / union

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

        return len(self.tracks)