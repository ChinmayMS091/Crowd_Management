"""
Crowd Management AI Backend
FastAPI server for video processing and AI analysis
"""
from fastapi import Depends
from auth_dependencies import get_current_user, require_roles
from api.communication import router as communication_router
from models import User
from api.live import router as live_router
from api.predictions import router as predictions_router    
from fastapi import FastAPI
from api.history import router as history_router
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from api.videos import router as videos_router
from api.analysis import router as analysis_router
from api.auth import router as auth_router
from ai.shared_detector import shared_detector
from database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    logger.info("Starting Crowd Management AI Backend")

    # Initialize database
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    # Shared YOLO detector is initialized when ai.shared_detector is imported
    app.state.detector = shared_detector
    logger.info("Shared YOLO model initialized successfully")
    
    yield
    logger.info("Shutting down Crowd Management AI Backend")


app = FastAPI(
    title="Crowd Management AI",
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
app.include_router(history_router)
app.include_router(predictions_router)
app.include_router(live_router)
app.include_router(videos_router)
app.include_router(analysis_router)
app.include_router(auth_router) 
app.include_router(communication_router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Crowd Management AI Backend",
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


@app.get("/api/auth/me")
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Return the authenticated user's profile."""

    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
