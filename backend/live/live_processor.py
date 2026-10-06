"""
Live CCTV Processing Pipeline

Handles real-time webcam / RTSP camera streams.

This is separate from video_processor.py but reuses
the existing detection, tracking, analytics and risk components.
"""

import cv2
import numpy as np
import asyncio
import logging
import time
import psycopg2

from typing import AsyncGenerator, Dict, Optional, Union

from config import settings

from ai.detection import PersonDetector
from ai.tracking import SimpleTracker
from ai.analytics import CrowdAnalytics
from ai.risk_engine import RiskEngine


logger = logging.getLogger(__name__)


class LiveProcessor:
    """
    Real-time CCTV / RTSP processing pipeline.

    Pipeline:

        Camera / RTSP
              ↓
        OpenCV Capture
              ↓
        YOLO Detection
              ↓
        Person Tracking
              ↓
        Crowd Analytics
              ↓
        Risk Engine
    """

    def __init__(self, detector: PersonDetector):
        """Initialize live processing components."""

        # ---------------------------------------------------------
        # AI Components
        # ---------------------------------------------------------

        # Shared YOLO detector supplied by the application
        self.detector = detector

        self.history_save_interval = 60.0
        self.last_history_save_time = 0.0

        self.tracker = SimpleTracker()
        self.analytics: Optional[CrowdAnalytics] = None
        self.risk_engine = RiskEngine()

        # ---------------------------------------------------------
        # Track IDs seen during this live session
        # ---------------------------------------------------------

        self.unique_track_ids = set()

        # ---------------------------------------------------------
        # Stream state
        # ---------------------------------------------------------

        self.running = False
        self.connected = False

        # ---------------------------------------------------------
        # Current camera information
        # ---------------------------------------------------------

        self.camera_id = None
        self.frame_number = 0

        # Live performance measurements
        self.processing_fps = 0.0
        self.frame_latency_ms = 0.0
        self.fps_start_time = None
        self.fps_frame_count = 0

        # Live stage timing measurements
        self.detection_time_ms = 0.0
        self.tracking_time_ms = 0.0
        self.analytics_time_ms = 0.0
        self.risk_time_ms = 0.0

        # ---------------------------------------------------------
        # Latest processed result
        # Used by API / WebSocket
        # ---------------------------------------------------------

        self.latest_result: Optional[Dict] = None

        # ---------------------------------------------------------
        # Latest camera frame
        # Used by MJPEG live video stream
        # ---------------------------------------------------------

        self.latest_frame: Optional[np.ndarray] = None

    async def process_stream(
        self,
        source: str,
        camera_id: str,
        sensor_id: int,
        detection_interval: int = 5
    ) -> AsyncGenerator[Dict, None]:
        """
        Process a live webcam / RTSP stream.
        """

        # ---------------------------------------------------------
        # Reset live session state
        # ---------------------------------------------------------

        self.camera_id = camera_id
        self.frame_number = 0
        self.unique_track_ids.clear()
        self.latest_result = None
        self.latest_frame = None

        # Reset history timer
        self.last_history_save_time = 0.0

        # Reset performance measurements
        self.processing_fps = 0.0
        self.frame_latency_ms = 0.0
        self.fps_start_time = time.perf_counter()
        self.fps_frame_count = 0

        # Reset stage timing measurements
        self.detection_time_ms = 0.0
        self.tracking_time_ms = 0.0
        self.analytics_time_ms = 0.0
        self.risk_time_ms = 0.0

        # ---------------------------------------------------------
        # Open camera / RTSP stream
        # ---------------------------------------------------------

        logger.info(
            f"Opening live stream for camera {camera_id}: {source}"
        )

        # Convert webcam source "0" → 0
        if isinstance(source, str) and source.isdigit():
            source = int(source)

        logger.info(
            f"Using OpenCV source: {source} "
            f"(type={type(source).__name__})"
        )

        cap = cv2.VideoCapture(source)

        # ---------------------------------------------------------
        # Check connection
        # ---------------------------------------------------------

        if not cap.isOpened():

            self.connected = False
            self.running = False

            logger.error(
                f"Could not open live stream: {source}"
            )

            raise ValueError(
                f"Could not open live stream: {source}"
            )

        # Camera successfully opened
        self.connected = True
        self.running = True

        logger.info(
            f"Camera {camera_id} connected successfully"
        )

        try:

            # -----------------------------------------------------
            # Get stream properties
            # -----------------------------------------------------

            fps = cap.get(cv2.CAP_PROP_FPS)

            if fps <= 0:
                fps = 25.0

            width = int(
                cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            )

            height = int(
                cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            )

            logger.info(
                f"Camera {camera_id}: "
                f"{width}x{height} @ {fps:.2f} FPS"
            )

            # -----------------------------------------------------
            # Initialize analytics
            # -----------------------------------------------------

            self.analytics = CrowdAnalytics(
                width,
                height
            )

            # -----------------------------------------------------
            # Reset tracker
            # -----------------------------------------------------

            self.tracker.reset()

            logger.info(
                f"Live processing started for camera {camera_id}"
            )

            # -----------------------------------------------------
            # Main stream loop
            # -----------------------------------------------------

            while self.running:

                ret, frame = cap.read()

                # -------------------------------------------------
                # Camera disconnected / frame unavailable
                # -------------------------------------------------

                if not ret:

                    logger.warning(
                        f"Camera {camera_id}: "
                        "failed to read frame"
                    )

                    self.connected = False
                    break

                self.connected = True

                # -------------------------------------------------
                # Store latest camera frame
                #
                # This is used by the MJPEG streaming endpoint.
                # copy() prevents the OpenCV buffer from being
                # reused while the API is reading the frame.
                # -------------------------------------------------

                self.latest_frame = frame.copy()

                # -------------------------------------------------
                # Process frame
                # -------------------------------------------------

                process_start = time.perf_counter()

                result = await self._process_frame(
                    frame=frame,
                    frame_number=self.frame_number,
                    fps=fps,
                    width=width,
                    height=height,
                    detection_interval=detection_interval,
                    sensor_id=sensor_id,
                )

                process_time = time.perf_counter() - process_start

                # Frame processing latency
                self.frame_latency_ms = process_time * 1000

                # -------------------------------------------------
                # Rolling / end-to-end FPS
                # -------------------------------------------------

                self.fps_frame_count += 1

                elapsed_time = (
                    time.perf_counter()
                    - self.fps_start_time
                )

                if elapsed_time > 0:

                    self.processing_fps = (
                        self.fps_frame_count
                        / elapsed_time
                    )

                # -------------------------------------------------
                # Add live-specific information
                # -------------------------------------------------

                result["camera_id"] = camera_id
                result["sensor_id"] = sensor_id
                result["stream_status"] = "online"

                result["processing_fps"] = round(
                    self.processing_fps, 2
                )

                result["frame_latency_ms"] = round(
                    self.frame_latency_ms, 2
                )

                # -------------------------------------------------
                # Store latest result
                # -------------------------------------------------

                self.latest_result = result

                # -------------------------------------------------
                # Yield result
                # -------------------------------------------------

                yield result

                self.frame_number += 1

                # Allow other asyncio tasks to execute
                await asyncio.sleep(0)

        except asyncio.CancelledError:

            logger.info(
                f"Live stream cancelled for camera {camera_id}"
            )

            raise

        except Exception as e:

            logger.exception(
                f"Live processing error for camera "
                f"{camera_id}: {e}"
            )

            self.connected = False

            raise

        finally:

            # -----------------------------------------------------
            # Release camera
            # -----------------------------------------------------

            cap.release()

            self.connected = False
            self.running = False

            logger.info(
                f"Live stream stopped for camera {camera_id}"
            )

    async def _process_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        fps: float,
        width: int,
        height: int,
        detection_interval: int = 5,
        sensor_id: int = 0,
    ) -> Dict:
        """
        Process one live frame.

        Reuses the same AI components used by the
        existing video-processing pipeline.
        """

        # ---------------------------------------------------------
        # Timestamp
        # ---------------------------------------------------------

        timestamp = (
            frame_number / fps
            if fps > 0
            else 0
        )

        # ---------------------------------------------------------
        # Person Detection
        # ---------------------------------------------------------

        run_detection = (
            frame_number % detection_interval == 0
        )

        if run_detection:

            detection_start = time.perf_counter()

            detections = self.detector.detect_frame(
                frame,
                frame_number
            )

            self.detection_time_ms = (
                time.perf_counter() - detection_start
            ) * 1000

        else:

            detections = []

        # ---------------------------------------------------------
        # Person Tracking
        # ---------------------------------------------------------

        tracking_start = time.perf_counter()

        tracks = self.tracker.update(
            detections,
            frame_number,
            detections_available=run_detection
        )

        self.tracking_time_ms = (
            time.perf_counter() - tracking_start
        ) * 1000

        # ---------------------------------------------------------
        # People Count
        # ---------------------------------------------------------

        people_count = len(tracks)

        current_time = time.time()

        if (
            current_time - self.last_history_save_time
            >= self.history_save_interval
        ):

            await self.save_crowd_history(
                sensor_id=sensor_id,
                people_count=people_count,
            )

            self.last_history_save_time = current_time

        # ---------------------------------------------------------
        # Unique Track IDs
        # ---------------------------------------------------------

        for track in tracks:

            self.unique_track_ids.add(
                track["track_id"]
            )

        # ---------------------------------------------------------
        # Crowd Density
        # ---------------------------------------------------------

        analytics_start = time.perf_counter()

        density = self.analytics.calculate_density(
            tracks
        )

        # ---------------------------------------------------------
        # Flow Metrics
        # ---------------------------------------------------------

        flow_metrics = self.analytics.calculate_flow_metrics(
            tracks
        )

        # ---------------------------------------------------------
        # Bottleneck Detection
        # ---------------------------------------------------------

        (
            is_bottleneck,
            bottleneck_reason
        ) = self.analytics.detect_bottleneck(
            density,
            flow_metrics
        )

        self.analytics_time_ms = (
            time.perf_counter() - analytics_start
        ) * 1000

        # ---------------------------------------------------------
        # Risk Calculation
        # ---------------------------------------------------------

        risk_start = time.perf_counter()

        risk_result = self.risk_engine.calculate_risk(
            density,
            flow_metrics,
            is_bottleneck,
            people_count=people_count
        )

        self.risk_time_ms = (
            time.perf_counter() - risk_start
        ) * 1000

        # ---------------------------------------------------------
        # Return result
        # ---------------------------------------------------------

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

            "risk_result": risk_result,

            # Live stage performance measurements
            "detection_time_ms": round(
                self.detection_time_ms, 2
            ),

            "tracking_time_ms": round(
                self.tracking_time_ms, 2
            ),

            "analytics_time_ms": round(
                self.analytics_time_ms, 2
            ),

            "risk_time_ms": round(
                self.risk_time_ms, 2
            ),

            "unique_track_count": len(
                self.unique_track_ids
            ),
        }

    def stop(self):
        """
        Stop the live stream.
        """

        logger.info(
            f"Stopping live camera {self.camera_id}"
        )

        self.running = False

    def get_status(self) -> Dict:
        """
        Return current live processor status.
        """

        status = {
            "camera_id": self.camera_id,
            "running": self.running,
            "connected": self.connected,
            "frame_number": self.frame_number,
            "unique_track_count": len(
                self.unique_track_ids
            ),

            # Live performance measurements
            "processing_fps": round(
                self.processing_fps, 2
            ),

            "frame_latency_ms": round(
                self.frame_latency_ms, 2
            ),

            # Live stage performance measurements
            "detection_time_ms": round(
                self.detection_time_ms, 2
            ),

            "tracking_time_ms": round(
                self.tracking_time_ms, 2
            ),

            "analytics_time_ms": round(
                self.analytics_time_ms, 2
            ),

            "risk_time_ms": round(
                self.risk_time_ms, 2
            ),
        }

        # ---------------------------------------------------------
        # Add latest live metrics if available
        # ---------------------------------------------------------

        if self.latest_result:

            status["metrics"] = {

                "people_count": self.latest_result.get(
                    "people_count"
                ),

                "density": self.latest_result.get(
                    "density"
                ),

                "flow_metrics": self.latest_result.get(
                    "flow_metrics"
                ),

                "is_bottleneck": self.latest_result.get(
                    "is_bottleneck"
                ),

                "bottleneck_reason": self.latest_result.get(
                    "bottleneck_reason"
                ),

                "risk_result": self.latest_result.get(
                    "risk_result"
                ),
            }

        return status

    async def save_crowd_history(
        self,
        sensor_id: int,
        people_count: int,
    ):
        """
        Save the current live crowd count to crowd_history.
        """

        def insert_history():

            connection = None
            cursor = None

            try:

                connection = psycopg2.connect(
                    settings.database_url_sync
                )

                cursor = connection.cursor()

                cursor.execute(
                    """
                    INSERT INTO crowd_history (
                        sensor_id,
                        timestamp,
                        people_count,
                        source
                    )
                    VALUES (
                        %s,
                        date_trunc('hour', NOW()),
                        %s,
                        %s
                    )
                    ON CONFLICT (sensor_id, timestamp)
                    DO UPDATE SET
                        people_count = EXCLUDED.people_count
                    """,
                    (
                        sensor_id,
                        max(0, int(people_count)),
                        "live_cctv",
                    ),
                )

                connection.commit()

            except Exception as e:

                logger.exception(
                    f"Failed to save crowd history: {e}"
                )

            finally:

                if cursor:
                    cursor.close()

                if connection:
                    connection.close()

        await asyncio.to_thread(insert_history)