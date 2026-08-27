# 🚨 CrowdSentinel AI

<div align="center">

**AI-powered early crowd-risk monitoring and decision-support system.**  
*Developed for the Smart India Hackathon (SIH) 2026 (Problem Statement ID: SIH26AI006)*

[![Python](https://img.shields.io/badge/Python-3.12%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![YOLOv8](https://img.shields.io/badge/YOLO-v8n-FF6F00?logo=ultralytics&logoColor=white)](https://github.com/ultralytics/ultralytics)
[![License](https://img.shields.io/badge/License-SIH_2026-green)](LICENSE)

[**Explore API**](#api-endpoints) • [**Setup Guide**](#installation) • [**System Architecture**](#architecture)

</div>

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [Tech Stack](#-tech-stack)
4. [Project Structure](#-project-structure)
5. [Installation](#-installation)
6. [Core Capabilities (Phases 1-12)](#-core-capabilities-phases-1-12-implemented)
7. [Risk Metrics & Alerts](#-risk-metrics--alerts)
8. [Dynamic Integration Verification](#-real-video-integration-verification)
9. [Development Notes](#-development-notes)

---

## 🔍 Overview

**CrowdSentinel AI** is a state-of-the-art surveillance analytics platform designed to solve the critical challenges of crowd control, congestion bottlenecks, and stampede prevention. By processing live video feeds, the system detects crowd density, measures flow velocity, isolates bottlenecks, and calculates a dynamic risk index using real-time machine learning inference.

### Key Objectives
* 🚶 **Automated Detection:** Localize and count individuals in complex, high-occupancy video scenes.
* 📈 **Risk Calculation:** Compute real-time crowd dynamics based on density and velocity metrics.
* ⚠️ **Proactive Alerts:** Auto-generate and log warning notifications before safety thresholds are breached.
* 📊 **SIH-Ready Visualizations:** View interactive dashboards, historical charts, and synced video replays.

---

## 🏗️ Architecture

```
                  ┌──────────────────────────────┐
                  │   Real-Time Video Stream     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    FastAPI Video Processor   │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│   YOLOv8 Class  │                             │   ByteTrack IoU │
│ Person Detector │                             │  Multi-Tracker  │
└────────┬────────┘                             └────────┬────────┘
         │                                               │
         └───────────────────────┬───────────────────────┘
                                 ▼
                  ┌──────────────────────────────┐
                  │    Crowd Analytics Engine    │
                  │  (Density, Velocity & Flow)  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │      Bottleneck Analyzer     │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Weighted Risk Engine      │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │     Alert Logger & API       │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │  Next.js 15 Web Dashboard    │
                  │  (Recharts & Video Player)   │
                  └──────────────────────────────┘
```

---

## 💻 Tech Stack

### Frontend Hub
* **Next.js 15 (App Router)** - Server-side rendering, layout management, and optimization.
* **TypeScript** - Strict typings for data structure consistency.
* **Tailwind CSS** - Modern styling and responsive utility classes.
* **Recharts** - Fully responsive SVG charts (Risk areas, density lines, velocity profiles).

### Analytics Backend
* **FastAPI** - Ultra-fast, async Python web API framework.
* **SQLAlchemy 2.0 (Async)** - Non-blocking database transactions.
* **PostgreSQL / SQLite** - Multi-environment schema configuration.
* **Ultralytics YOLOv8** - State-of-the-art person object detection models.
* **OpenCV & NumPy** - Video frame manipulations and spatial array computations.

---

## 📁 Project Structure

```
Crowd-Management-and-Stampede-protection/
├── frontend/                     # Next.js 15 App
│   ├── src/app/
│   │   ├── page.tsx             # Home: Video uploader & Progress UI
│   │   ├── analyses/            # Historical Analysis list & reports
│   │   ├── dashboard/           # SIH-Quality Analytics dashboard view
│   │   └── layout.tsx           # Global HTML/styles template
│   └── package.json             # Node dependencies (Next, React, Recharts)
├── backend/                      # Python FastAPI App
│   ├── ai/                      # Computer Vision Pipeline
│   │   ├── detection.py         # YOLO person localized detection
│   │   ├── tracking.py          # Temporal object trajectory matching
│   │   ├── analytics.py         # Density & crowd movement consistency
│   │   ├── risk_engine.py       # Rule-based threat index compiler
│   │   └── video_processor.py   # Stream frame coordinator
│   ├── api/                     # API Routes
│   │   ├── videos.py            # Video storage, deletion & streaming
│   │   └── analysis.py          # Analytics status, charts, alert ack
│   ├── main.py                  # Entry server script
│   ├── requirements.txt         # Python package list
│   └── .env.example             # Config template
└── README.md
```

---

## 🚀 Installation

### 1. Backend Service Setup
```bash
# Enter backend folder
cd backend

# Establish python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your config file
cp .env.example .env

# Initialize database schemas
python init_db.py

# Run development server
python main.py
```
*API Docs will serve at: `http://localhost:8000/docs`*

### 2. Frontend Dashboard Setup
```bash
# Enter frontend folder
cd ../frontend

# Install node dependencies
npm install

# Boot development environment
npm run dev
```
*Web dashboard opens at: `http://localhost:3000`*

---

## ⚡ Core Capabilities (Phases 1-12 Implemented)

* 💾 **Phase 1: DB Scheme** - Async engine managing database records for videos, historical analysis runs, and generated alerts.
* 👁️ **Phase 2: Person Detection** - Precise COCO `person` extraction powered by pre-loaded YOLO models.
* 📍 **Phase 3: Trajectory Tracking** - Keeps persistent target IDs across frame segments to track movement trajectories.
* 👥 **Phase 4: People Counter** - Precise count of active targets in the monitored space.
* 📏 **Phase 5: Density Analysis** - Normalized area density scoring computed from spatial bounding boxes.
* 🌀 **Phase 6: Flow & Velocity** - Track directional consistency, velocity vector coordinates, and frame flow rate.
* 🚧 **Phase 7: Bottleneck Isolation** - Instant warning when spatial density peaks while flow speed decelerates below safety thresholds.
* 🎛️ **Phase 8: Weighted Risk Engine** - Computes a threat index (0-100) combining density, flow directionality, and bottlenecks.
* ⏱️ **Phase 9: Interactive Upload UX** - Live upload progress bars, cancel hooks, retry mechanisms, and processing stats.
* 📈 **Phase 10: Real-Time Dashboard** - View aggregated stats (Max Count, Avg Density, Peak Risk) for any video.
* 🖥️ **Phase 11: Synced Video Player** - Video player synced with a timeline displaying frame-by-frame stats, bottleneck alerts, and active risks.
* 📊 **Phase 12: Recharts Visualizations** - Interactive area and line charts plotting risk, velocity, and density trends over time.

---

## 🚨 Risk Metrics & Alerts

The system categorizes risk levels dynamically using a 0–100 scale:

| Score Range | Severity | Description / Action | Indicator |
|---|---|---|:---:|
| **0 – 30** | `SAFE` | Normal conditions; standard traffic | 🟢 |
| **31 – 55** | `WARNING` | Elevated crowd presence; monitor density | 🟡 |
| **56 – 75** | `HIGH` | Highly congested; restrict entries | 🟠 |
| **76 – 100** | `CRITICAL` | Imminent danger; trigger evacuation alarms | 🔴 |

### Alert Acknowledgment Flow
The dashboard displays critical alerts generated by the pipeline. Security operators can click **Acknowledge** in the UI, which calls the backend PUT API to flag the threat as handled, providing clear audits for incident response management.

---

## 🔬 Real-Video Integration Verification

We validated the pipeline on a real crowd video (`test_video_people.mp4`, 116.55s, 1280x720 @ 29.97 FPS). 

### Verdict: 🟢 PASS

```
VERIFICATION CHECKS:
  ✅ PASS: YOLO detections > 0 (Detections: 99)
  ✅ PASS: Tracking IDs generated (IDs: 1 to 20)
  ✅ PASS: People counted (Average: 9.90 / frame)
  ✅ PASS: Density calculated (Average: 0.9034)
  ✅ PASS: Flow/velocity calculated (Real movement detected)
  ✅ PASS: Risk scores produced (Average: 71.27)
  ✅ PASS: Risk levels assigned (High & Critical threats isolated)
```

---

## 💡 Development Notes

* **No Mocks:** All metrics are calculated live from model inference and tracking trajectories.
* **Efficient Frame Sampling:** Set `FRAME_EXTRACTION_FPS` in `.env` to sample frames (e.g., skip 30 frames for 1 FPS processing) to achieve real-time throughput on standard CPUs.
* **Disclaimer:** Developed for educational and demonstration purposes as a Smart India Hackathon prototype. Always deploy with redundant safety systems.