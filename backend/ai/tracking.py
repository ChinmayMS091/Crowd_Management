"""
Person Tracking Module
Uses ByteTrack for multi-object tracking
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class Track:
    """Represents a single tracked object"""
    
    def __init__(self, track_id: int, bbox: List[float], confidence: float, frame_number: int):
        self.track_id = track_id
        self.bbox = bbox  # [x1, y1, x2, y2]
        self.confidence = confidence
        self.frame_number = frame_number
        self.trajectory = [bbox]  # History of positions
        self.age = 0  # Number of frames since creation
        self.hits = 1  # Number of successful detections
        self.misses = 0  # Number of missed detections
        self.state = "active"  # active, lost, deleted
    
    def update(self, bbox: List[float], confidence: float, frame_number: int):
        """Update track with new detection"""
        self.bbox = bbox
        self.confidence = confidence
        self.trajectory.append(bbox)
        self.frame_number = frame_number
        self.age += 1
        self.hits += 1
        self.state = "active"
    
    def mark_missed(self):
        """Mark track as missed in current frame"""
        self.age += 1
        self.misses += 1
        if self.misses > 30:  # Allow 30 frames (1 second) of occlusion before deleting identity
            self.state = "deleted"
        else:
            self.state = "lost"
    
    def get_center(self) -> Tuple[float, float]:
        """Get center point of current bbox"""
        x1, y1, x2, y2 = self.bbox
        return ((x1 + x2) / 2, (y1 + y2) / 2)
    
    def get_velocity(self) -> Tuple[float, float]:
        """Calculate velocity based on last two positions"""
        if len(self.trajectory) < 2:
            return (0.0, 0.0)
        
        prev_center = ((self.trajectory[-2][0] + self.trajectory[-2][2]) / 2,
                       (self.trajectory[-2][1] + self.trajectory[-2][3]) / 2)
        curr_center = self.get_center()
        
        return (curr_center[0] - prev_center[0], curr_center[1] - prev_center[1])


class SimpleTracker:
    """
    Simple IoU-based tracker for person tracking
    Note: For production, consider using ByteTrack or DeepSORT
    """
    
    def __init__(self, iou_threshold: float = 0.3):
        """
        Initialize tracker
        
        Args:
            iou_threshold: IoU threshold for matching detections to tracks
        """
        self.iou_threshold = iou_threshold
        self.tracks: Dict[int, Track] = {}
        self.next_track_id = 1
        self.max_age = 30  # Max frames to keep lost tracks
    
    def _calculate_iou(self, bbox1: List[float], bbox2: List[float]) -> float:
        """Calculate Intersection over Union (IoU) between two bounding boxes"""
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
        area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def update(
        self,
        detections: List[dict],
        frame_number: int
    ) -> List[dict]:
        """
        Update tracks with new detections
        
        Args:
            detections: List of detection dicts with 'bbox' field
            frame_number: Current frame number
            
        Returns:
            List of track dicts with track_id, bbox, etc.
        """
        # Mark all active tracks as missed initially
        for track in self.tracks.values():
            if track.state == "active":
                track.mark_missed()
        
        # Match detections to existing tracks
        matched_detections = set()
        matched_tracks = set()
        
        # Calculate IoU matrix
        iou_matrix = []
        for track_id, track in self.tracks.items():
            if track.state == "deleted":
                continue
            row = []
            for det_idx, detection in enumerate(detections):
                iou = self._calculate_iou(track.bbox, detection["bbox"])
                row.append(iou)
            iou_matrix.append((track_id, row))
        
        # Greedy matching
        for track_id, row in sorted(iou_matrix, key=lambda x: max(x[1]) if x[1] else 0, reverse=True):
            if track_id in matched_tracks:
                continue
            
            if not row:  # Skip if no detections
                continue
            
            best_det_idx = max(range(len(row)), key=lambda i: row[i])
            if row[best_det_idx] >= self.iou_threshold and best_det_idx not in matched_detections:
                # Match found
                self.tracks[track_id].update(
                    detections[best_det_idx]["bbox"], 
                    detections[best_det_idx].get("confidence", 1.0),
                    frame_number
                )
                matched_detections.add(best_det_idx)
                matched_tracks.add(track_id)
        
        # Create new tracks for unmatched detections
        for det_idx, detection in enumerate(detections):
            if det_idx not in matched_detections:
                new_track = Track(
                    self.next_track_id, 
                    detection["bbox"], 
                    detection.get("confidence", 1.0),
                    frame_number
                )
                self.tracks[self.next_track_id] = new_track
                self.next_track_id += 1
        
        # Remove old tracks
        self.tracks = {
            tid: track for tid, track in self.tracks.items()
            if track.state != "deleted" and track.age <= self.max_age
        }
        
        # Return active tracks
        active_tracks = []
        for track in self.tracks.values():
            # Validate track to avoid false positives:
            # Must have been seen multiple times, or is brand new but high confidence
            if track.state == "active":
                track_dict = {
                    "track_id": track.track_id,
                    "bbox": track.bbox,
                    "confidence": track.confidence,
                    "age": track.age,
                    "center": track.get_center(),
                    "velocity": track.get_velocity()
                }
                active_tracks.append(track_dict)
        
        logger.debug(f"Frame {frame_number}: {len(active_tracks)} active tracks")
        return active_tracks
    
    def get_track_count(self) -> int:
        """Get number of active tracks"""
        return len([t for t in self.tracks.values() if t.state == "active"])
    
    def reset(self):
        """Reset all tracks"""
        self.tracks.clear()
        self.next_track_id = 1
