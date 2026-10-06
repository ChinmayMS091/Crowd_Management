"use client";

import { useEffect, useState } from "react";

interface FlowMetrics {
    flow_rate: number | null;
    avg_velocity: number | null;
    flow_consistency: number | null;
    movement_data_available: boolean;
}

interface RiskResult {
    risk_score: number;
    risk_level: string;
}

interface LiveMetrics {
    people_count: number | null;
    density: number | null;
    flow_metrics: FlowMetrics | null;
    is_bottleneck: boolean;
    bottleneck_reason: string;
    risk_result: RiskResult | null;
}

interface CameraStatus {
    camera_id: string;
    sensor_id?: number;
    running: boolean;
    connected: boolean;
    frame_number: number;
    unique_track_count: number;
    processing_fps?: number;
    frame_latency_ms?: number;
    detection_time_ms?: number;
    tracking_time_ms?: number;
    analytics_time_ms?: number;
    risk_time_ms?: number;
    metrics?: LiveMetrics;
}

interface LiveStatusResponse {
    cameras: Record<string, CameraStatus>;
    total_cameras: number;
}

interface Camera {
    camera_id: string;
    sensor_id: number;
    source_type: "webcam" | "cctv";
    source: string;
    running: boolean;
    connected: boolean;
    starting: boolean;
}

