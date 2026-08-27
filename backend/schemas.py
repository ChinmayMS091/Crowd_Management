"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


class VideoUploadResponse(BaseModel):
    """Response after video upload"""
    id: int
    filename: str
    original_filename: str
    file_size: int
    status: str
    uploaded_at: datetime
    
    class Config:
        from_attributes = True


class VideoStatusResponse(BaseModel):
    """Video processing status"""
    id: int
    filename: str
    status: str
    duration: Optional[float]
    fps: Optional[float]
    width: Optional[int]
    height: Optional[int]
    uploaded_at: datetime
    processing_started_at: Optional[datetime]
    processing_completed_at: Optional[datetime]
    error_message: Optional[str]
    
    class Config:
        from_attributes = True


class AnalysisCreate(BaseModel):
    """Request to start analysis"""
    video_id: int
    config: Optional[Dict[str, Any]] = None


class AnalysisResponse(BaseModel):
    """Analysis status and results"""
    id: int
    video_id: int
    status: str
    started_at: datetime
    completed_at: Optional[datetime]
    total_frames: Optional[int]
    frames_processed: int
    avg_people_count: Optional[float]
    max_people_count: Optional[int]
    avg_density: Optional[float]
    max_density: Optional[float]
    avg_flow_rate: Optional[float]
    max_risk_score: Optional[float]
    error_message: Optional[str]
    
    class Config:
        from_attributes = True


class ZoneCreate(BaseModel):
    """Request to create a zone"""
    analysis_id: int
    name: str
    polygon_coordinates: List[List[float]]
    density_threshold: Optional[float] = 0.5
    flow_threshold: Optional[float] = 0.3
    
    @validator('polygon_coordinates')
    def validate_polygon(cls, v):
        if len(v) < 3:
            raise ValueError('Polygon must have at least 3 points')
        return v


class ZoneResponse(BaseModel):
    """Zone information"""
    id: int
    analysis_id: int
    name: str
    polygon_coordinates: List[List[float]]
    area_pixels: Optional[float]
    density_threshold: float
    flow_threshold: float
    created_at: datetime
    
    class Config:
        from_attributes = True


class AlertResponse(BaseModel):
    """Alert information"""
    id: int
    analysis_id: int
    zone_id: Optional[int]
    severity: str
    risk_score: float
    reason: str
    timestamp: datetime
    acknowledged: bool
    acknowledged_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AnalysisMetricResponse(BaseModel):
    """Time-series metric data point"""
    id: int
    analysis_id: int
    frame_number: int
    timestamp: float
    people_count: int
    density: float
    flow_rate: Optional[float]
    avg_velocity: Optional[float]
    risk_score: float
    risk_level: str
    
    class Config:
        from_attributes = True


class DetectionResult(BaseModel):
    """Single detection from YOLO"""
    class_id: int
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]


class FrameResult(BaseModel):
    """Results for a single frame"""
    frame_number: int
    timestamp: float
    detections: List[DetectionResult]
    tracks: List[Dict[str, Any]]  # Track ID, bbox, etc.
    people_count: int
    density: float
