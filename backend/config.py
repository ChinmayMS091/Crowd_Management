"""
Configuration settings for CrowdSentinel AI Backend
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/crowdsentinel"
    database_url_sync: str = "postgresql://user:password@localhost:5432/crowdsentinel"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # AI Model Configuration
    yolo_model_path: str = "models/yolov8m.pt"
    yolo_confidence_threshold: float = 0.20
    yolo_iou_threshold: float = 0.60
    
    # Video Processing
    max_video_size_mb: int = 500
    supported_video_formats: str = "mp4,avi,mov,mkv"
    frame_extraction_fps: int = 1
    max_concurrent_processing: int = 2
    
    # Upload Configuration
    upload_dir: str = "uploads"
    processed_dir: str = "processed"
    
    # CORS
    frontend_url: str = "http://localhost:3000"
    
    # JWT
    secret_key: str = "your-secret-key-change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False
    
    @property
    def supported_video_formats_list(self) -> List[str]:
        """Parse supported video formats string into list"""
        return [fmt.strip() for fmt in self.supported_video_formats.split(",")]


settings = Settings()
