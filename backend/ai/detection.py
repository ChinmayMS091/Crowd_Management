"""
YOLO Person Detection Module
Uses Ultralytics YOLOv8 for real-time person detection
"""

import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Tuple, Optional
import logging
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PersonDetector:
    """
    YOLO-based person detector
    """
    
    PERSON_CLASS_ID = 0  # COCO dataset: 0 = person
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the YOLO model
        
        Args:
            model_path: Path to YOLO model file. If None, uses default from settings
        """
        self.model_path = model_path or settings.yolo_model_path
        self.confidence_threshold = settings.yolo_confidence_threshold
        self.iou_threshold = settings.yolo_iou_threshold
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the YOLO model"""
        try:
            logger.info(f"Loading YOLO model from {self.model_path}")
            self.model = YOLO(self.model_path)
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            # Fallback to downloading default model
            logger.info("Attempting to download default YOLOv8n model...")
            self.model = YOLO("yolov8n.pt")
            logger.info("Default YOLOv8n model loaded")
    
    def detect_frame(
        self,
        frame: np.ndarray,
        frame_number: int = 0
    ) -> List[dict]:
        """
        Detect persons in a single frame
        
        Args:
            frame: Input image as numpy array (BGR format from OpenCV)
            frame_number: Frame number for logging
            
        Returns:
            List of detection dictionaries, each containing:
            - class_id: int
            - class_name: str
            - confidence: float
            - bbox: List[float] [x1, y1, x2, y2]
        """
        if self.model is None:
            logger.error("Model not loaded")
            return []
        
        try:
            # Run inference
            results = self.model(
                frame,
                conf=self.confidence_threshold,
                iou=self.iou_threshold,
                verbose=False,
                classes=[self.PERSON_CLASS_ID]  # Only detect persons
            )
            
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        
                        detection = {
                            "class_id": int(box.cls[0].cpu().numpy()),
                            "class_name": self.model.names[int(box.cls[0].cpu().numpy())],
                            "confidence": float(box.conf[0].cpu().numpy()),
                            "bbox": [float(x1), float(y1), float(x2), float(y2)]
                        }
                        detections.append(detection)
            
            logger.debug(f"Frame {frame_number}: {len(detections)} persons detected")
            return detections
            
        except Exception as e:
            logger.error(f"Error during detection in frame {frame_number}: {e}")
            return []
    
    def detect_batch(
        self,
        frames: List[np.ndarray],
        start_frame: int = 0
    ) -> List[List[dict]]:
        """
        Detect persons in a batch of frames
        
        Args:
            frames: List of input frames
            start_frame: Starting frame number
            
        Returns:
            List of detection lists, one per frame
        """
        all_detections = []
        
        for i, frame in enumerate(frames):
            detections = self.detect_frame(frame, start_frame + i)
            all_detections.append(detections)
        
        return all_detections
    
    def get_model_info(self) -> dict:
        """Get information about the loaded model"""
        if self.model is None:
            return {"status": "not_loaded"}
        
        return {
            "status": "loaded",
            "model_path": self.model_path,
            "confidence_threshold": self.confidence_threshold,
            "iou_threshold": self.iou_threshold,
            "classes": self.model.names
        }
