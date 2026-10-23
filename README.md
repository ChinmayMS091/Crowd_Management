# Crowd Management and Stampede Prevention
**Repository:** [ChinmayMS091/Crowd_Management](https://github.com/ChinmayMS091/Crowd_Management)
> **Safety note:** This academic/demo system provides decision-support indicators. It is not a certified stampede-prediction system and does not replace trained security personnel, safety planning, or emergency procedures.
## Overview
Crowd Management and Stampede Prevention is a full-stack application for analyzing crowd conditions from recorded videos and live cameras. It combines a Next.js frontend, a FastAPI backend, PostgreSQL storage, computer-vision processing, sensor history, short-term forecasts, and role-based team messaging.
Recorded-video analysis and live CCTV analysis use separate processing paths. Both use person detection, tracking, crowd analytics, and risk assessment. The forecasting module is separate: it predicts counts from historical sensor time series, not directly from video pixels.
## Features
### Recorded Video Analysis
- Upload videos, track analysis status/progress, process frames through detection and crowd-risk analytics, store summaries/frame metrics, and review the source video on the analysis details page when available.
### Live CCTV Monitoring
- Monitor a webcam (source `0`) or RTSP camera; maintain per-camera processor state; stream MJPEG; view connection, tracking, and crowd metrics; start/stop processors.
### Crowd Analytics
- YOLO person detection, `SimpleTracker` association, current tracked-person counts, density/flow measurements, bottleneck checks, and risk score/level generation.
### Historical Data and Forecasting
- Browse sensors and history by date, retrieve hourly forecasts, derive crowd-level/future-risk labels, and inspect evaluation metadata.
### Authentication and Communication
- JWT login and role checks for `owner`, `security_head`, and `security_guard`; authorized messaging channels; message history and logout/session cleanup.
## Architecture
```text
Next.js / React frontend
        | REST + JWT / MJPEG
        v
FastAPI backend (auth, video, live, history, prediction, messaging)
        |                         |
        v                         v
OpenCV + YOLO + tracker      PostgreSQL
        |                     users, videos,
        v                     analyses, history,
Crowd analytics + risk       predictions, messages
```
## Technology Stack
| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| UI and charts | Tailwind CSS, Recharts |
| Backend | Python, FastAPI, Uvicorn |
| Validation/settings | Pydantic, Pydantic Settings |
| Database | PostgreSQL, SQLAlchemy, asyncpg, psycopg2 |
| Authentication | python-jose JWT, Passlib/bcrypt |
| Vision | OpenCV, NumPy, Ultralytics YOLO |
| Forecasting | XGBoost, Pandas, scikit-learn metrics |
## Repository Structure
```text
Crowd_Management/
├── README.md
├── backend/
│   ├── main.py, config.py, database.py, models.py, schemas.py
│   ├── auth_dependencies.py, create_users.py, requirements.txt
│   ├── api/ (auth, videos, analysis, live, history, predictions, communication)
│   ├── ai/ (detection, shared_detector, tracking, analytics, risk_engine, video_processor)
│   ├── live/live_processor.py
│   └── prediction/ (features, split_data, train_model, predict, save_predictions, dataset_importer)
├── datasets/
└── frontend/
    ├── package.json
    └── src/app/ (login, dashboard, cctv, videoprocessing, analyses, predictions, communication)
```
## Prerequisites
- Python 3.11 is a suitable starting environment for the project's machine-learning dependencies.; Node.js and npm compatible with the installed Next.js version.; PostgreSQL with an application database and role.; Git and access to the project repository.; YOLO weights available at the configured model path.; A webcam or reachable RTSP camera for live-stream testing.; Adequate CPU/GPU memory for the selected model and input resolution.
## Configuration
Backend settings are loaded through Pydantic Settings in `backend/config.py`. The repository contains `backend/.env.example`; compare it with the Python defaults because examples and code defaults may differ.
Create `backend/.env` locally. Configure the database URLs, JWT secret, and model path. Do not commit the real `.env` file.
Example configuration shape; replace every placeholder with values from your own environment:
```dotenv
DATABASE_URL=postgresql+asyncpg://<user>:<password>@localhost:5432/<database>
DATABASE_URL_SYNC=postgresql://<user>:<password>@localhost:5432/<database>
SECRET_KEY=<long-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
YOLO_MODEL_PATH=models/yolov8m.pt
YOLO_CONFIDENCE_THRESHOLD=0.10
YOLO_IOU_THRESHOLD=0.50
MAX_VIDEO_SIZE_MB=500
SUPPORTED_VIDEO_FORMATS=mp4,avi,mov,mkv
UPLOAD_DIR=uploads
PROCESSED_DIR=processed
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379/0
```
Environment settings can override defaults. Check the exact setting names in `config.py` if a value does not take effect.
**Security warning:** Some source files contain development database fallback credentials or inline connection settings used by history/prediction scripts. Replace these with environment-based configuration, rotate credentials already exposed in public version control, and never use a sample JWT secret in production.
## Database Setup
The SQLAlchemy models define the application tables for video uploads, analyses, zones, alerts, per-frame metrics, users, and messages. FastAPI calls `init_db()` during startup to create the SQLAlchemy-managed tables if absent.
The history/prediction workflows also expect dataset tables such as `prediction_sensors`, `crowd_history`, and `crowd_predictions`. Confirm these exist and have the required columns/unique constraints before importing data.
| Table / group | Purpose |
|---|---|
| `videos` | Uploaded file metadata and status |
| `analyses` | Analysis status, summary counts, and aggregate metrics |
| `analysis_metrics` | Per-frame counts, density, flow, and risk values |
| `zones` / `alerts` | Analysis zones and risk alerts |
| `users` / `messages` | User identity, role, and channel messages |
| `prediction_sensors` | Sensor IDs, codes, and location metadata |
| `crowd_history` | Historical or periodically saved crowd counts |
| `crowd_predictions` | Forecast counts by sensor and timestamp |
Do not assume `create_all()` creates every dataset-specific table. Check the database schema and the importer's requirements.
## Step-by-Step: Run the Project Locally
Follow these steps in order on Windows. Keep the backend and frontend running in separate terminals.
### Step 1 — Install prerequisites
Install Python 3.11, Node.js/npm, PostgreSQL, and Git; verify versions with `python --version`, `node --version`, and `npm --version`.
### Step 2 — Clone the repository
```powershell
git clone https://github.com/ChinmayMS091/Crowd_Management.git
cd Crowd_Management
```
If already cloned, open PowerShell in the existing project folder.
### Step 3 — Create the PostgreSQL database
Open pgAdmin or `psql`, create a database and user, and grant the user access. Example SQL (choose your own strong password):
```sql
CREATE USER crowdflow WITH PASSWORD 'replace_with_a_strong_password';
CREATE DATABASE crowdflow_db OWNER crowdflow;
```
Use the same database name, username, and password in both database URLs below. If you already have a configured database, do not recreate it.
### Step 4 — Configure backend environment variables
```powershell
cd backend
Copy-Item .env.example .env
```
Edit `backend/.env`: set `DATABASE_URL=postgresql+asyncpg://crowdflow:<password>@localhost:5432/crowdflow_db` and `DATABASE_URL_SYNC=postgresql://crowdflow:<password>@localhost:5432/crowdflow_db`; replace placeholders, set a strong `SECRET_KEY`, and verify `YOLO_MODEL_PATH`. Check `config.py` because defaults and `.env.example` may differ.
### Step 5 — Create the Python environment
Run from the `backend` directory:
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```
If PowerShell blocks activation, follow your machine's execution policy or activate the environment through your IDE. Ensure the terminal prompt shows the environment is active.
### Step 6 — Check the YOLO model
Verify that the configured weights file exists (for example, `backend/models/yolov8m.pt`); a code reference does not guarantee the model file is present.
### Step 7 — Start the backend API
```powershell
uvicorn main:app --reload
```
Run inside `backend`. Startup initializes SQLAlchemy-managed tables and loads YOLO weights; keep this terminal open and resolve startup errors before continuing.
### Step 8 — Verify the backend
Open `http://localhost:8000/health` and `http://localhost:8000/docs`; check terminal logs for database/model errors.
### Step 9 — Create login accounts
In a second terminal, navigate to your local `backend` folder and activate its environment:
```powershell
cd path\to\Crowd_Management\backend
.venv\Scripts\Activate.ps1
python create_users.py
```
Set passwords (at least 12 characters) when prompted for `owner@gmail.com`, `head@gmail.com`, and `guard@gmail.com`. These are account email addresses, not preset passwords; existing users are skipped.
### Step 10 — Install and start the frontend
In a third terminal from the project root:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`; keep this terminal open and ensure backend URLs use port `8000`.
### Step 11 — Sign in and test the main flows
Sign in; test the dashboard, small MP4 upload/analysis, analysis details, webcam source `0` or RTSP CCTV, history/predictions, and messaging permissions across roles.
### Step 12 — Check dataset-backed prediction tables
Startup may not create `prediction_sensors`, `crowd_history`, or `crowd_predictions`. History/forecast pages need these tables and data; inspect importer paths, schemas, and database settings before running dataset scripts.
### Stop the project
Press `Ctrl+C` in the frontend terminal and the backend terminal. Stop PostgreSQL separately only if you no longer need it for other applications.
### Production build (optional)
From `frontend`, run `npm run build` and then `npm start`. Do not use the development server as a production deployment strategy.
## Frontend Pages
| Path | Purpose |
|---|---|
| `/` | Landing / primary application page |
| `/login` | Login form |
| `/dashboard` | Crowd-management dashboard |
| `/cctv` | Live camera monitoring |
| `/videoprocessing` | Recorded-video upload and analysis |
| `/analyses` | Analysis history/list |
| `/analyses/[id]` | Analysis details and source video when available |
| `/predictions` | Sensor forecasts and crowd-risk display |
| `/communication` | Role-authorized team messaging |
`AuthGuard` checks local session state and role for protected frontend pages. Backend authorization remains necessary for every protected API.
## API Overview
The backend is served at `http://localhost:8000` by default. Use `/docs` for the current schemas, request bodies, and query parameters.
### Service and authentication
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Basic service status |
| `GET` | `/health` | Backend component status |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT |
| `GET` | `/api/auth/me` | Read current user's profile |
### Videos and analysis
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/videos/upload` | Upload a supported video |
| `GET` | `/api/videos/` | List uploads |
| `GET` | `/api/videos/{video_id}` | Read video details/status |
| `GET` | `/api/videos/{video_id}/stream` | Return the uploaded source video |
| `POST` | `/api/analysis/start` | Start analysis on an uploaded video |
| `GET` | `/api/analysis/{analysis_id}` | Read analysis details and progress |
The video and analysis routers currently require the `owner` or `security_head` role.
### Live cameras
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/live/start` | Start a camera processor |
| `POST` | `/api/live/stop/{camera_id}` | Stop a camera processor |
| `GET` | `/api/live/status` | Read active processor status and metrics |
| `GET` | `/api/live/stream/{camera_id}` | Stream frames as MJPEG |
Live routes currently restrict access to owners and security heads. Webcam source is usually `0`; an IP camera source is supplied as an RTSP URL. Do not publish URLs containing camera credentials.
### History and predictions
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/history/sensors` | List sensors for history |
| `GET` | `/api/history` | Retrieve counts by sensor and date |
| `GET` | `/api/history/available-dates` | List available history dates |
| `GET` | `/api/predictions/sensors` | List prediction sensors |
| `GET` | `/api/predictions/dates` | List dates for a sensor |
| `GET` | `/api/predictions` | Retrieve predictions by sensor/date |
| `GET` | `/api/predictions/forecast` | Retrieve forecast horizon |
| `GET` | `/api/predictions/evaluation` | Return model-evaluation metadata |
The prediction router restricts access to owners and security heads. Use valid IDs and dates returned from the API rather than hard-coding them.
### Communication
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/communication/messages?channel=owner_head` | Read an authorized channel |
| `POST` | `/api/communication/messages` | Send a message to an authorized channel |
The backend validates channel permissions. Message content must be non-empty; the frontend refreshes the channel history periodically.
## Computer Vision Pipeline
The primary vision modules are under `backend/ai/`.
1. **Frame capture:** OpenCV reads an uploaded video, webcam, or RTSP stream.
2. **Person detection:** YOLO weights detect the person class.
3. **Tracking:** `SimpleTracker` associates detections and maintains track IDs.
4. **Counting:** The pipeline estimates a current count from active tracks.
5. **Density:** `CrowdAnalytics` derives density-related metrics from the frame and tracks.
6. **Flow:** Movement metrics are calculated where tracking history is available.
7. **Bottleneck detection:** Density and flow measurements are evaluated for possible bottlenecks.
8. **Risk assessment:** `RiskEngine` combines selected measurements into a risk score/level.
9. **Persistence:** Recorded summaries/frame metrics are stored; live counts are periodically saved to history.
Recorded processing uses `VideoProcessor`; live monitoring uses `LiveProcessor`. Both accept `detection_interval`. With a value of `5`, YOLO runs every fifth frame while intermediate frames are handled by the tracker. This reduces detector work but can affect tracking/count accuracy.
Counts are estimates, not ground truth. Occlusion, perspective, distance, lighting, blur, confidence thresholds, and camera placement all affect results. Validate against representative labeled video before operational use.
## Forecasting Pipeline
### Feature engineering
Features include sensor identifier, calendar values (hour/weekday/day/month), lagged counts, count-change variables, and short/daily/weekly rolling means. Rows with insufficient preceding history are dropped because lag/rolling features cannot be calculated.
### Training and evaluation
`train_model.py` builds features, splits each sensor's ordered records chronologically, trains XGBoost, and reports MAE, RMSE, and R². The implementation uses 70% training, 15% validation, and 15% test records per sensor.
The evaluation route currently returns configured values: MAE `67.97`, RMSE `148.52`, R² `0.9691`, `468213` test samples, and `66` sensors. These are static values in the route response, not proof the model was retrained against your current database. Run training/evaluation again when the dataset or model changes.
### Forecast generation
Forecast generation creates recursive hourly predictions per sensor using a saved model and recent history. The forecast begins one hour after the latest available observation. Results depend on adequate history, correct sensor mapping, and consistent time-zone handling.
To test a forecast, call `/api/predictions/sensors`, choose a returned ID, call `/api/predictions/dates?sensor_id=<id>`, then use a returned date with `/api/predictions/forecast`. Verify the response contains rows and expected timestamps.
## Live History Recording
`LiveProcessor.save_crowd_history()` writes current crowd counts to `crowd_history` using the synchronous PostgreSQL connection. The source is labeled `live_cctv`; an hourly timestamp bucket and upsert on `(sensor_id, timestamp)` are used.
This upsert updates a row for that sensor/hour instead of appending each frame. The stored value is not an hourly average or maximum unless additional aggregation is added. Verify the camera's sensor ID exists in `prediction_sensors` and refers to the correct location.
The dataset importer also writes to `crowd_history` with a dataset-source label. Keep imported historical records distinguishable from live camera readings when debugging or training forecasts.
## Authentication and Roles
Login is implemented in `backend/api/auth.py`. After credential validation, the backend issues a signed JWT containing user subject, role, and expiry. The protected dependency validates the token and checks that the user is active in PostgreSQL.
| Role | Access in the current implementation |
|---|---|
| `owner` | Management pages and owner/security-head messaging channel |
| `security_head` | Operational pages and both supported message channels |
| `security_guard` | Guard messaging channel; restricted from operational frontend pages |
Supported channels are `owner_head` and `head_guards`. The communication API verifies access for message reads and writes. Hiding a button in the frontend does not replace server-side authorization.
## Testing
After starting PostgreSQL, backend, and frontend, work through this checklist:
1. Open `/health` and verify the API responds.
2. Open `/docs` and authorize with a valid token where required.
3. Test login and `GET /api/auth/me`.
4. List videos and upload a small supported sample.
5. Start an analysis and monitor its status until completion or a reported error.
6. Open analysis details and review metrics/source video.
7. Start a webcam or RTSP stream and check video plus status.
8. Compare displayed person counts with the camera scene.
9. Confirm a live count reaches `crowd_history` for the selected sensor.
10. Test sensor listing, available dates, forecast, and evaluation.
11. Compare frontend forecast values with the API response for the same sensor/date.
12. Test messaging using different roles and confirm unauthorized channels are rejected.
13. Run `npm run build` from `frontend` before a demo/release.
HTTP `200` means a request succeeded, but also validate values, timestamps, records, and permissions. Do not use a real emergency as a first test of the system.
## Troubleshooting
### Backend does not start
- Activate the intended environment; install `backend/requirements.txt`; read the first traceback; verify the YOLO weights path; check that port `8000` is free.
### Database initialization fails
- Confirm PostgreSQL is running; confirm the database and role exist; check `DATABASE_URL` and `DATABASE_URL_SYNC`; verify dataset tables/constraints; URL-encode special characters in connection-string passwords if needed.
### Swagger returns `401` or `403`
- Log in and authorize Swagger with a current bearer token. `401` usually means missing/invalid/expired authentication; `403` usually means the role lacks endpoint/channel permission.
### Live camera does not connect
- Test the webcam index or RTSP URL independently; verify host, port, stream path, credentials, and network; review OpenCV errors; check `/api/live/status` and camera ID.
### Person count is inconsistent
- Compare multiple frames with a manual count; review viewpoint, resolution, occlusion, lighting, and crowd density; check confidence/detection interval; distinguish current tracked count from total unique IDs across a video.
### Prediction endpoint returns no records
- Use a sensor ID and date returned by prediction endpoints; confirm `crowd_predictions` contains matching rows; inspect time zones and forecasts that cross midnight.
### Frontend cannot reach the backend
- Confirm port `8000`; inspect DevTools Network/Console; verify local token; confirm CORS allows the frontend origin; keep `localhost`/`127.0.0.1` use consistent.
## Security and Privacy
- Never publish database passwords, JWT secrets, RTSP credentials, `.env` files, private videos, or generated artifacts.
- Replace fallback settings and rotate credentials already exposed in version control; use a strong JWT key, HTTPS, and a secret manager for deployment.
- Restrict camera/file access, define recording retention/deletion rules, and follow applicable privacy and surveillance requirements.
## Limitations and Future Work
- Detection accuracy depends on viewpoint, resolution, crowd density, model weights, and environment.; Risk labels are decision-support heuristics, not a validated prediction of a stampede.; Live history updates an hourly bucket rather than storing each frame as a time series.; The evaluation endpoint returns static metrics until connected to generated evaluation artifacts.; Forecast quality depends on historical coverage, timestamps, sensor mapping, and retraining.; Local API URLs and development settings must be changed for deployment.; A worker queue could improve reliability of long-running video analysis.; Automated API/UI tests, CI, backups, monitoring, audit logs, and model/version tracking are useful next steps.; Validate thresholds and model outputs with representative labeled video and domain-expert review.
## Contributing
1. Create a feature branch before making changes.
2. Keep changes focused and use descriptive commit messages.
3. Run relevant API, UI, database, and build checks.
4. Never commit secrets, personal data, or generated runtime files.
5. Update the README when routes/configuration change.
6. Use a pull request to explain changes and test evidence.
## License
No license was confirmed in the repository files reviewed for this README. Add a `LICENSE` file and name the license here before defining redistribution or reuse permissions.
## Acknowledgements
- **Ultralytics YOLO** provides the object-detection framework.; **OpenCV** handles frame capture and image processing.; **FastAPI** provides the API framework and interactive OpenAPI docs.; **Next.js and React** power the frontend.; **PostgreSQL and SQLAlchemy** provide persistent storage and data access.; **XGBoost** powers the historical-count regression model.
