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
        Detect persons in a frame.

        Uses full-frame detection for normal-resolution CCTV.
        Uses adaptive overlapping tiles for high-resolution CCTV
        to improve detection of small people in dense crowds.
        """

        if self.model is None:
            logger.error("Model not loaded")
            return []

        try:
            height, width = frame.shape[:2]

            # ---------------------------------------------------------
            # Decide whether tiling is needed
            # ---------------------------------------------------------

            use_tiling = width >= 1600 or height >= 900

            # ---------------------------------------------------------
            # NORMAL FULL-FRAME DETECTION
            # ---------------------------------------------------------

            if not use_tiling:

                results = self.model(
                    frame,
                    conf=self.confidence_threshold,
                    iou=self.iou_threshold,
                    imgsz=1280,
                    max_det=1000,
                    verbose=False,
                    classes=[self.PERSON_CLASS_ID]
                )

                detections = self._extract_detections(results)

                logger.info(
                    f"Frame {frame_number}: "
                    f"{len(detections)} persons detected"
                )

                return detections

            # ---------------------------------------------------------
            # ADAPTIVE TILED DETECTION
            # ---------------------------------------------------------

            target_tile_width = min(1280, width)
            target_tile_height = min(720, height)

            # 20% overlap between neighboring tiles
            overlap = 0.20

            step_x = max(
                1,
                int(target_tile_width * (1 - overlap))
            )

            step_y = max(
                1,
                int(target_tile_height * (1 - overlap))
            )

            # X positions
            x_positions = list(
                range(
                    0,
                    max(1, width - target_tile_width + 1),
                    step_x
                )
            )

            # Always include the right edge
            last_x = max(
                0,
                width - target_tile_width
            )

            if last_x not in x_positions:
                x_positions.append(last_x)

            # Y positions
            y_positions = list(
                range(
                    0,
                    max(1, height - target_tile_height + 1),
                    step_y
                )
            )

            # Always include the bottom edge
            last_y = max(
                0,
                height - target_tile_height
            )

            if last_y not in y_positions:
                y_positions.append(last_y)

            all_detections = []

            # ---------------------------------------------------------
            # Process every tile
            # ---------------------------------------------------------

            for y1 in y_positions:

                for x1 in x_positions:

                    x2 = min(
                        x1 + target_tile_width,
                        width
                    )

                    y2 = min(
                        y1 + target_tile_height,
                        height
                    )

                    tile = frame[y1:y2, x1:x2]

                    if tile.size == 0:
                        continue

                    results = self.model(
                        tile,
                        conf=self.confidence_threshold,
                        iou=self.iou_threshold,
                        imgsz=1280,
                        max_det=1000,
                        verbose=False,
                        classes=[self.PERSON_CLASS_ID]
                    )

                    tile_detections = self._extract_detections(
                        results
                    )

                    # Convert tile coordinates to
                    # full-frame coordinates.
                    for detection in tile_detections:

                        bx1, by1, bx2, by2 = (
                            detection["bbox"]
                        )

                        detection["bbox"] = [
                            bx1 + x1,
                            by1 + y1,
                            bx2 + x1,
                            by2 + y1
                        ]

                        all_detections.append(detection)

            # ---------------------------------------------------------
            # Remove duplicates caused by tile overlap
            # ---------------------------------------------------------

            detections = self._remove_duplicate_detections(
                all_detections,
                iou_threshold=0.45
            )

            logger.info(
                f"Frame {frame_number}: "
                f"{len(detections)} persons detected "
                f"(adaptive tiled detection)"
            )

            return detections

        except Exception as e:

            logger.error(
                f"Error during detection in frame "
                f"{frame_number}: {e}"
            )

            return []
    def _extract_detections(
        self,
        results
    ) -> List[dict]:
        """
        Convert YOLO results into the project's
        standard detection format.
        """

        detections = []

        for result in results:

            boxes = result.boxes

            if boxes is None:
                continue

            for box in boxes:

                x1, y1, x2, y2 = (
                    box.xyxy[0].cpu().numpy()
                )

                class_id = int(
                    box.cls[0].cpu().numpy()
                )

                confidence = float(
                    box.conf[0].cpu().numpy()
                )

                detections.append({
                    "class_id": class_id,
                    "class_name": self.model.names[class_id],
                    "confidence": confidence,
                    "bbox": [
                        float(x1),
                        float(y1),
                        float(x2),
                        float(y2)
                    ]
                })

        return detections


    def _remove_duplicate_detections(
        self,
        detections: List[dict],
        iou_threshold: float = 0.45
    ) -> List[dict]:
        """
        Remove duplicate detections produced by
        overlapping tiles.
        """

        if not detections:
            return []

        # Highest confidence first
        detections = sorted(
            detections,
            key=lambda d: d["confidence"],
            reverse=True
        )

        kept = []

        for detection in detections:

            duplicate = False

            for existing in kept:

                iou = self._calculate_iou(
                    detection["bbox"],
                    existing["bbox"]
                )

                if iou >= iou_threshold:
                    duplicate = True
                    break

            if not duplicate:
                kept.append(detection)

        return kept


    def _calculate_iou(
        self,
        box1: List[float],
        box2: List[float]
    ) -> float:
        """
        Calculate Intersection over Union.
        """

        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])

        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        intersection_width = max(
            0.0,
            x2 - x1
        )

        intersection_height = max(
            0.0,
            y2 - y1
        )

        intersection = (
            intersection_width *
            intersection_height
        )

        area1 = (
            max(0.0, box1[2] - box1[0]) *
            max(0.0, box1[3] - box1[1])
        )

        area2 = (
            max(0.0, box2[2] - box2[0]) *
            max(0.0, box2[3] - box2[1])
        )

        union = area1 + area2 - intersection

        if union <= 0:
            return 0.0

        return intersection / union
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
