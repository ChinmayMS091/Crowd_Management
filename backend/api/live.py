"""
Live CCTV API

API endpoints for starting, stopping, monitoring,
and streaming the live CCTV processing pipeline.
"""

import asyncio
import cv2

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from live.live_processor import LiveProcessor
from ai.shared_detector import shared_detector


router = APIRouter(
    prefix="/api/live",
    tags=["live"]
)



# ---------------------------------------------------------
# Live processor
# ---------------------------------------------------------

live_processor = LiveProcessor(
    detector=shared_detector
)

# Background task for continuous stream processing
live_task = None


# ---------------------------------------------------------
# Background runner
# ---------------------------------------------------------

async def run_live_stream(
    source: str,
    camera_id: str,
    sensor_id: int
):
    """
    Continuously consume the live stream.
    """

    try:

        async for result in live_processor.process_stream(
            source=source,
            camera_id=camera_id,
            sensor_id=sensor_id,
            detection_interval=5
        ):

            # The LiveProcessor already performs:
            # YOLO detection
            # Tracking
            # Crowd analytics
            # Risk analysis

            # Keep processing the stream.
            pass

    except asyncio.CancelledError:

        live_processor.stop()

        raise

    except Exception as e:

        print(f"Live stream error: {e}")

        live_processor.stop()


# ---------------------------------------------------------
# MJPEG video stream generator
# ---------------------------------------------------------

async def generate_mjpeg_stream():
    """
    Generate MJPEG frames from the currently running
    LiveProcessor camera stream.
    """

    while live_processor.running:

        # Get latest camera frame
        frame = live_processor.latest_frame

        if frame is None:

            await asyncio.sleep(0.05)
            continue

        # Encode frame as JPEG
        success, encoded_frame = cv2.imencode(
            ".jpg",
            frame
        )

        if not success:

            await asyncio.sleep(0.01)
            continue

        # Convert JPEG to bytes
        frame_bytes = encoded_frame.tobytes()

        # MJPEG frame format
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )

        # Small delay to avoid unnecessary CPU usage
        await asyncio.sleep(0.03)


# ---------------------------------------------------------
# Status
# ---------------------------------------------------------

@router.get("/status")
async def get_live_status():
    """
    Get current live CCTV processor status.
    """

    return live_processor.get_status()


# ---------------------------------------------------------
# Live video stream
# ---------------------------------------------------------

@router.get("/stream")
async def live_video_stream():
    """
    Stream the live CCTV camera feed using MJPEG.
    """

    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ---------------------------------------------------------
# Start
# ---------------------------------------------------------

@router.post("/start")
async def start_live_camera(
    source: str = "0",
    camera_id: str = "camera_1",
    sensor_id: int = 1
):
    """
    Start live CCTV processing in the background.
    """

    global live_task

    if live_processor.running:

        return {
            "status": "already_running",
            "message": "Live camera is already running"
        }

    # Start background processing task
    live_task = asyncio.create_task(
        run_live_stream(
            source=source,
            camera_id=camera_id,
            sensor_id=sensor_id
        )
    )

    return {
        "status": "started",
        "camera_id": camera_id,
        "sensor_id": sensor_id,
        "source": source,
        "message": "Live camera processing started"
    }


# ---------------------------------------------------------
# Stop
# ---------------------------------------------------------

@router.post("/stop")
async def stop_live_camera():
    """
    Stop the live CCTV processor.
    """

    global live_task

    live_processor.stop()

    if live_task is not None:

        live_task.cancel()

        live_task = None

    return {
        "status": "stopped",
        "message": "Live camera stopped"
    }