export default function CCTVPage() {
    const [activeTab, setActiveTab] = useState<"live" | "webcam">("live");

    const [cameras, setCameras] = useState<Camera[]>([
        {
            camera_id: "camera_1",
            sensor_id: 1,
            source_type: "cctv",
            source: "",
            running: false,
            connected: false,
            starting: false,
        },
    ]);

    const [showAddCamera, setShowAddCamera] = useState(false);

    const [newCameraId, setNewCameraId] = useState("");
    const [newSensorId, setNewSensorId] = useState("");
    const [newCameraSource, setNewCameraSource] = useState<"cctv" | "webcam">(
        "cctv"
    );
    const [newRtspUrl, setNewRtspUrl] = useState("");

    const [liveStatus, setLiveStatus] = useState<LiveStatusResponse>({
        cameras: {},
        total_cameras: 0,
    });

    const [error, setError] = useState("");

    // ---------------------------------------------------------
    // Webcam state
    // ---------------------------------------------------------

    const [webcamRunning, setWebcamRunning] = useState(false);
    const [webcamStarting, setWebcamStarting] = useState(false);
    const [webcamStatus, setWebcamStatus] = useState<CameraStatus | null>(null);

    // ---------------------------------------------------------
    // Get live status
    // ---------------------------------------------------------

    const fetchLiveStatus = async () => {
        try {
            const response = await fetch(
                "http://localhost:8000/api/live/status"
            );

            if (!response.ok) {
                throw new Error("Failed to fetch live status");
            }

            const data: LiveStatusResponse = await response.json();

            setLiveStatus(data);

            setCameras((previous) =>
                previous.map((camera) => {
                    const status = data.cameras[camera.camera_id];

                    if (!status) {
                        return camera;
                    }

                    return {
                        ...camera,
                        running: status.running,
                        connected: status.connected,
                    };
                })
            );

            const webcam = data.cameras["webcam"];

            if (webcam) {
                setWebcamRunning(webcam.running);
                setWebcamStatus(webcam);
            }
        } catch (err) {
            console.error("Live status error:", err);
        }
    };

    // ---------------------------------------------------------
    // Add camera
    // ---------------------------------------------------------

    const addCamera = () => {
        setError("");

        const cameraId = newCameraId.trim();
        const sensorId = Number(newSensorId);

        if (!cameraId) {
            setError("Please enter a Camera ID");
            return;
        }

        if (!newSensorId || Number.isNaN(sensorId)) {
            setError("Please enter a valid Sensor ID");
            return;
        }

        if (cameras.some((camera) => camera.camera_id === cameraId)) {
            setError("Camera ID already exists");
            return;
        }

        if (newCameraSource === "cctv" && !newRtspUrl.trim()) {
            setError("Please enter the CCTV RTSP URL");
            return;
        }

        const newCamera: Camera = {
            camera_id: cameraId,
            sensor_id: sensorId,
            source_type: newCameraSource,
            source:
                newCameraSource === "webcam"
                    ? "0"
                    : newRtspUrl.trim(),
            running: false,
            connected: false,
            starting: false,
        };

        setCameras((previous) => [...previous, newCamera]);

        setNewCameraId("");
        setNewSensorId("");
        setNewRtspUrl("");
        setNewCameraSource("cctv");
        setShowAddCamera(false);
    };

    // ---------------------------------------------------------
    // Start Live CCTV camera
    // ---------------------------------------------------------

    const startCamera = async (cameraId: string) => {
        const camera = cameras.find(
            (item) => item.camera_id === cameraId
        );

        if (!camera) {
            return;
        }

        try {
            setError("");

            setCameras((previous) =>
                previous.map((item) =>
                    item.camera_id === cameraId
                        ? { ...item, starting: true }
                        : item
                )
            );

            const params = new URLSearchParams({
                source: camera.source,
                camera_id: camera.camera_id,
                sensor_id: String(camera.sensor_id),
            });

            const response = await fetch(
                `http://localhost:8000/api/live/start?${params.toString()}`,
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to start camera");
            }

            await response.json();

            await fetchLiveStatus();
        } catch (err) {
            console.error("Start camera error:", err);
            setError(`Failed to start ${cameraId}`);
        } finally {
            setCameras((previous) =>
                previous.map((item) =>
                    item.camera_id === cameraId
                        ? { ...item, starting: false }
                        : item
                )
            );
        }
    };

    // ---------------------------------------------------------
    // Stop Live CCTV camera
    // ---------------------------------------------------------

    const stopCamera = async (cameraId: string) => {
        try {
            setError("");

            const response = await fetch(
                `http://localhost:8000/api/live/stop/${cameraId}`,
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to stop camera");
            }

            await response.json();

            await fetchLiveStatus();
        } catch (err) {
            console.error("Stop camera error:", err);
            setError(`Failed to stop ${cameraId}`);
        }
    };

    // ---------------------------------------------------------
    // Start Webcam
    // ---------------------------------------------------------

    const startWebcam = async () => {
        try {
            setError("");
            setWebcamStarting(true);

            const params = new URLSearchParams({
                source: "0",
                camera_id: "webcam",
                sensor_id: "1",
            });

            const response = await fetch(
                `http://localhost:8000/api/live/start?${params.toString()}`,
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to start webcam");
            }

            await response.json();

            setWebcamRunning(true);

            await fetchLiveStatus();
        } catch (err) {
            console.error("Start webcam error:", err);
            setError("Failed to start webcam");
        } finally {
            setWebcamStarting(false);
        }
    };

    // ---------------------------------------------------------
    // Stop Webcam
    // ---------------------------------------------------------

    const stopWebcam = async () => {
        try {
            setError("");

            const response = await fetch(
                "http://localhost:8000/api/live/stop/webcam",
                {
                    method: "POST",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to stop webcam");
            }

            await response.json();

            setWebcamRunning(false);

            await fetchLiveStatus();
        } catch (err) {
            console.error("Stop webcam error:", err);
            setError("Failed to stop webcam");
        }
    };

    // ---------------------------------------------------------
    // Poll live status
    // ---------------------------------------------------------

    useEffect(() => {
        fetchLiveStatus();

        const interval = setInterval(() => {
            fetchLiveStatus();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // ---------------------------------------------------------
    // Remove camera
    // ---------------------------------------------------------

    const removeCamera = async (cameraId: string) => {
        const camera = cameras.find(
            (item) => item.camera_id === cameraId
        );

        if (camera?.running) {
            await stopCamera(cameraId);
        }

        setCameras((previous) =>
            previous.filter((item) => item.camera_id !== cameraId)
        );
    };

    // ---------------------------------------------------------
    // Risk styling
    // ---------------------------------------------------------

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel.toLowerCase()) {
            case "critical":
                return "text-red-400";
            case "high":
                return "text-orange-400";
            case "warning":
                return "text-yellow-400";
            default:
                return "text-green-400";
        }
    };

    const getRiskBackground = (riskLevel: string) => {
        switch (riskLevel.toLowerCase()) {
            case "critical":
                return "bg-red-500/10 border-red-500/30";
            case "high":
                return "bg-orange-500/10 border-orange-500/30";
            case "warning":
                return "bg-yellow-500/10 border-yellow-500/30";
            default:
                return "bg-green-500/10 border-green-500/30";
        }
    };

    // ---------------------------------------------------------
    // Camera card
    // ---------------------------------------------------------

    const renderCameraCard = (camera: Camera) => {
        const status = liveStatus.cameras[camera.camera_id];

        const metrics = status?.metrics;

        const peopleCount = metrics?.people_count ?? 0;
        const density = metrics?.density ?? 0;
        const flowRate =
            metrics?.flow_metrics?.flow_rate ?? 0;
        const avgVelocity =
            metrics?.flow_metrics?.avg_velocity ?? 0;

        const bottleneck =
            metrics?.is_bottleneck ?? false;

        const riskScore =
            metrics?.risk_result?.risk_score ?? 0;

        const riskLevel =
            metrics?.risk_result?.risk_level ?? "safe";

        const isOnline =
            status?.running && status?.connected;

        return (
            <div
                key={camera.camera_id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden"
            >
                {/* Camera Header */}
                <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full ${isOnline
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-slate-500"
                                    }`}
                            />

                            <h3 className="text-lg font-semibold text-white">
                                {camera.camera_id}
                            </h3>
                        </div>

                        <p className="text-slate-500 text-sm mt-1">
                            Sensor ID: {camera.sensor_id}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {isOnline ? (
                            <>
                                <span className="text-green-400 text-sm">
                                    ONLINE
                                </span>

                                <button
                                    onClick={() =>
                                        stopCamera(camera.camera_id)
                                    }
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
                                >
                                    Stop
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() =>
                                    startCamera(camera.camera_id)
                                }
                                disabled={camera.starting}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium"
                            >
                                {camera.starting
                                    ? "Starting..."
                                    : "Start"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Video */}
                <div className="bg-black w-full flex items-center justify-center">
                    {isOnline ? (
                        <img
                            src={`http://localhost:8000/api/live/stream/${camera.camera_id}`}
                            alt={`${camera.camera_id} live feed`}
                            className="w-full h-auto max-h-[700px] object-contain"
                        />
                    ) : (
                        <div className="text-center py-24">
                            <div className="text-slate-500 text-5xl mb-4">
                                📹
                            </div>

                            <p className="text-slate-400">
                                Camera is offline
                            </p>
                        </div>
                    )}
                </div>

                {/* Camera information */}
                <div className="px-5 py-4 border-t border-slate-700">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-slate-500 text-xs">
                                Frame
                            </div>

                            <div className="text-white font-semibold">
                                {status?.frame_number ?? 0}
                            </div>
                        </div>

                        <div>
                            <div className="text-slate-500 text-xs">
                                Tracks
                            </div>

                            <div className="text-white font-semibold">
                                {status?.unique_track_count ?? 0}
                            </div>
                        </div>

                        <div>
                            <div className="text-slate-500 text-xs">
                                FPS
                            </div>

                            <div className="text-white font-semibold">
                                {status?.processing_fps
                                    ? status.processing_fps.toFixed(1)
                                    : "0.0"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="px-5 pb-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-900/60 rounded-lg p-4">
                            <div className="text-slate-500 text-xs">
                                People
                            </div>

                            <div className="text-2xl font-bold text-white mt-1">
                                {peopleCount}
                            </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-lg p-4">
                            <div className="text-slate-500 text-xs">
                                Density
                            </div>

                            <div className="text-2xl font-bold text-white mt-1">
                                {density.toFixed(3)}
                            </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-lg p-4">
                            <div className="text-slate-500 text-xs">
                                Flow
                            </div>

                            <div className="text-2xl font-bold text-white mt-1">
                                {flowRate.toFixed(2)}
                            </div>
                        </div>

                        <div className="bg-slate-900/60 rounded-lg p-4">
                            <div className="text-slate-500 text-xs">
                                Velocity
                            </div>

                            <div className="text-2xl font-bold text-white mt-1">
                                {avgVelocity.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk + Bottleneck */}
                <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        className={`border rounded-lg p-4 ${getRiskBackground(
                            riskLevel
                        )}`}
                    >
                        <div className="text-slate-400 text-xs mb-2">
                            Current Risk
                        </div>

                        <div className="flex items-end gap-3">
                            <div
                                className={`text-3xl font-bold ${getRiskColor(
                                    riskLevel
                                )}`}
                            >
                                {riskScore.toFixed(1)}
                            </div>

                            <div
                                className={`font-semibold ${getRiskColor(
                                    riskLevel
                                )}`}
                            >
                                {riskLevel.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div
                        className={`border rounded-lg p-4 ${bottleneck
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-green-500/10 border-green-500/30"
                            }`}
                    >
                        <div className="text-slate-400 text-xs mb-2">
                            Bottleneck
                        </div>

                        <div
                            className={`text-xl font-bold ${bottleneck
                                ? "text-red-400"
                                : "text-green-400"
                                }`}
                        >
                            {bottleneck
                                ? "DETECTED"
                                : "NORMAL"}
                        </div>

                        <p className="text-slate-500 text-xs mt-1">
                            {metrics?.bottleneck_reason ??
                                "No information"}
                        </p>
                    </div>
                </div>

                {/* Remove */}
                <div className="px-5 pb-5">
                    <button
                        onClick={() =>
                            removeCamera(camera.camera_id)
                        }
                        className="text-red-400 hover:text-red-300 text-sm"
                    >
                        Remove Camera
                    </button>
                </div>
            </div>
        );
    };

    // ---------------------------------------------------------
    // Webcam metrics
    // ---------------------------------------------------------

    const webcamMetrics = webcamStatus?.metrics;

    const webcamPeopleCount =
        webcamMetrics?.people_count ?? 0;

    const webcamDensity =
        webcamMetrics?.density ?? 0;

    const webcamFlowRate =
        webcamMetrics?.flow_metrics?.flow_rate ?? 0;

    const webcamVelocity =
        webcamMetrics?.flow_metrics?.avg_velocity ?? 0;

    const webcamRiskScore =
        webcamMetrics?.risk_result?.risk_score ?? 0;

    const webcamRiskLevel =
        webcamMetrics?.risk_result?.risk_level ?? "safe";

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="container mx-auto px-6 py-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">
                        CCTV Monitoring
                    </h1>

                    <p className="text-slate-400 mt-1">
                        Real-time crowd monitoring and risk detection
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-700 mb-8">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={`px-6 py-3 font-medium border-b-2 transition ${activeTab === "live"
                            ? "text-green-400 border-green-500"
                            : "text-slate-400 border-transparent hover:text-white"
                            }`}
                    >
                        Live CCTV
                    </button>

                    <button
                        onClick={() => setActiveTab("webcam")}
                        className={`px-6 py-3 font-medium border-b-2 transition ${activeTab === "webcam"
                            ? "text-green-400 border-green-500"
                            : "text-slate-400 border-transparent hover:text-white"
                            }`}
                    >
                        Webcam
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-400">
                        {error}
                    </div>
                )}

                {/* =====================================================
                    LIVE CCTV TAB
                ===================================================== */}

                {activeTab === "live" && (
                    <>
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    Live CCTV Cameras
                                </h2>

                                <p className="text-slate-400 text-sm mt-1">
                                    Monitor multiple CCTV cameras simultaneously
                                </p>
                            </div>

                            <button
                                onClick={() =>
                                    setShowAddCamera(true)
                                }
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                            >
                                + Add Camera
                            </button>
                        </div>

                        {/* Add Camera */}
                        {showAddCamera && (
                            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-lg font-semibold text-white">
                                        Add Camera
                                    </h3>

                                    <button
                                        onClick={() =>
                                            setShowAddCamera(false)
                                        }
                                        className="text-slate-400 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                    {/* Camera ID */}
                                    <div>
                                        <label className="block text-slate-300 text-sm mb-2">
                                            Camera ID
                                        </label>

                                        <input
                                            type="text"
                                            value={newCameraId}
                                            onChange={(e) =>
                                                setNewCameraId(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="camera_2"
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                                        />
                                    </div>

                                    {/* Sensor ID */}
                                    <div>
                                        <label className="block text-slate-300 text-sm mb-2">
                                            Sensor ID
                                        </label>

                                        <input
                                            type="number"
                                            value={newSensorId}
                                            onChange={(e) =>
                                                setNewSensorId(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="2"
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                                        />
                                    </div>

                                    {/* Source */}
                                    <div>
                                        <label className="block text-slate-300 text-sm mb-2">
                                            Camera Source
                                        </label>

                                        <select
                                            value={newCameraSource}
                                            onChange={(e) =>
                                                setNewCameraSource(
                                                    e.target.value as
                                                    | "cctv"
                                                    | "webcam"
                                                )
                                            }
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                                        >
                                            <option value="cctv">
                                                CCTV / IP Camera
                                            </option>

                                            <option value="webcam">
                                                Webcam
                                            </option>
                                        </select>
                                    </div>

                                    {/* RTSP */}
                                    {newCameraSource === "cctv" && (
                                        <div>
                                            <label className="block text-slate-300 text-sm mb-2">
                                                RTSP URL
                                            </label>

                                            <input
                                                type="text"
                                                value={newRtspUrl}
                                                onChange={(e) =>
                                                    setNewRtspUrl(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="rtsp://username:password@192.168.1.100:554/..."
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() =>
                                            setShowAddCamera(false)
                                        }
                                        className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={addCamera}
                                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                                    >
                                        Add Camera
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Camera count */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="text-slate-400 text-sm">
                                Configured Cameras
                            </div>

                            <div className="px-3 py-1 rounded-full bg-slate-700 text-white text-sm">
                                {cameras.length}
                            </div>

                            <div className="text-slate-500 text-sm">
                                | Backend Cameras:{" "}
                                {liveStatus.total_cameras}
                            </div>
                        </div>

                        {/* Camera Grid */}
                        {cameras.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {cameras.map((camera) =>
                                    renderCameraCard(camera)
                                )}
                            </div>
                        ) : (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                                <div className="text-slate-500 text-5xl mb-4">
                                    📹
                                </div>

                                <p className="text-slate-400">
                                    No cameras configured
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* =====================================================
                    WEBCAM TAB
                ===================================================== */}

                {activeTab === "webcam" && (
                    <>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    Computer Webcam
                                </h2>

                                <p className="text-slate-400 text-sm mt-1">
                                    Test crowd detection using the webcam connected to this computer
                                </p>
                            </div>

                            {!webcamRunning ? (
                                <button
                                    onClick={startWebcam}
                                    disabled={webcamStarting}
                                    className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
                                >
                                    {webcamStarting
                                        ? "Starting..."
                                        : "Start Camera"}
                                </button>
                            ) : (
                                <button
                                    onClick={stopWebcam}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                                >
                                    Stop Camera
                                </button>
                            )}
                        </div>

                        {/* Webcam feed */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Webcam Feed
                                    </h3>

                                    <p className="text-slate-400 text-sm mt-1">
                                        Source: Computer webcam (0)
                                    </p>
                                </div>

                                {webcamRunning &&
                                    webcamStatus?.connected && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                                            <span className="text-red-400 text-sm font-medium">
                                                LIVE
                                            </span>
                                        </div>
                                    )}
                            </div>

                            <div className="bg-black min-h-[450px] flex items-center justify-center">
                                {webcamRunning &&
                                    webcamStatus?.connected ? (
                                    <img
                                        src="http://localhost:8000/api/live/stream/webcam"
                                        alt="Webcam live feed"
                                        className="w-full max-h-[650px] object-contain"
                                    />
                                ) : (
                                    <div className="text-center py-24">
                                        <div className="text-slate-500 text-5xl mb-4">
                                            📹
                                        </div>

                                        <p className="text-slate-400">
                                            Webcam is offline
                                        </p>

                                        <p className="text-slate-600 text-sm mt-2">
                                            Click Start Camera to begin
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Webcam metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">

                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="text-slate-400 text-sm mb-2">
                                    People Count
                                </div>

                                <div className="text-4xl font-bold text-white">
                                    {webcamPeopleCount}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="text-slate-400 text-sm mb-2">
                                    Crowd Density
                                </div>

                                <div className="text-4xl font-bold text-white">
                                    {webcamDensity.toFixed(3)}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="text-slate-400 text-sm mb-2">
                                    Flow Rate
                                </div>

                                <div className="text-4xl font-bold text-white">
                                    {webcamFlowRate.toFixed(2)}
                                </div>
                            </div>

                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                                <div className="text-slate-400 text-sm mb-2">
                                    Avg Velocity
                                </div>

                                <div className="text-4xl font-bold text-white">
                                    {webcamVelocity.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Webcam Risk */}
                        <div
                            className={`border rounded-xl p-6 ${getRiskBackground(
                                webcamRiskLevel
                            )}`}
                        >
                            <div className="text-slate-400 text-sm mb-3">
                                Current Webcam Risk
                            </div>

                            <div className="flex items-end gap-4">
                                <div
                                    className={`text-5xl font-bold ${getRiskColor(
                                        webcamRiskLevel
                                    )}`}
                                >
                                    {webcamRiskScore.toFixed(1)}
                                </div>

                                <div
                                    className={`text-xl font-semibold ${getRiskColor(
                                        webcamRiskLevel
                                    )} mb-1`}
                                >
                                    {webcamRiskLevel.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}