"""
Analysis API routes
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import asyncio

from database import get_db
from models import Video, Analysis, AnalysisMetric, Alert, Zone
from schemas import AnalysisCreate, AnalysisResponse, ZoneCreate, ZoneResponse, AlertResponse, AnalysisMetricResponse
from ai.video_processor import VideoProcessor
from ai.risk_engine import RiskEngine
from config import settings

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

# Global processor instance (in production, use a pool)
processor = VideoProcessor()
risk_engine = RiskEngine()


async def update_analysis_progress(analysis_id: int, progress: float, db: AsyncSession):
    """Update analysis progress in database"""
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    if analysis:
        analysis.frames_processed = int((progress / 100) * analysis.total_frames) if analysis.total_frames else 0
        await db.commit()


@router.post("/start", response_model=AnalysisResponse)
async def start_analysis(
    request: AnalysisCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Start analysis for a video
    """
    # Verify video exists
    result = await db.execute(select(Video).where(Video.id == request.video_id))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if video.status != "uploaded":
        raise HTTPException(status_code=400, detail="Video must be in 'uploaded' status")
    
    # Create analysis record
    analysis = Analysis(
        video_id=request.video_id,
        status="pending"
    )
    db.add(analysis)
    await db.commit()
    await db.refresh(analysis)
    
    # Start background processing
    background_tasks.add_task(
        process_video_task,
        analysis.id,
        video.file_path,
        db
    )
    
    return analysis


async def process_video_task(analysis_id: int, video_path: str, db: AsyncSession):
    """
    Background task to process video
    """
    try:
        # Update status to running
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if not analysis:
            return
        
        analysis.status = "running"
        analysis.processing_started_at = analysis.started_at
        await db.commit()
        
        # Get video info
        video_info = processor.get_video_info(video_path)
        analysis.total_frames = video_info["frame_count"]
        await db.commit()
        
        # Process video
        metrics_buffer = []
        alerts_buffer = []
        max_risk_score = 0
        people_counts = []
        densities = []
        flow_rates = []
        previous_risk_score = None
        
        async def progress_callback(
            analysis_id: int,
            progress: float
        ):
            await update_analysis_progress(
                analysis_id,
                progress,
                db
            )


        async for frame_result in processor.process_video(
            video_path,
            analysis_id,
            progress_callback=progress_callback,
            detection_interval=5
        ):
            # Store metrics
            metric = AnalysisMetric(
                analysis_id=analysis_id,
                frame_number=frame_result["frame_number"],
                timestamp=frame_result["timestamp"],
                people_count=frame_result["people_count"],
                density=frame_result["density"],
                flow_rate=frame_result["flow_metrics"]["flow_rate"],
                avg_velocity=frame_result["flow_metrics"]["avg_velocity"],
                risk_score=frame_result["risk_result"]["risk_score"],
                risk_level=frame_result["risk_result"]["risk_level"]
            )
            metrics_buffer.append(metric)
            
            # Check for alerts
            should_alert, alert_reason = risk_engine.should_trigger_alert(
                frame_result["risk_result"],
                previous_risk=previous_risk_score
            )
            
            if should_alert:
                alert = Alert(
                    analysis_id=analysis_id,
                    severity=frame_result["risk_result"]["risk_level"],
                    risk_score=frame_result["risk_result"]["risk_score"],
                    reason=alert_reason
                )
                alerts_buffer.append(alert)
            
            # Track aggregates
            max_risk_score = max(max_risk_score, frame_result["risk_result"]["risk_score"])
            people_counts.append(frame_result["people_count"])
            densities.append(frame_result["density"])
            flow_rates.append(frame_result["flow_metrics"]["flow_rate"])
            previous_risk_score = frame_result["risk_result"]["risk_score"]
            
            # Batch insert every 10 frames
            if len(metrics_buffer) >= 10:
                db.add_all(metrics_buffer)
                
                # Update progress
                result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
                current_analysis = result.scalar_one_or_none()
                if current_analysis:
                    current_analysis.frames_processed = frame_result["frame_number"]
                    
                await db.commit()
                metrics_buffer.clear()
            
            # Batch insert alerts every 5
            if len(alerts_buffer) >= 5:
                db.add_all(alerts_buffer)
                await db.commit()
                alerts_buffer.clear()
        
        # Insert remaining metrics
        if metrics_buffer:
            db.add_all(metrics_buffer)
            await db.commit()
        
        # Insert remaining alerts
        if alerts_buffer:
            db.add_all(alerts_buffer)
            await db.commit()
        
        # Calculate aggregates
        analysis.frames_processed = analysis.total_frames
        analysis.avg_people_count = sum(people_counts) / len(people_counts) if people_counts else 0
        analysis.max_people_count = max(people_counts) if people_counts else 0
        analysis.avg_density = sum(densities) / len(densities) if densities else 0
        analysis.max_density = max(densities) if densities else 0
        analysis.avg_flow_rate = sum(flow_rates) / len(flow_rates) if flow_rates else 0
        analysis.max_risk_score = max_risk_score
        analysis.status = "completed"
        analysis.completed_at = analysis.started_at  # Will be updated by DB
        
        # Update video status
        video_result = await db.execute(select(Video).where(Video.id == analysis.video_id))
        video = video_result.scalar_one_or_none()
        if video:
            video.status = "completed"
            video.processing_completed_at = analysis.started_at
        
        await db.commit()
        
    except Exception as e:
        # Update status to failed
        result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
        analysis = result.scalar_one_or_none()
        if analysis:
            analysis.status = "failed"
            analysis.error_message = str(e)
            await db.commit()


