"""
Database models for CrowdSentinel AI
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Video(Base):
    """Video upload and processing metadata"""
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Float, nullable=True)
    fps = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    status = Column(String, default="uploaded")  # uploaded, processing, completed, failed
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    analyses = relationship("Analysis", back_populates="video", cascade="all, delete-orphan")


class Analysis(Base):
    """Analysis session for a video"""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    status = Column(String, default="pending")
    unique_people_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_frames = Column(Integer, nullable=True)
    frames_processed = Column(Integer, default=0)
    avg_people_count = Column(Float, nullable=True)
    max_people_count = Column(Integer, nullable=True)
    avg_density = Column(Float, nullable=True)
    max_density = Column(Float, nullable=True)
    avg_flow_rate = Column(Float, nullable=True)
    max_risk_score = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Relationships
    video = relationship("Video", back_populates="analyses")
    zones = relationship("Zone", back_populates="analysis", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="analysis", cascade="all, delete-orphan")
    metrics = relationship("AnalysisMetric", back_populates="analysis", cascade="all, delete-orphan")


class Zone(Base):
    """Zone configuration for analysis"""
    __tablename__ = "zones"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    name = Column(String, nullable=False)
    polygon_coordinates = Column(JSON, nullable=False)  # List of [x, y] coordinates
    area_pixels = Column(Float, nullable=True)
    density_threshold = Column(Float, default=0.5)
    flow_threshold = Column(Float, default=0.3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    analysis = relationship("Analysis", back_populates="zones")


class Alert(Base):
    """Alerts generated during analysis"""
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    severity = Column(String, nullable=False)  # low, medium, high, critical
    risk_score = Column(Float, nullable=False)
    reason = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    analysis = relationship("Analysis", back_populates="alerts")


class AnalysisMetric(Base):
    """Time-series metrics during analysis"""
    __tablename__ = "analysis_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    frame_number = Column(Integer, nullable=False)
    timestamp = Column(Float, nullable=False)  # Video timestamp in seconds
    people_count = Column(Integer, nullable=False)
    density = Column(Float, nullable=False)
    flow_rate = Column(Float, nullable=True)
    avg_velocity = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # safe, warning, high, critical
    
    # Relationships
    analysis = relationship("Analysis", back_populates="metrics")
