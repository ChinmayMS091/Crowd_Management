# CrowdSentinel AI

AI-powered early crowd-risk monitoring and decision-support system for detecting crowd conditions, analyzing movement patterns, identifying bottlenecks, and assessing potential crowd-risk situations.

---

## Overview

CrowdSentinel AI is a computer-vision-based crowd monitoring system designed to analyze both recorded videos and live CCTV/webcam streams.

The system uses YOLOv8 for person detection, custom multi-object tracking, crowd analytics, bottleneck detection, and a weighted risk engine to provide real-time and historical crowd insights.

The project currently supports two primary workflows:

1. **Video Processing** — Analyze recorded crowd videos.
2. **Live CCTV** — Monitor a webcam/live camera stream in real time.

---

## Key Features

### Video Processing

The recorded-video pipeline supports:

- Video upload and processing
- YOLOv8 person detection
- Person tracking
- People counting
- Crowd density calculation
- Crowd flow analysis
- Average movement velocity
- Bottleneck detection
- Risk score calculation
- Risk-level classification
- Historical analysis
- Analysis metrics
- Alert generation
- PostgreSQL-based data storage

---

### Live CCTV Monitoring

The live CCTV pipeline supports:

- Webcam camera input
- Live camera start/stop
- Real-time YOLOv8 person detection
- Real-time people counting
- Multi-object tracking
- Crowd density calculation
- Crowd flow analysis
- Average movement velocity
- Bottleneck detection
- Real-time risk score
- Real-time risk-level classification
- Live camera status
- Real-time frontend metric updates

The live processing pipeline is implemented separately from the recorded-video pipeline while reusing the existing AI components.

---

## System Architecture