@router.get("/", response_model=List[AnalysisResponse])
async def list_analyses(db: AsyncSession = Depends(get_db)):
    """List all analyses"""
    result = await db.execute(select(Analysis).order_by(Analysis.started_at.desc()))
    analyses = result.scalars().all()
    return analyses


@router.get("/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Get analysis details"""
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis


@router.get("/{analysis_id}/metrics", response_model=List[AnalysisMetricResponse])
async def get_analysis_metrics(
    analysis_id: int,
    limit: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get time-series metrics for an analysis"""
    # Verify analysis exists
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    query = select(AnalysisMetric).where(
        AnalysisMetric.analysis_id == analysis_id
    ).order_by(AnalysisMetric.frame_number)
    
    if limit:
        query = query.limit(limit)
    
    result = await db.execute(query)
    metrics = result.scalars().all()
    return metrics


@router.post("/{analysis_id}/zones", response_model=ZoneResponse)
async def create_zone(
    analysis_id: int,
    zone: ZoneCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a zone for an analysis"""
    # Verify analysis exists
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    # Create zone
    new_zone = Zone(
        analysis_id=analysis_id,
        name=zone.name,
        polygon_coordinates=zone.polygon_coordinates,
        density_threshold=zone.density_threshold,
        flow_threshold=zone.flow_threshold
    )
    
    db.add(new_zone)
    await db.commit()
    await db.refresh(new_zone)
    
    return new_zone


@router.get("/{analysis_id}/zones", response_model=List[ZoneResponse])
async def get_zones(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Get zones for an analysis"""
    result = await db.execute(
        select(Zone).where(Zone.analysis_id == analysis_id)
    )
    zones = result.scalars().all()
    return zones


@router.get("/{analysis_id}/alerts", response_model=List[AlertResponse])
async def get_alerts(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Get alerts for an analysis"""
    result = await db.execute(
        select(Alert).where(Alert.analysis_id == analysis_id).order_by(Alert.timestamp.desc())
    )
    alerts = result.scalars().all()
    return alerts


@router.put("/{analysis_id}/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    analysis_id: int,
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Acknowledge an alert"""
    result = await db.execute(
        select(Alert).where(
            Alert.id == alert_id,
            Alert.analysis_id == analysis_id
        )
    )
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    alert.acknowledged_at = func.now()
    
    await db.commit()
    await db.refresh(alert)
    
    return {"message": "Alert acknowledged successfully", "alert_id": alert_id}


import os

@router.delete("/{analysis_id}")
async def delete_analysis(analysis_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an analysis, its metrics/alerts, and the physical video file"""
    result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    # Get associated video to delete physical file
    video_result = await db.execute(select(Video).where(Video.id == analysis.video_id))
    video = video_result.scalar_one_or_none()
    
    if video:
        # Delete physical file from uploads folder
        if os.path.exists(video.file_path):
            os.remove(video.file_path)
        # Delete video DB record
        await db.delete(video)
        
    await db.delete(analysis)
    await db.commit()
    
    return {"message": "Analysis and video deleted successfully"}
