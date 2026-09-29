# CrowdSentinel AI — Frontend

Next.js frontend for **CrowdSentinel AI**, an AI-powered crowd monitoring and risk analysis system.

The frontend provides interfaces for:

- Recorded video processing
- Live CCTV / webcam monitoring
- Real-time crowd metrics
- Risk and bottleneck visualization

---

## Features

### Video Processing

The Video Processing page allows users to:

- Upload recorded videos
- Start video analysis
- Monitor processing status
- View analysis results
- View crowd statistics
- View risk information

The recorded-video analysis is handled by the FastAPI backend.

---

### Live CCTV Monitoring

The Live CCTV page provides real-time monitoring of a camera source.

Supported sources:

1. Computer Webcam
2. CCTV / IP Camera using RTSP

### Computer Webcam

The default webcam is accessed using:

```text
source = 0
CCTV / IP Camera

An RTSP stream URL can be provided, for example:

rtsp://username:password@192.168.1.100:554/stream

The actual RTSP URL depends on the camera or NVR.

Live Monitoring Dashboard

The Live CCTV dashboard displays:

Camera status
Live camera feed
Camera ID
Frame number
Unique tracked objects
People count
Crowd density
Flow rate
Average velocity
Risk score
Risk level
Bottleneck status

The frontend periodically requests live status information from the backend.

Technology Stack
Core
Next.js
React
TypeScript
UI
Tailwind CSS
Data Visualization
Recharts
Backend Communication
REST API
MJPEG live video stream
Project Structure
frontend/
│
├── public/
│
├── src/
│   └── app/
│       │
│       ├── page.tsx
│       │
│       ├── cctv/
│       │   └── page.tsx
│       │
│       ├── dashboard/
│       │   └── page.tsx
│       │
│       ├── analyses/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       │
│       ├── globals.css
│       └── layout.tsx
│
├── package.json
├── next.config.ts
├── tsconfig.json
└── README.md
Application Navigation

The main navigation contains:

CrowdSentinel AI
│
├── Video Processing
│
└── Live CCTV
Video Processing
/

Used for recorded video upload and analysis.

Live CCTV
/cctv

Used for real-time webcam or CCTV monitoring.

Installation
Prerequisites

Install:

Node.js
npm
Git
Install Dependencies

Open a terminal inside the frontend directory:

cd frontend

Install dependencies:

npm install
Development

Start the Next.js development server:

npm run dev

The application will normally be available at:

http://localhost:3000
Production Build

Create a production build:

npm run build

Start the production server:

npm start
Backend Requirement

The frontend communicates with the FastAPI backend.

The backend normally runs at:

http://localhost:8000

The Live CCTV page uses:

http://localhost:8000/api/live/status

for live metrics.

The live camera stream is received from:

http://localhost:8000/api/live/stream
Live CCTV Workflow
User selects camera source
        |
        +----------------------+
        |                      |
        v                      v
Computer Webcam          CCTV / IP Camera
    source=0                RTSP URL
        |                      |
        +----------+-----------+
                   |
                   v
             FastAPI Backend
                   |
                   v
              LiveProcessor
                   |
                   v
             Live AI Analysis
                   |
                   v
              Live Metrics
                   |
                   v
              Next.js UI
API Communication
Start Camera
POST /api/live/start

Example:

/api/live/start?source=0&camera_id=camera_1

For an RTSP source:

/api/live/start?source=<RTSP_URL>&camera_id=camera_1
Stop Camera
POST /api/live/stop
Live Status
GET /api/live/status

Example response:

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
    "bottleneck_reason": "Normal conditions",
    "risk_result": {}
  }
}
Live Stream
GET /api/live/stream

The backend provides the camera feed as an MJPEG stream.

The frontend displays it using the browser <img> element.

Current Live Camera Support

The application currently supports:

Computer Webcam
Source: 0
CCTV / IP Camera
Source: RTSP URL

The CCTV option is implemented and ready for an RTSP source.

A real CCTV camera has not been required for frontend development and testing.

Notes

The live CCTV processing pipeline is separate from the recorded-video processing pipeline.

The frontend only communicates with the live API and does not perform YOLO inference itself.

All AI processing is handled by the backend.

Troubleshooting
Backend not reachable

Make sure the FastAPI server is running:

http://localhost:8000
Live CCTV page shows Camera Offline

Check:

Backend is running
Camera source is valid
Webcam is available
RTSP URL is reachable when using a CCTV camera
Port 3000 already in use

Stop the process using port 3000 or start Next.js on another port.

Development Commands
npm install
npm run dev
npm run build
npm start
npm run lint
Frontend Architecture
Next.js
   |
   +-- Video Processing UI
   |
   +-- Live CCTV UI
            |
            v
       FastAPI Backend
            |
            v
       AI Processing
Project

CrowdSentinel AI

AI-powered early crowd-risk monitoring and decision-support system.


---

# `backend/README.md`

Create a new file:

```text
backend/README.md

