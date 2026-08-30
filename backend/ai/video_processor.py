"""
Video Processing Pipeline
Orchestrates frame extraction, detection, tracking, and analysis
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, AsyncGenerator
import asyncio
import logging
from pathlib import Path
import aiofiles

from ai.detection import PersonDetector
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics
from ai.risk_engine import RiskEngine
from config import settings

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Main video processing pipeline
    """
    
    def __init__(self):
        """Initialize all processing components"""
        self.detector = PersonDetector()
        self.tracker = SimpleTracker()
        self.analytics = None
        self.risk_engine = RiskEngine()

        # Stores confirmed person IDs seen throughout the video
        self.unique_track_ids = set()
    
    async def process_video(
        self,
        video_path: str,
        analysis_id: int,
        progress_callback: Optional[callable] = None,
        detection_interval: int = 5
    ) -> AsyncGenerator[Dict, None]:
        """
        Process video frame by frame and yield results
        
        Args:
            video_path: Path to video file
            analysis_id: Database ID for this analysis
            progress_callback: Optional callback for progress updates
            detection_interval: Run YOLO every Nth frame
            
        Yields:
            Dict with frame results and metrics
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            logger.error(f"Could not open video: {video_path}")
            raise ValueError(f"Could not open video: {video_path}")
        
        try:
            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            logger.info(f"Video: {frame_count} frames, {fps} FPS, {width}x{height}")
            
            # Initialize analytics with video dimensions
            self.analytics = CrowdAnalytics(width, height)
            
            # Reset tracker
            self.tracker.reset()
            self.unique_track_ids.clear()
            
            # Process every frame by default.
            # detection_interval=5 means YOLO runs every 5th frame.
            # Frames between detections are handled by the tracker.
                        
            frame_number = 0
            processed_count = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                
                if not ret:
                    break
                               
                # Process frame
                result = await self._process_frame(
                    frame,
                    frame_number,
                    fps,
                    width,
                    height,
                    detection_interval
                )
                
                processed_count += 1
                
                # Report progress
                if progress_callback:
                    progress = (frame_number / frame_count) * 100
                    await progress_callback(analysis_id, progress)
                
                yield result
                
                frame_number += 1
            
            total_track_ids = len(self.unique_track_ids)
            logger.info(
                f"Processing complete: {processed_count} frames processed."
            )
            logger.info(
                f"VIDEO ANALYSIS REPORT -> Total Track IDs Created: {total_track_ids}"
            )
            
        finally:
            cap.release()
    
    async def _process_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        fps: float,
        width: int,
        height: int,
        detection_interval: int = 5
    ) -> Dict:
        """
        Process a single frame through the pipeline
        
        Args:
            frame: Input frame
            frame_number: Frame number
            fps: Video FPS
            width: Frame width
            height: Frame height
            
        Returns:
            Dict with all processing results
        """
        timestamp = frame_number / fps
        
        # Step 1: Detection
        run_detection = (
            frame_number % detection_interval == 0
        )

        if run_detection:
            detections = self.detector.detect_frame(
                frame,
                frame_number
            )
        else:
            detections = []

        # Step 2: Tracking
        tracks = self.tracker.update(
            detections,
            frame_number,
            detections_available=run_detection
        ) 

        # Step 3: Counting
        people_count = len(tracks)

        # Step 4: Record unique people
        for track in tracks:
            self.unique_track_ids.add(track["track_id"])

        # Step 5: Density
        density = self.analytics.calculate_density(tracks)

        # Step 6: Flow metrics
        flow_metrics = self.analytics.calculate_flow_metrics(tracks)

        # Step 7: Bottleneck detection
        is_bottleneck, bottleneck_reason = self.analytics.detect_bottleneck(
            density, flow_metrics
        )

        # Step 8: Risk calculation
        risk_result = self.risk_engine.calculate_risk(
            density,
            flow_metrics,
            is_bottleneck,
            people_count=people_count
        )
        
        return {
            "frame_number": frame_number,
            "timestamp": timestamp,
            "detections": detections,
            "tracks": tracks,
            "people_count": people_count,
            "density": density,
            "flow_metrics": flow_metrics,
            "is_bottleneck": is_bottleneck,
            "bottleneck_reason": bottleneck_reason,
            "risk_result": risk_result
        }
    
    def get_video_info(self, video_path: str) -> Dict:
        """
        Get video file information without processing
        
        Args:
            video_path: Path to video file
            
        Returns:
            Dict with video metadata
        """
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")
        
        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            duration = frame_count / fps if fps > 0 else 0
            
            return {
                "fps": fps,
                "frame_count": frame_count,
                "width": width,
                "height": height,
                "duration": duration
            }
        finally:
            cap.release()
