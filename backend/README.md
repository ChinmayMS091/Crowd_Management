# Crowd Management AI — Backend

This directory contains the backend application for **Crowd Management AI**.

The backend provides the API and AI processing pipeline for:

- Recorded video analysis
- Live webcam monitoring
- Live CCTV / IP camera monitoring
- Person detection
- Multi-object tracking
- Crowd analytics
- Bottleneck detection
- Crowd risk assessment
- Analysis and alert storage

---

## Tech Stack

- **Python**
- **FastAPI**
- **OpenCV**
- **Ultralytics YOLOv8**
- **SQLAlchemy**
- **PostgreSQL**
- **Pydantic**
- **NumPy**
- **Pillow**
- **Alembic**
- **WebSockets**

---

# Project Structure

```text
backend/
│
├── ai/
│   ├── analytics.py
│   ├── detection.py
│   ├── risk_engine.py
│   ├── tracking.py
│   └── video_processor.py
│
├── api/
│   ├── analysis.py
│   ├── live.py
│   └── videos.py
│
├── live/
│   └── live_processor.py
│
├── models/
│   └── yolov8m.pt
│
├── uploads/
├── processed/
│
├── config.py
├── database.py
├── main.py
├── models.py
├── requirements.txt
└── README.md
System Architecture

The backend follows the following processing pipeline:

                    ┌───────────────────┐
                    │  Video / Camera   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     OpenCV        │
                    │ Frame Capture     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     YOLOv8        │
                    │ Person Detection  │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │     Tracker       │
                    │ Track Persons     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Crowd Analytics   │
                    │ Density / Flow    │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Bottleneck        │
                    │ Analysis          │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   Risk Engine     │
                    │ Risk Assessment   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ FastAPI Backend   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ PostgreSQL /      │
                    │ Frontend          │
                    └───────────────────┘
AI Components
YOLOv8 Person Detection

The backend uses Ultralytics YOLOv8 for detecting people in video frames.

The configured model is:

models/yolov8m.pt

The detector focuses on the person class.

The detection component is implemented in:

ai/detection.py
Tracking

Person tracking is implemented in:

ai/tracking.py

The backend uses a custom:

SimpleTracker

The tracker associates detections across frames and maintains tracking IDs.

These IDs are used by the analytics system to calculate movement-related information.

Crowd Analytics

Crowd analytics is implemented in:

ai/analytics.py

The analytics component calculates information such as:

Number of people
Crowd density
Flow rate
Average velocity
Flow consistency
Bottleneck status
Risk Engine

Risk assessment is implemented in:

ai/risk_engine.py

The risk engine combines crowd-related metrics to calculate a risk result.

The result contains information such as:

{
  "risk_score": 0.01,
  "risk_level": "safe"
}

The risk calculation uses components related to:

Density
Flow
Velocity
Bottleneck conditions
Recorded Video Processing

Recorded video processing is handled by:

ai/video_processor.py

The recorded-video pipeline performs:

Video
  ↓
Frame Extraction
  ↓
YOLO Detection
  ↓
Tracking
  ↓
Crowd Analytics
  ↓
Bottleneck Analysis
  ↓
Risk Engine
  ↓
Analysis Results

The recorded video processor is separate from the live camera processor.

Live Camera Processing

Live camera processing is implemented separately in:

live/live_processor.py

The live processor reuses the existing AI components:

PersonDetector
SimpleTracker
CrowdAnalytics
RiskEngine

This allows webcam and CCTV processing to use the same detection and analysis logic without modifying the recorded-video pipeline.

Live Camera Sources

The live system supports two source types.

1. Computer Webcam

The default webcam source is:

0

Example:

source = 0

OpenCV uses this source to access the computer's webcam.

2. CCTV / IP Camera

The live processor can also receive an RTSP source.

Example:

rtsp://username:password@192.168.1.100:554/stream

The exact RTSP URL depends on the CCTV/IP camera configuration.

The backend passes the source to OpenCV for video capture.

Live Processing Flow
Computer Webcam
       │
       │
       ▼
     OpenCV
       │
       ▼
 LiveProcessor
       │
       ▼
   YOLOv8
       │
       ▼
 SimpleTracker
       │
       ▼
 CrowdAnalytics
       │
       ▼
  RiskEngine
       │
       ▼
 Live Metrics
       │
       ├──────────────► /api/live/status
       │
       └──────────────► /api/live/stream

The same flow can be used with an RTSP CCTV source.

API

The backend is built using FastAPI.

Main application file:

main.py
Live API Endpoints
Start Live Processing
POST /api/live/start

Parameters:

source
camera_id

Example:

/api/live/start?source=0&camera_id=camera_1

For an RTSP camera:

/api/live/start?source=<RTSP_URL>&camera_id=camera_1
Live Status
GET /api/live/status

Returns the current live processing status and metrics.

Example response:

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
    "bottleneck_reason": "Normal conditions"
  }
}
Live Video Stream
GET /api/live/stream

The endpoint provides the live camera stream as an MJPEG stream.

The frontend displays this stream on the Live CCTV page.

Stop Live Processing
POST /api/live/stop

Stops the active live camera processing task.

Video API

Recorded video operations are implemented in:

api/videos.py

The API supports operations such as:

Uploading videos
Listing videos
Retrieving video information
Deleting videos
Streaming uploaded videos
Analysis API

Analysis endpoints are implemented in:

api/analysis.py

The analysis API starts and manages recorded-video processing.

The recorded video is processed using:

VideoProcessor

Analysis results and metrics are stored in the database.

Database

Database functionality is implemented using:

database.py

The backend uses:

SQLAlchemy
PostgreSQL

The database initialization creates the required application tables.

Database models are defined in:

models.py

Current model groups include:

Videos
Analyses
Zones
Alerts
Analysis Metrics
Configuration

Backend configuration is handled by:

config.py

Configuration includes settings related to:

Database connection
YOLO model
Detection confidence
IoU threshold
Upload directory
Processed video directory
Application settings

The backend configuration supports environment-based configuration through the project's settings system.

Requirements

Backend dependencies are listed in:

requirements.txt

Main dependencies include:

FastAPI
Uvicorn
Pydantic
SQLAlchemy
OpenCV
Ultralytics
NumPy
Pillow
Alembic
Redis
WebSockets
Installation
1. Navigate to Backend
cd backend
2. Create Virtual Environment

Windows:

python -m venv venv

Activate it:

venv\Scripts\activate

Linux/macOS:

python3 -m venv venv
source venv/bin/activate
3. Install Dependencies
pip install -r requirements.txt
YOLO Model

The backend expects the YOLO model at:

models/yolov8m.pt

Make sure the model file exists before starting the backend.

The configured model is loaded when the application starts.

Running the Backend

From the backend directory:

uvicorn main:app --reload

The API will normally be available at:

http://localhost:8000

FastAPI documentation is available at:

http://localhost:8000/docs

The alternative ReDoc documentation is available at:

http://localhost:8000/redoc
Health Check

The backend provides a health endpoint:

GET /health

Use it to verify that the FastAPI application is running.

Connecting the Frontend

The frontend runs separately from the backend.

Typical local setup:

Frontend
http://localhost:3000

        │
        │ HTTP API
        ▼

Backend
http://localhost:8000

The backend provides the APIs consumed by the Next.js frontend.

CORS

The FastAPI application is configured to allow requests from the local frontend development servers.

The configured development origins include:

http://localhost:3000
http://localhost:3001
Recorded Video vs Live Processing

The backend contains two separate processing paths.

Recorded Video
ai/video_processor.py

Used for uploaded/recorded videos.

Live Camera
live/live_processor.py

Used for webcam and CCTV/IP camera streams.

The live pipeline reuses the AI components without changing the recorded-video processor.

Important Backend Files
File	Purpose
main.py	FastAPI application entry point
config.py	Application configuration
database.py	Database connection and initialization
models.py	SQLAlchemy database models
ai/detection.py	YOLO person detection
ai/tracking.py	Person tracking
ai/analytics.py	Crowd analytics
ai/risk_engine.py	Crowd risk calculation
ai/video_processor.py	Recorded video processing
live/live_processor.py	Live webcam/CCTV processing
api/live.py	Live camera API
api/videos.py	Video API
api/analysis.py	Analysis API
requirements.txt	Python dependencies
models/yolov8m.pt	YOLOv8 model
Troubleshooting
Backend Does Not Start

Check that the virtual environment is active:

venv\Scripts\activate

Then install the dependencies:

pip install -r requirements.txt

Start the server:

uvicorn main:app --reload
YOLO Model Not Found

Verify that:

models/yolov8m.pt

exists inside the backend directory.

Webcam Does Not Start

Check:

The webcam is connected.
Another application is not using the webcam.
The backend has access to the camera.
The source is set to 0.
The backend is running.
CCTV / RTSP Does Not Connect

Check:

RTSP URL
Camera IP address
Username and password
RTSP port
Network connectivity
Camera stream configuration
Camera-supported video codec

The backend uses OpenCV to open the camera stream, so the RTSP source must be accessible from the machine running the backend.

Database Connection Problems

Check:

Database server is running.
Database configuration is correct.
Required database exists.
Database credentials are correct.
The backend environment contains the required database configuration.
Development

The backend can be developed independently from the frontend.

Recommended development setup:

Terminal 1
──────────
Backend

cd backend
uvicorn main:app --reload


Terminal 2
──────────
Frontend

cd frontend
npm run dev

Then open:

http://localhost:3000
Backend Responsibilities

The backend is responsible for:

Receiving uploaded videos
Receiving live camera sources
Capturing frames with OpenCV
Detecting people with YOLOv8
Tracking people across frames
Calculating crowd metrics
Detecting bottleneck conditions
Calculating risk
Providing live metrics through APIs
Providing the live MJPEG stream
Processing recorded videos
Storing application data in PostgreSQL
Serving APIs to the frontend