```text
                         CrowdSentinel AI
                                |
                +---------------+---------------+
                |                               |
                |                               |
        Video Processing                    Live CCTV
        Recorded Video                  Webcam / Camera
                |                               |
                +---------------+---------------+
                                |
                         OpenCV Processing
                                |
                         YOLOv8 Detection
                                |
                        Person Detection
                                |
                       Multi-Object Tracking
                                |
                        Crowd Analytics
                                |
              +-----------------+-----------------+
              |                 |                 |
           Density             Flow          Bottleneck
              |                 |                 |
              +-----------------+-----------------+
                                |
                          Risk Engine
                                |
                    Risk Score / Risk Level
                                |
                         FastAPI Backend
                                |
                         Next.js Frontend
                                |
                     CrowdSentinel Dashboard
Technology Stack
Backend
Python
FastAPI
OpenCV
Ultralytics YOLOv8
NumPy
SQLAlchemy
PostgreSQL
Async Python processing
Frontend
Next.js
React
TypeScript
Tailwind CSS
Computer Vision
YOLOv8
OpenCV
Custom multi-object tracking
Crowd density analysis
Crowd flow analysis
Bottleneck detection
Database
PostgreSQL
SQLAlchemy
Project Structure
Crowd_Management/
│
├── backend/
│   │
│   ├── ai/
│   │   ├── detection.py
│   │   ├── tracking.py
│   │   ├── analytics.py
│   │   └── risk_engine.py
│   │
│   ├── api/
│   │   ├── analysis.py
│   │   ├── videos.py
│   │   └── live.py
│   │
│   ├── live/
│   │   └── live_processor.py
│   │
│   ├── models/
│   │   └── yolov8m.pt
│   │
│   ├── uploads/
│   │
│   ├── processed/
│   │
│   ├── database.py
│   ├── config.py
│   └── main.py
│
├── frontend/
│   │
│   ├── public/
│   │
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx
│   │       │
│   │       ├── cctv/
│   │       │   └── page.tsx
│   │       │
│   │       ├── dashboard/
│   │       │   └── page.tsx
│   │       │
│   │       ├── analyses/
│   │       │   ├── page.tsx
│   │       │   └── [id]/
│   │       │       └── page.tsx
│   │       │
│   │       ├── globals.css
│   │       └── layout.tsx
│   │
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
│
└── README.md
Application Navigation

The main user-facing navigation currently contains two primary sections:

+---------------------+
| CrowdSentinel AI    |
+---------------------+
| Video Processing    |
| Live CCTV           |
+---------------------+
Video Processing

Used for uploading and analyzing recorded videos.

Live CCTV

Used for connecting to a webcam/live camera and monitoring crowd conditions in real time.

Video Processing Pipeline

The recorded-video processing pipeline follows:

Video Upload
     |
     v
OpenCV Video Reader
     |
     v
Frame Extraction
     |
     v
YOLOv8 Person Detection
     |
     v
Person Tracking
     |
     v
Crowd Analytics
     |
     +----> People Count
     |
     +----> Density
     |
     +----> Flow
     |
     +----> Velocity
     |
     +----> Bottleneck
     |
     v
Risk Engine
     |
     v
Risk Score / Risk Level
     |
     v
PostgreSQL
     |
     v
Dashboard
Live CCTV Pipeline

The live CCTV pipeline is implemented separately from the recorded-video processor.

Webcam / CCTV
      |
      v
OpenCV VideoCapture
      |
      v
YOLOv8 Person Detection
      |
      v
SimpleTracker
      |
      v
Crowd Analytics
      |
      +----> People Count
      |
      +----> Density
      |
      +----> Flow Metrics
      |
      +----> Average Velocity
      |
      +----> Bottleneck
      |
      v
Risk Engine
      |
      +----> Risk Score
      |
      +----> Risk Level
      |
      v
FastAPI Live API
      |
      v
Next.js Live CCTV Page
YOLOv8 Person Detection

The system uses YOLOv8 for detecting people in video frames.

The person class is:

Class ID: 0
Class: person

The live CCTV pipeline uses a confidence threshold of:

confidence_threshold=0.50

This configuration is applied specifically to live CCTV processing.

The recorded-video pipeline remains separate.

Multi-Object Tracking

The project uses a custom SimpleTracker for maintaining person identities across frames.

The tracker is used to:

Associate detections across frames
Maintain track IDs
Track movement
Calculate movement-related metrics
Support crowd-flow analysis
Maintain unique track counts
Crowd Analytics

The analytics layer calculates multiple crowd-related measurements.

People Count

Number of currently tracked people in the scene.

people_count
Crowd Density

Density is calculated using the tracked people and camera/frame dimensions.

density
Crowd Flow

The system analyzes movement information from tracked people.

Example metrics include:

flow_rate
avg_velocity
flow_consistency
movement_data_available
Bottleneck Detection

The analytics system checks crowd density and movement characteristics to identify potential bottleneck conditions.

Example output:

is_bottleneck
bottleneck_reason
Risk Engine

The risk engine combines crowd-related metrics to calculate a risk result.

The current result contains:

risk_score
risk_level
components

Example:

{
  "risk_score": 0.01,
  "risk_level": "safe"
}

The risk calculation considers factors including:

Crowd density
Crowd flow
Movement velocity
Bottleneck conditions
People count
Backend API

The FastAPI backend provides APIs for video analysis and live CCTV monitoring.

The backend runs on:

http://localhost:8000

FastAPI Swagger documentation:

http://localhost:8000/docs
Live CCTV API
Start Camera
POST /api/live/start

Example:

http://localhost:8000/api/live/start?source=0&camera_id=camera_1

Where:

source=0

represents the default webcam.

Stop Camera
POST /api/live/stop
Live Status
GET /api/live/status

The status endpoint provides:

{
  "camera_id": "camera_1",
  "running": true,
  "connected": true,
  "frame_number": 100,
  "unique_track_count": 3,
  "metrics": {
    "people_count": 3,
    "density": 0.012,
    "flow_metrics": {},
    "is_bottleneck": false,
    "bottleneck_reason": "",
    "risk_result": {}
  }
}
Frontend Live CCTV Dashboard

The Live CCTV page is available at:

http://localhost:3000/cctv

The dashboard currently provides:

Camera Status
      |
      +---- Camera Online / Offline
      |
      +---- Start Camera
      |
      +---- Stop Camera

Live Metrics
      |
      +---- People Count
      |
      +---- Density
      |
      +---- Flow Rate
      |
      +---- Average Velocity
      |
      +---- Bottleneck Status
      |
      +---- Risk Score
      |
      +---- Risk Level

The frontend currently retrieves live status information from the backend and updates the displayed metrics in real time.

Getting Started
Prerequisites

Make sure the following are installed:

Python
Node.js
npm
PostgreSQL
Git

A compatible Python environment is also required for the backend dependencies.