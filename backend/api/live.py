"""
Live CCTV API

API endpoints for starting, stopping, and monitoring
the live CCTV processing pipeline.
"""

import asyncio

from fastapi import APIRouter

from live.live_processor import LiveProcessor


router = APIRouter(
    prefix="/api/live",
    tags=["live"]
)


# ---------------------------------------------------------
# Live processor
# ---------------------------------------------------------

live_processor = LiveProcessor()

# Background task for continuous stream processing
live_task = None


# ---------------------------------------------------------
# Background runner
# ---------------------------------------------------------

async def run_live_stream(
    source: str,
    camera_id: str
):
    """
    Continuously consume the live stream.
    """

    try:

        async for result in live_processor.process_stream(
            source=source,
            camera_id=camera_id,
            detection_interval=5
        ):

            # The LiveProcessor already performs:
            # YOLO detection
            # Tracking
            # Crowd analytics
            # Risk analysis

            # For now we simply keep processing.
            # Later this result will be sent to the
            # frontend through WebSocket/SSE.
            pass

    except asyncio.CancelledError:

        live_processor.stop()

        raise

    except Exception as e:

        print(f"Live stream error: {e}")

        live_processor.stop()


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
# Start
# ---------------------------------------------------------

@router.post("/start")
async def start_live_camera(
    source: str = "0",
    camera_id: str = "camera_1"
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
            camera_id=camera_id
        )
    )

    return {
        "status": "started",
        "camera_id": camera_id,
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