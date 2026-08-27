"""
Video upload and management API routes
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import aiofiles
import os
from pathlib import Path
import uuid

from database import get_db
from models import Video
from schemas import VideoUploadResponse, VideoStatusResponse
from config import settings

router = APIRouter(prefix="/api/videos", tags=["videos"])


async def validate_video_file(file: UploadFile) -> None:
    """Validate uploaded video file"""
    # Check file extension
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_ext not in settings.supported_video_formats_list:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {settings.supported_video_formats}"
        )
    
    # Check file size (will be checked after upload starts)
    # Note: FastAPI doesn't provide size before upload, so we check during save


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a video file for analysis
    """
    await validate_video_file(file)
    
    # Create upload directory if it doesn't exist
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = file.filename.split(".")[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Save file
    file_size = 0
    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                # Check file size limit
                if file_size > settings.max_video_size_mb * 1024 * 1024:
                    await f.close()
                    os.remove(file_path)
                    raise HTTPException(
                        status_code=400,
                        detail=f"File too large. Max size: {settings.max_video_size_mb}MB"
                    )
                await f.write(chunk)
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create database record
    video = Video(
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        status="uploaded"
    )
    
    db.add(video)
    await db.commit()
    await db.refresh(video)
    
    return video


@router.get("/", response_model=List[VideoStatusResponse])
async def list_videos(db: AsyncSession = Depends(get_db)):
    """
    List all uploaded videos
    """
    result = await db.execute(select(Video).order_by(Video.uploaded_at.desc()))
    videos = result.scalars().all()
    return videos


@router.get("/{video_id}", response_model=VideoStatusResponse)
async def get_video(video_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get video details and status
    """
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return video


@router.delete("/{video_id}")
async def delete_video(video_id: int, db: AsyncSession = Depends(get_db)):
    """
    Delete a video and its file
    """
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete file
    if os.path.exists(video.file_path):
        os.remove(video.file_path)
    
    # Delete database record
    await db.delete(video)
    await db.commit()
    
    return {"message": "Video deleted successfully"}


@router.get("/{video_id}/stream")
async def stream_video(video_id: int, db: AsyncSession = Depends(get_db)):
    """
    Stream video file for playback
    """
    result = await db.execute(select(Video).where(Video.id == video_id))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        video.file_path,
        media_type="video/mp4",
        filename=video.original_filename
    )
