# CrowdSentinel AI — Frontend

This directory contains the frontend application for **CrowdSentinel AI**, a crowd monitoring and analysis system.

The frontend is built with **Next.js, React, TypeScript, Tailwind CSS, and Recharts**. It provides the user interface for video processing, analysis results, and live CCTV/webcam monitoring.

---

## Tech Stack

- **Next.js** 16
- **React** 19
- **TypeScript**
- **Tailwind CSS**
- **Recharts**
- **ESLint**

---

## Project Structure

```text
frontend/
├── public/
│
├── src/
│   └── app/
│       ├── analyses/
│       │   ├── [id]/
│       │   │   └── page.tsx
│       │   └── page.tsx
│       │
│       ├── dashboard/
│       │   └── page.tsx
│       │
│       ├── cctv/
│       │   └── page.tsx
│       │
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
│
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
Main Pages
Video Processing

Route:

/

The main page provides the interface for uploading and processing recorded videos.

The frontend communicates with the backend API to:

Upload videos
Start video analysis
Access analysis results
View processed information
Live CCTV Monitoring

Route:

/cctv

The Live CCTV page provides real-time monitoring.

It supports two input sources:

Live CCTV Monitoring
│
├── Computer Webcam
│     └── Source: 0
│
└── CCTV / IP Camera
      └── Source: RTSP URL
Computer Webcam

The computer webcam uses:

source = 0

The frontend sends the request to the backend to start live processing.

CCTV / IP Camera

For an IP camera or CCTV system, the frontend accepts an RTSP URL.

Example format:

rtsp://username:password@camera-ip:port/stream

The actual RTSP URL depends on the camera manufacturer and configuration.

Live Monitoring Metrics

The CCTV page displays live information received from the backend.

Current metrics include:

People Count
Crowd Density
Flow Rate
Average Velocity
Risk Score
Risk Level
Bottleneck Status

The frontend periodically requests the live status from:

GET /api/live/status
Live Video Feed

The live camera feed is displayed using the backend MJPEG stream:

GET /api/live/stream

The frontend uses:

<img
  src="http://localhost:8000/api/live/stream"
  alt="Live Camera Feed"
/>

This allows the browser to display the processed live camera stream.

Backend Connection

The frontend currently communicates with the backend running at:

http://localhost:8000

Examples of backend endpoints used by the frontend:

GET  /api/live/status
GET  /api/live/stream
POST /api/live/start
POST /api/live/stop

The backend must be running for live monitoring and video processing features to work.

Installation
Prerequisites

Make sure the following are installed:

Node.js
npm
Backend server

You can check Node.js and npm using:

node --version
npm --version
Setup

Navigate to the frontend directory:

cd frontend

Install dependencies:

npm install
Run the Development Server

Start the Next.js development server:

npm run dev

The frontend will normally be available at:

http://localhost:3000

Open the address in your browser.

Production Build

To create a production build:

npm run build

To start the production server:

npm start
Development Workflow

For local development, run both the backend and frontend.

Terminal 1 — Backend

From the backend directory, start the FastAPI server.

The backend normally runs on:

http://localhost:8000
Terminal 2 — Frontend

From the frontend directory:

npm run dev

The frontend normally runs on:

http://localhost:3000
Live Webcam Usage
Start the backend.
Start the frontend.
Open:
http://localhost:3000/cctv
Select:
Computer Webcam
Enter a camera ID if required.
Click the start button.
Allow browser/camera access if requested.

The frontend sends:

source = 0

to the backend.

The backend then processes the webcam stream using its live processing pipeline.

Live CCTV / RTSP Usage

When an RTSP-enabled CCTV/IP camera is available:

Open the Live CCTV page.
Select:
CCTV / IP Camera
Enter the camera's RTSP URL.
Enter the camera ID.
Start the camera.

The frontend sends the RTSP source to the backend.

Example:

rtsp://username:password@192.168.1.100:554/stream

The exact URL depends on the CCTV/IP camera configuration.

Navigation

The application currently provides navigation for:

CrowdSentinel AI

├── Video Processing
│
└── Live CCTV

The navigation is implemented in:

src/app/layout.tsx
Styling

Global styling is defined in:

src/app/globals.css

The application uses Tailwind CSS for UI styling.

Charts

The frontend uses Recharts for displaying chart-based analysis information.

Recharts is included in the frontend dependencies and can be used for visualizing analysis metrics.

API Communication

The frontend communicates with the FastAPI backend using standard HTTP requests.

Example:

fetch("http://localhost:8000/api/live/status")

For starting live processing:

fetch(
  `http://localhost:8000/api/live/start?source=${source}&camera_id=${cameraId}`,
  {
    method: "POST",
  }
);
Troubleshooting
Frontend does not start

Make sure dependencies are installed:

npm install

Then run:

npm run dev
Backend connection error

If the frontend cannot communicate with the backend, make sure the FastAPI server is running on:

http://localhost:8000

You can check the backend health endpoint:

http://localhost:8000/health
Live camera does not start

Check:

Backend is running.
The selected camera source is correct.
Browser camera permissions are allowed for webcam usage.
The RTSP URL is correct when using an IP camera.
The camera is accessible from the machine running the backend.
Live stream is not displayed

Check:

http://localhost:8000/api/live/stream

The backend must have an active live camera stream.

Also verify that the backend live processing has been started from the Live CCTV page.

RTSP Camera Issues

RTSP connectivity can depend on:

Camera configuration
Username/password
IP address
RTSP port
Network connectivity
Stream URL
Camera-supported codec

The frontend only provides the RTSP source to the backend. The actual RTSP connection and video processing are handled by the backend.

Important Files
File	Purpose
src/app/page.tsx	Video processing interface
src/app/cctv/page.tsx	Live webcam/CCTV monitoring interface
src/app/dashboard/page.tsx	Analysis dashboard
src/app/analyses/page.tsx	Analysis listing
src/app/analyses/[id]/page.tsx	Individual analysis view
src/app/layout.tsx	Application layout and navigation
src/app/globals.css	Global styling
package.json	Frontend dependencies and scripts
next.config.ts	Next.js configuration
tsconfig.json	TypeScript configuration
Frontend Responsibilities

The frontend is responsible for:

Providing the user interface
Video upload interaction
Starting and stopping live monitoring
Selecting webcam or CCTV/IP camera
Sending camera source information to the backend
Displaying the live camera stream
Polling live status
Displaying crowd metrics
Displaying analysis information
Providing navigation between application sections

The AI detection, tracking, crowd analytics, risk calculation, and video processing are handled by the backend.