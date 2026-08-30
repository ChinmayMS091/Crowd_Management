"""
Crowd Analytics Module
Calculates density, flow, and other crowd metrics
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)


class CrowdAnalytics:
    """
    Calculate crowd metrics from tracking data
    """

    def __init__(self, frame_width: int, frame_height: int):
        """
        Initialize analytics

        Args:
            frame_width: Video frame width in pixels
            frame_height: Video frame height in pixels
        """
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.frame_area = frame_width * frame_height

    def calculate_density(
        self,
        tracks: List[dict],
        zone_polygon: Optional[List[List[float]]] = None
    ) -> float:
        """
        Calculate normalized crowd density based on people count.

        Density is calculated using the number of tracked people
        relative to the configured maximum crowd capacity.

        Returns:
            Density score from 0.0 to 1.0
        """

        if not tracks:
            return 0.0

        # Filter tracks by zone if provided
        if zone_polygon:
            tracks_in_zone = self._filter_tracks_by_zone(
                tracks,
                zone_polygon
            )
        else:
            tracks_in_zone = tracks

        if not tracks_in_zone:
            return 0.0

        # ---------------------------------------------------------
        # Camera-specific crowd capacity
        # ---------------------------------------------------------

        MAX_CROWD_CAPACITY = 250

        people_count = len(tracks_in_zone)

        density = people_count / MAX_CROWD_CAPACITY

        # Never allow density to exceed 1.0
        density = min(density, 1.0)

        return density

    def _filter_tracks_by_zone(
        self,
        tracks: List[dict],
        polygon: List[List[float]]
    ) -> List[dict]:
        """Filter tracks that are within a polygon zone"""

        filtered = []

        for track in tracks:

            center = track["center"]

            if self._point_in_polygon(center, polygon):
                filtered.append(track)

        return filtered

    def _point_in_polygon(
        self,
        point: Tuple[float, float],
        polygon: List[List[float]]
    ) -> bool:
        """Check if a point is inside a polygon using ray casting"""

        x, y = point
        n = len(polygon)
        inside = False

        p1x, p1y = polygon[0]

        for i in range(n + 1):

            p2x, p2y = polygon[i % n]

            if y > min(p1y, p2y):

                if y <= max(p1y, p2y):

                    if x <= max(p1x, p2x):

                        if p1y != p2y:

                            xinters = (
                                (y - p1y)
                                * (p2x - p1x)
                                / (p2y - p1y)
                                + p1x
                            )

                        if p1x == p2x or x <= xinters:
                            inside = not inside

            p1x, p1y = p2x, p2y

        return inside

    def _calculate_polygon_area(
        self,
        polygon: List[List[float]]
    ) -> float:
        """Calculate area of polygon using shoelace formula"""

        n = len(polygon)
        area = 0.0

        for i in range(n):

            j = (i + 1) % n

            area += (
                polygon[i][0] * polygon[j][1]
            )

            area -= (
                polygon[j][0] * polygon[i][1]
            )

        return abs(area) / 2.0

    def calculate_flow_metrics(
        self,
        tracks: List[dict],
        window_size: int = 10
    ) -> Dict[str, Any]:
        """
        Calculate crowd flow metrics.

        Important distinction:

        movement_data_available = False
            Means the tracker has not yet measured movement.

        movement_data_available = True
            Means at least one track has a valid movement history.
            A velocity of (0, 0) at this point can therefore represent
            an actually stationary person.

        Returns:
            Dict containing:
                flow_rate
                avg_velocity
                flow_consistency
                movement_data_available
        """

        # ---------------------------------------------------------
        # No tracks
        # ---------------------------------------------------------

        if not tracks:

            return {
                "flow_rate": 0.0,
                "avg_velocity": 0.0,
                "flow_consistency": 0.0,
                "movement_data_available": False
            }

        # ---------------------------------------------------------
        # Separate tracks with and without movement history
        # ---------------------------------------------------------

        initialized_tracks = [
            track
            for track in tracks
            if track.get(
                "movement_initialized",
                False
            )
        ]

        # ---------------------------------------------------------
        # Movement data is not available yet
        # ---------------------------------------------------------

        if not initialized_tracks:

            return {
                "flow_rate": 0.0,
                "avg_velocity": 0.0,
                "flow_consistency": 0.0,
                "movement_data_available": False
            }

        # ---------------------------------------------------------
        # Movement data is available
        # ---------------------------------------------------------

        velocities = [
            track.get(
                "velocity",
                (0.0, 0.0)
            )
            for track in initialized_tracks
        ]

        # ---------------------------------------------------------
        # Average velocity
        # ---------------------------------------------------------
        #
        # IMPORTANT:
        # Include zero velocities here.
        #
        # Once movement is initialized, (0, 0) means the person
        # can actually be stationary.
        # ---------------------------------------------------------

        avg_velocity_x = np.mean(
            [velocity[0] for velocity in velocities]
        )

        avg_velocity_y = np.mean(
            [velocity[1] for velocity in velocities]
        )

        avg_velocity = np.sqrt(
            avg_velocity_x ** 2
            +
            avg_velocity_y ** 2
        )

        # ---------------------------------------------------------
        # Moving people
        # ---------------------------------------------------------

        moving_velocities = [
            velocity
            for velocity in velocities
            if not (
                velocity[0] == 0
                and velocity[1] == 0
            )
        ]

        moving_count = len(moving_velocities)

        # Flow rate = proportion of people who are moving
        flow_rate = (
            moving_count / len(initialized_tracks)
        )

        # ---------------------------------------------------------
        # Flow consistency
        # ---------------------------------------------------------
        #
        # Direction consistency is calculated only from people
        # who are actually moving.
        #
        # If everyone is stationary, movement has been measured
        # and there is no directional disagreement.
        # ---------------------------------------------------------

        if len(moving_velocities) > 1:

            angles = [
                np.arctan2(
                    velocity[1],
                    velocity[0]
                )
                for velocity in moving_velocities
            ]

            angle_std = np.std(angles)

            flow_consistency = max(
                0.0,
                1.0 - angle_std / np.pi
            )

        elif len(moving_velocities) == 1:

            flow_consistency = 1.0

        else:

            # Movement has been measured but everyone is stationary.
            flow_consistency = 1.0

        return {
            "flow_rate": float(flow_rate),
            "avg_velocity": float(avg_velocity),
            "flow_consistency": float(flow_consistency),
            "movement_data_available": True
        }

    def detect_bottleneck(
        self,
        density: float,
        flow_metrics: Dict[str, Any],
        density_threshold: float = 0.6,
        velocity_threshold: float = 5.0
    ) -> Tuple[bool, str]:
        """
        Detect potential bottleneck conditions.

        Movement-related conditions are evaluated only when actual
        movement information is available.

        Returns:
            Tuple of (is_bottleneck, reason)
        """

        # ---------------------------------------------------------
        # No people
        # ---------------------------------------------------------

        if density == 0.0:

            return (
                False,
                "No people detected"
            )

        # ---------------------------------------------------------
        # Movement data unavailable
        # ---------------------------------------------------------

        if not flow_metrics.get(
            "movement_data_available",
            False
        ):

            if density > density_threshold:

                return (
                    False,
                    f"High density ({density:.2f}); "
                    "movement data not yet available"
                )

            return (
                False,
                "Movement data not yet available"
            )

        # ---------------------------------------------------------
        # Movement data is available
        # ---------------------------------------------------------

        reasons = []

        # High density
        if density > density_threshold:

            reasons.append(
                f"High density ({density:.2f})"
            )

        # Low velocity
        if flow_metrics["avg_velocity"] < velocity_threshold:

            reasons.append(
                f"Low velocity "
                f"({flow_metrics['avg_velocity']:.2f})"
            )

        # Low flow consistency
        if flow_metrics["flow_consistency"] < 0.3:

            reasons.append(
                f"Low flow consistency "
                f"({flow_metrics['flow_consistency']:.2f})"
            )

        # A bottleneck requires at least two independent
        # warning conditions.
        is_bottleneck = len(reasons) >= 2

        reason = (
            "; ".join(reasons)
            if reasons
            else "Normal conditions"
        )

        return (
            is_bottleneck,
            reason
        )