with this:

# CrowdSentinel AI — Backend

FastAPI backend for **CrowdSentinel AI**, an AI-powered crowd monitoring and risk analysis system.

The backend handles:

- Video uploads
- Recorded-video analysis
- Live webcam processing
- Live CCTV / RTSP processing
- YOLOv8 person detection
- Multi-object tracking
- Crowd analytics
- Bottleneck detection
- Risk assessment
- PostgreSQL database operations
- REST APIs
- MJPEG live camera streaming

---

# Architecture

```text
                    CrowdSentinel AI Backend
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
      Recorded Video                      Live Camera
             |                         Webcam / RTSP
             v                                 |
      VideoProcessor                           v
             |                          LiveProcessor
             |                                 |
             +----------------+----------------+
                              |
                              v
                       YOLOv8 Detection
                              |
                              v
                       Person Detection
                              |
                              v
                       SimpleTracker
                              |
                              v
                       Crowd Analytics
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
          Density           Flow          Bottleneck
             |                |                |
             +----------------+----------------+
                              |
                              v
                         Risk Engine
                              |
                              v
                         FastAPI API
                              |
                              v
                         PostgreSQL
Technology Stack
Backend
Python
FastAPI
Uvicorn
SQLAlchemy
Pydantic
PostgreSQL
AsyncIO
Computer Vision
OpenCV
Ultralytics YOLOv8
NumPy
Processing
Custom SimpleTracker
Crowd density analysis
Crowd flow analysis
Bottleneck detection
Weighted risk calculation
Project Structure
backend/
│
├── ai/
│   ├── detection.py
│   ├── tracking.py
│   ├── analytics.py
│   ├── risk_engine.py
│   └── video_processor.py
│
├── api/
│   ├── live.py
│   ├── videos.py
│   └── analysis.py
│
├── live/
│   └── live_processor.py
│
├── models/
│   └── yolov8m.pt
│
├── uploads/
│
├── processed/
│
├── database.py
├── models.py
├── schemas.py
├── config.py
├── main.py
├── requirements.txt
└── README.md
AI Components
YOLOv8 Person Detection

The project uses Ultralytics YOLOv8 for person detection.

COCO person class:

Class ID: 0
Class: person

The live processing pipeline uses:

confidence_threshold = 0.50

The recorded-video configuration remains separate.

Tracking

The backend uses a custom:

SimpleTracker

The tracker maintains object identities across frames.

It is used for:

Track IDs
Movement tracking
People counting
Flow analysis
Unique track counts
Crowd Analytics

The analytics layer calculates:

People Count

Number of currently tracked people.

people_count
Crowd Density

Crowd density based on tracked objects and frame dimensions.

density
Flow Metrics

Movement-related statistics include:

flow_rate
avg_velocity
flow_consistency
movement_data_available
Bottleneck Detection

The system analyzes crowd density and movement information.

Example fields:

is_bottleneck
bottleneck_reason
Risk Engine

The risk engine combines crowd-related information to generate a risk result.

The result contains:

risk_score
risk_level
components

Example:

{
  "risk_score": 0.01,
  "risk_level": "safe"
}

Risk calculation considers factors including:

Density
Crowd flow
Movement velocity
Bottleneck conditions
People count
Recorded Video Pipeline

The existing recorded-video pipeline is implemented in:

ai/video_processor.py

The pipeline is:

Video Upload
     |
     v
OpenCV Video Reader
     |
     v
Frame Extraction
     |
     v
YOLOv8 Detection
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
Analysis Metrics
     |
     v
PostgreSQL
Live Camera Pipeline

Live processing is implemented separately in:

live/live_processor.py

The recorded-video processor is not used for live camera processing.

The live pipeline is:

Webcam / CCTV / RTSP
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
        +----> Flow
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
Live Camera Sources

The live processor accepts:

Webcam
source = 0
RTSP
source = rtsp://...

The implementation converts a numeric string such as:

"0"

to:

0

before passing it to OpenCV.

Other string sources can be used directly as OpenCV video sources.

Live API

The live API is implemented in:

api/live.py

The API prefix is:

/api/live
Start Live Camera
POST /api/live/start

Example:

/api/live/start?source=0&camera_id=camera_1

For CCTV:

/api/live/start?source=<RTSP_URL>&camera_id=camera_1

Example response:

{
  "status": "started",
  "camera_id": "camera_1",
  "source": "0",
  "message": "Live camera processing started"
}
Stop Live Camera
POST /api/live/stop

Example response:

{
  "status": "stopped",
  "message": "Live camera stopped"
}
Live Status
GET /api/live/status

Example:

{
  "camera_id": "camera_1",
  "running": true,
  "connected": true,
  "frame_number": 18,
  "unique_track_count": 3,
  "metrics": {
    "people_count": 1,
    "density": 0.004,
    "flow_metrics": {
      "flow_rate": 1,
      "avg_velocity": 8.27,
      "flow_consistency": 1,
      "movement_data_available": true
    },
    "is_bottleneck": false,
    "bottleneck_reason": "Normal conditions",
    "risk_result": {
      "risk_score": 0.01,
      "risk_level": "safe"
    }
  }
}
Live MJPEG Stream
GET /api/live/stream

The endpoint returns:

multipart/x-mixed-replace

The latest camera frame is encoded as JPEG and streamed to the frontend.

Video API

The video API is implemented in:

api/videos.py

Prefix:

/api/videos
Upload Video
POST /api/videos/upload

Supported formats are configured as:

mp4
avi
mov
mkv

Default maximum video size:

500 MB
List Videos
GET /api/videos/
Get Video
GET /api/videos/{video_id}
Delete Video
DELETE /api/videos/{video_id}
Stream Video
GET /api/videos/{video_id}/stream
Analysis API

The analysis API is implemented in:

api/analysis.py

Prefix:

/api/analysis

The API is responsible for starting and managing recorded-video analysis.

The recorded analysis uses:

VideoProcessor

and stores analysis metrics and alerts in PostgreSQL.

Database

The backend uses:

PostgreSQL

SQLAlchemy is used for database access.

The default configuration expects:

crowdflow_db

with:

username: crowdflow

and a configured PostgreSQL password.

Database configuration is stored in:

config.py

and can be overridden using environment variables.

Database Tables

The current SQLAlchemy models include:

videos
analyses
zones
alerts
analysis_metrics

The database is initialized during backend startup.

Configuration

Main configuration is defined in:

config.py

Important settings include:

database_url
database_url_sync
redis_url
yolo_model_path
yolo_confidence_threshold
yolo_iou_threshold
max_video_size_mb
supported_video_formats
upload_dir
processed_dir
frontend_url

Environment variables can be supplied through:

.env
Installation
Prerequisites

Install:

Python
PostgreSQL
Git

Make sure Python is available from the command line:

python --version
Create Virtual Environment

From the backend directory:

cd backend

Create a virtual environment:

python -m venv venv

Activate it on Windows:

venv\Scripts\activate
Install Dependencies
pip install -r requirements.txt
YOLO Model

The backend expects the YOLO model at:

backend/models/yolov8m.pt

The configured model path is:

models/yolov8m.pt

Make sure the model file is available before starting the backend.

PostgreSQL

Create/configure the PostgreSQL database used by the application.

The default application configuration points to:

localhost:5432

with database:

crowdflow_db

Update the database configuration in .env when required.

Example:

DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/crowdflow_db
DATABASE_URL_SYNC=postgresql://username:password@localhost:5432/crowdflow_db

Do not commit real database passwords to GitHub.

Running the Backend

Start the FastAPI application:

python main.py

or:

uvicorn main:app --host 0.0.0.0 --port 8000

The backend will be available at:

http://localhost:8000
FastAPI Documentation

Swagger UI:

http://localhost:8000/docs

ReDoc:

http://localhost:8000/redoc
Health Check

The backend provides:

GET /

and:

GET /health

The health endpoint reports the status of:

API
Database configuration
YOLO
Tracking
CORS

The backend allows the frontend development origins:

http://localhost:3000
http://localhost:3001

CORS is configured in:

main.py
Backend Processing Summary
                Input
                  |
          +-------+-------+
          |               |
       Video          Live Camera
          |               |
          v               v
   VideoProcessor    LiveProcessor
          |               |
          +-------+-------+
                  |
                  v
             YOLOv8
                  |
                  v
          Person Detection
                  |
                  v
            SimpleTracker
                  |
                  v
           Crowd Analytics
                  |
          +-------+-------+
          |       |       |
       Density   Flow   Bottleneck
          |       |       |
          +-------+-------+
                  |
                  v
             Risk Engine
                  |
                  v
            FastAPI APIs
                  |
          +-------+-------+
          |               |
          v               v
      PostgreSQL       Frontend
Development Notes

The project intentionally keeps the recorded-video and live-camera processing pipelines separate.

Recorded video
ai/video_processor.py
Live camera
live/live_processor.py

The live processor reuses the existing detection, tracking, analytics, and risk components.

This allows the live camera pipeline to support both:

Computer Webcam

and:

CCTV / IP Camera / RTSP

without changing the recorded-video processing pipeline.

Troubleshooting
Database initialization failed

Verify:

PostgreSQL is running
Database exists
Username/password are correct
DATABASE_URL is correct
YOLO model not found

Verify:

backend/models/yolov8m.pt

exists.

Webcam cannot be opened

Check:

Camera permissions
Another application is not using the webcam
Correct camera index

The default webcam source is:

0
RTSP stream cannot be opened

Check:

RTSP URL
Camera/NVR availability
Username/password
Network connectivity
RTSP port
Camera codec support
Firewall configuration

The backend reports an error when OpenCV cannot open the supplied source.

Main Entry Point

The backend application starts from:

main.py

Main responsibilities:

Create FastAPI application
Configure CORS
Initialize PostgreSQL database
Initialize YOLO detector
Register API routers
Provide health endpoints
Project

CrowdSentinel AI

AI-powered early crowd-risk monitoring and decision-support system for crowd monitoring, movement analysis, bottleneck detection, and risk assessment.


### One thing I would also change

Your root repository README currently contains a lot of the same information as the frontend README. Since you're specifically asking for separate folder documentation, a clean structure would be:

```text
Crowd_Management/
│
├── README.md              ← Project overview
│
├── backend/
│   └── README.md          ← Backend setup/API/AI
│
└── frontend/
    └── README.md          ← Frontend setup/UI