"""
CrowdSentinel AI Backend
FastAPI server for video processing and AI analysis
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from api.videos import router as videos_router
from api.analysis import router as analysis_router
from ai.detection import PersonDetector
from database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    logger.info("Starting CrowdSentinel AI Backend")

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    # Initialize YOLO model on startup
    
    # Initialize YOLO model on startup
    try:
        detector = PersonDetector()
        logger.info("YOLO model initialized successfully")
        app.state.detector = detector
    except Exception as e:
        logger.warning(f"YOLO model initialization failed: {e}")
        app.state.detector = None
    
    yield
    logger.info("Shutting down CrowdSentinel AI Backend")


app = FastAPI(
    title="CrowdSentinel AI",
    description="AI-powered early crowd-risk monitoring and decision-support system",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(videos_router)
app.include_router(analysis_router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "CrowdSentinel AI Backend",
        "version": "0.1.0"
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    detector_status = "loaded" if hasattr(app.state, 'detector') and app.state.detector else "not_loaded"
    
    return {
        "status": "healthy",
        "components": {
            "api": "running",
            "database": "configured",
            "yolo": detector_status,
            "tracking": "implemented"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
