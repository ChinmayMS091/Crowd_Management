"""
Live CCTV API

API endpoints for starting, stopping, monitoring,
and streaming multiple live CCTV processing pipelines.
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
# Live processors
# ---------------------------------------------------------
# Each camera gets its own LiveProcessor instance.
#
# This gives every camera its own:
# - tracker
# - camera state
# - latest frame
# - analytics state
# - risk state
# - unique track IDs
#
# The YOLO detector itself remains shared.
# ---------------------------------------------------------

live_processors = {}

# Background task for each camera
live_tasks = {}


# ---------------------------------------------------------
# Get or create processor
# ---------------------------------------------------------

def get_live_processor(camera_id: str) -> LiveProcessor:
    """
    Get the LiveProcessor for a camera.

    If the camera does not have a processor yet,
    create one using the shared YOLO detector.
    """

    if camera_id not in live_processors:
        live_processors[camera_id] = LiveProcessor(
            detector=shared_detector
        )

    return live_processors[camera_id]


# ---------------------------------------------------------
# Background runner
# ---------------------------------------------------------

async def run_live_stream(
    source: str,
    camera_id: str,
    sensor_id: int
):
    """
    Continuously consume the live stream for one camera.
    """

    processor = get_live_processor(camera_id)

    try:

        async for result in processor.process_stream(
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
            # Crowd history saving

            # Keep processing the stream.
            pass

    except asyncio.CancelledError:

        processor.stop()

        raise

    except Exception as e:

        print(
            f"Live stream error for camera "
            f"{camera_id}: {e}"
        )

        processor.stop()

    finally:

        live_tasks.pop(camera_id, None)


# ---------------------------------------------------------
# MJPEG video stream generator
# ---------------------------------------------------------

async def generate_mjpeg_stream(camera_id: str):
    """
    Generate MJPEG frames for a specific camera.
    """

    processor = get_live_processor(camera_id)

    while processor.running:

        # Get latest camera frame
        frame = processor.latest_frame

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
    Get current status of all live CCTV cameras.
    """

    cameras = {}

    for camera_id, processor in live_processors.items():

        cameras[camera_id] = processor.get_status()

    return {
        "cameras": cameras,
        "total_cameras": len(cameras)
    }


# ---------------------------------------------------------
# Live video stream
# ---------------------------------------------------------

@router.get("/stream/{camera_id}")
async def live_video_stream(camera_id: str):
    """
    Stream the live CCTV camera feed for a specific camera.
    """

    return StreamingResponse(
        generate_mjpeg_stream(camera_id),
        media_type=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        )
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
    Start live CCTV processing for a specific camera.
    """

    # Get or create processor
    processor = get_live_processor(camera_id)

    # Check if this camera is already running
    if processor.running:

        return {
            "status": "already_running",
            "camera_id": camera_id,
            "sensor_id": sensor_id,
            "message": (
                "This camera is already running"
            )
        }

    # Check if a background task already exists
    existing_task = live_tasks.get(camera_id)

    if existing_task is not None:

        if not existing_task.done():

            return {
                "status": "already_running",
                "camera_id": camera_id,
                "sensor_id": sensor_id,
                "message": (
                    "This camera is already processing"
                )
            }

        live_tasks.pop(camera_id, None)

    # Start background processing task
    task = asyncio.create_task(
        run_live_stream(
            source=source,
            camera_id=camera_id,
            sensor_id=sensor_id
        )
    )

    live_tasks[camera_id] = task

    return {
        "status": "started",
        "camera_id": camera_id,
        "sensor_id": sensor_id,
        "source": source,
        "message": (
            "Live camera processing started"
        )
    }


# ---------------------------------------------------------
# Stop
# ---------------------------------------------------------

@router.post("/stop/{camera_id}")
async def stop_live_camera(camera_id: str):
    """
    Stop live CCTV processing for a specific camera.
    """

    processor = live_processors.get(camera_id)

    if processor is None:

        return {
            "status": "not_found",
            "camera_id": camera_id,
            "message": (
                "Camera does not have an active processor"
            )
        }

    # Stop the processor
    processor.stop()

    # Cancel background task
    task = live_tasks.get(camera_id)

    if task is not None:

        if not task.done():

            task.cancel()

        live_tasks.pop(camera_id, None)

    return {
        "status": "stopped",
        "camera_id": camera_id,
        "message": "Live camera stopped"
    }