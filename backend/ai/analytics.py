"""
Crowd Analytics Module
Calculates density, flow, and other crowd metrics
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
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
        Calculate crowd density (people per unit area)
        
        Args:
            tracks: List of track dicts with bbox
            zone_polygon: Optional polygon defining zone of interest
            
        Returns:
            Density score (0-1 normalized)
        """
        if not tracks:
            return 0.0
        
        # Filter tracks by zone if provided
        if zone_polygon:
            tracks_in_zone = self._filter_tracks_by_zone(tracks, zone_polygon)
        else:
            tracks_in_zone = tracks
        
        if not tracks_in_zone:
            return 0.0
        
        # Calculate total area occupied by people
        total_person_area = 0.0
        for track in tracks_in_zone:
            x1, y1, x2, y2 = track["bbox"]
            area = (x2 - x1) * (y2 - y1)
            total_person_area += area
        
        # Calculate available area
        if zone_polygon:
            zone_area = self._calculate_polygon_area(zone_polygon)
        else:
            zone_area = self.frame_area
        
        if zone_area == 0:
            return 0.0
        
        # Density as ratio of occupied area to total area
        density = total_person_area / zone_area
        
        # Normalize to 0-1 range (assuming max reasonable density is 0.5)
        normalized_density = min(density / 0.5, 1.0)
        
        return normalized_density
    
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
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def _calculate_polygon_area(self, polygon: List[List[float]]) -> float:
        """Calculate area of polygon using shoelace formula"""
        n = len(polygon)
        area = 0.0
        for i in range(n):
            j = (i + 1) % n
            area += polygon[i][0] * polygon[j][1]
            area -= polygon[j][0] * polygon[i][1]
        return abs(area) / 2.0
    
    def calculate_flow_metrics(
        self,
        tracks: List[dict],
        window_size: int = 10
    ) -> Dict[str, float]:
        """
        Calculate crowd flow metrics
        
        Args:
            tracks: List of track dicts with velocity
            window_size: Number of frames to average over
            
        Returns:
            Dict with flow_rate, avg_velocity, flow_consistency
        """
        if not tracks:
            return {
                "flow_rate": 0.0,
                "avg_velocity": 0.0,
                "flow_consistency": 0.0
            }
        
        velocities = [track["velocity"] for track in tracks if track["velocity"] != (0, 0)]
        
        if not velocities:
            return {
                "flow_rate": 0.0,
                "avg_velocity": 0.0,
                "flow_consistency": 0.0
            }
        
        # Calculate average velocity magnitude
        avg_velocity_x = np.mean([v[0] for v in velocities])
        avg_velocity_y = np.mean([v[1] for v in velocities])
        avg_velocity = np.sqrt(avg_velocity_x**2 + avg_velocity_y**2)
        
        # Flow rate = number of moving people per unit time
        moving_count = len(velocities)
        flow_rate = moving_count / len(tracks) if tracks else 0.0
        
        # Flow consistency = how aligned the movement directions are
        if len(velocities) > 1:
            # Calculate variance in direction
            angles = [np.arctan2(v[1], v[0]) for v in velocities]
            angle_std = np.std(angles)
            # Convert to consistency score (0-1, higher is more consistent)
            flow_consistency = max(0, 1 - angle_std / np.pi)
        else:
            flow_consistency = 1.0
        
        return {
            "flow_rate": flow_rate,
            "avg_velocity": avg_velocity,
            "flow_consistency": flow_consistency
        }
    
    def detect_bottleneck(
        self,
        density: float,
        flow_metrics: Dict[str, float],
        density_threshold: float = 0.6,
        velocity_threshold: float = 5.0
    ) -> Tuple[bool, str]:
        """
        Detect potential bottleneck conditions
        
        Args:
            density: Current density score
            flow_metrics: Flow metrics from calculate_flow_metrics
            density_threshold: Density threshold for bottleneck
            velocity_threshold: Velocity threshold (pixels/frame) for bottleneck
            
        Returns:
            Tuple of (is_bottleneck, reason)
        """
        # Handle no-data case: if no people detected, cannot be a bottleneck
        if density == 0.0 and flow_metrics["flow_rate"] == 0.0:
            return (False, "No people detected")
        
        reasons = []
        
        if density > density_threshold:
            reasons.append(f"High density ({density:.2f})")
        
        if flow_metrics["avg_velocity"] < velocity_threshold:
            reasons.append(f"Low velocity ({flow_metrics['avg_velocity']:.2f})")
        
        if flow_metrics["flow_consistency"] < 0.3:
            reasons.append(f"Low flow consistency ({flow_metrics['flow_consistency']:.2f})")
        
        is_bottleneck = len(reasons) >= 2
        reason = "; ".join(reasons) if reasons else "Normal conditions"
        
        return (is_bottleneck, reason)
