"use client";

import { useCallback, useEffect, useState } from "react";

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

const API_URL = "http://localhost:8000/api/live";

const initialCamera: Camera = {
    camera_id: "camera_1",
    sensor_id: 1,
    source_type: "cctv",
    source: "",
    running: false,
    connected: false,
    starting: false,
};

const emptyStatus: LiveStatusResponse = {
    cameras: {},
    total_cameras: 0,
};

export default function CCTVPage() {
    const [activeTab, setActiveTab] = useState<"live" | "webcam">("live");
    const [cameras, setCameras] = useState<Camera[]>([initialCamera]);
    const [liveStatus, setLiveStatus] =
        useState<LiveStatusResponse>(emptyStatus);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [showAddCamera, setShowAddCamera] = useState(false);

    const [newCameraId, setNewCameraId] = useState("");
    const [newSensorId, setNewSensorId] = useState("");
    const [newCameraSource, setNewCameraSource] =
        useState<"cctv" | "webcam">("cctv");
    const [newRtspUrl, setNewRtspUrl] = useState("");

    const [webcamRunning, setWebcamRunning] = useState(false);
    const [webcamStarting, setWebcamStarting] = useState(false);
    const [webcamStreamKey, setWebcamStreamKey] = useState(0);
    const [webcamStatus, setWebcamStatus] =
        useState<CameraStatus | null>(null);

    const fetchLiveStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                throw new Error("Please log in again to access live cameras.");
            }

            const response = await fetch(`${API_URL}/status`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(
                    `Live status failed (${response.status}): ${details || response.statusText
                    }`
                );
            }

            const data: LiveStatusResponse = await response.json();

            setLiveStatus(data);
            setError("");

            setCameras((previous) =>
                previous.map((camera) => {
                    const status = data.cameras[camera.camera_id];

                    if (!status) return camera;

                    return {
                        ...camera,
                        running: status.running,
                        connected: status.connected,
                    };
                })
            );

            const webcam = data.cameras.webcam;

            if (webcam) {
                setWebcamRunning(webcam.running);
                setWebcamStatus(webcam);
            } else {
                setWebcamRunning(false);
                setWebcamStatus(null);
            }
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Unable to fetch live camera status";

            console.error("Live status error:", message);
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchLiveStatus();

        const interval = window.setInterval(() => {
            void fetchLiveStatus();
        }, 2000);

        return () => window.clearInterval(interval);
    }, [fetchLiveStatus]);

    const getToken = () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            throw new Error("Authentication token missing. Please log in again.");
        }

        return token;
    };

    const startCamera = async (cameraId: string) => {
        const camera = cameras.find((item) => item.camera_id === cameraId);

        if (!camera) return;

        if (!camera.source.trim()) {
            setError("Please configure a valid CCTV RTSP URL first.");
            setShowAddCamera(true);
            return;
        }

        setError("");

        setCameras((previous) =>
            previous.map((item) =>
                item.camera_id === cameraId
                    ? { ...item, starting: true }
                    : item
            )
        );

        try {
            const token = getToken();

            const params = new URLSearchParams({
                source: camera.source,
                camera_id: camera.camera_id,
                sensor_id: String(camera.sensor_id),
            });

            const response = await fetch(
                `${API_URL}/start?${params.toString()}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const details = await response.text();
                throw new Error(
                    `Unable to start ${cameraId}: ${details || response.statusText
                    }`
                );
            }

            await response.json();
            await fetchLiveStatus();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to start ${cameraId}`
            );
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

    const stopCamera = async (cameraId: string) => {
        try {
            setError("");

            const token = getToken();

            const response = await fetch(
                `${API_URL}/stop/${encodeURIComponent(cameraId)}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const details = await response.text();
                throw new Error(
                    `Unable to stop ${cameraId}: ${details || response.statusText
                    }`
                );
            }

            await response.json();
            await fetchLiveStatus();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to stop ${cameraId}`
            );
        }
    };

    const startWebcam = async () => {
        try {
            setError("");
            setWebcamStarting(true);

            const token = getToken();

            const params = new URLSearchParams({
                source: "0",
                camera_id: "webcam",
                sensor_id: "1",
            });

            const response = await fetch(
                `${API_URL}/start?${params.toString()}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const details = await response.text();
                throw new Error(
                    `Unable to start webcam: ${details || response.statusText
                    }`
                );
            }

            await response.json();

            setWebcamStreamKey((previous) => previous + 1);
            setWebcamRunning(true);

            await fetchLiveStatus();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to start webcam"
            );
        } finally {
            setWebcamStarting(false);
        }
    };

    const stopWebcam = async () => {
        try {
            setError("");

            const token = getToken();

            const response = await fetch(`${API_URL}/stop/webcam`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const details = await response.text();
                throw new Error(
                    `Unable to stop webcam: ${details || response.statusText
                    }`
                );
            }

            await response.json();

            setWebcamRunning(false);
            setWebcamStatus(null);

            await fetchLiveStatus();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to stop webcam"
            );
        }
    };

    const addCamera = () => {
        setError("");

        const cameraId = newCameraId.trim();
        const sensorId = Number(newSensorId);

        if (!cameraId) {
            setError("Please enter a Camera ID.");
            return;
        }

        if (!newSensorId || !Number.isInteger(sensorId) || sensorId < 1) {
            setError("Please enter a valid positive Sensor ID.");
            return;
        }

        if (cameras.some((camera) => camera.camera_id === cameraId)) {
            setError("This Camera ID already exists.");
            return;
        }

        if (newCameraSource === "cctv" && !newRtspUrl.trim()) {
            setError("Please enter the CCTV RTSP URL.");
            return;
        }

        const newCamera: Camera = {
            camera_id: cameraId,
            sensor_id: sensorId,
            source_type: newCameraSource,
            source:
                newCameraSource === "webcam" ? "0" : newRtspUrl.trim(),
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

    const removeCamera = async (cameraId: string) => {
        const camera = cameras.find((item) => item.camera_id === cameraId);

        if (camera?.running) {
            await stopCamera(cameraId);
        }

        setCameras((previous) =>
            previous.filter((item) => item.camera_id !== cameraId)
        );
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel.toLowerCase()) {
            case "critical":
                return "text-red-700";
            case "high":
                return "text-orange-700";
            case "warning":
                return "text-amber-700";
            default:
                return "text-green-700";
        }
    };

    const getRiskBackground = (riskLevel: string) => {
        switch (riskLevel.toLowerCase()) {
            case "critical":
                return "border-red-200 bg-red-50";
            case "high":
                return "border-orange-200 bg-orange-50";
            case "warning":
                return "border-amber-200 bg-amber-50";
            default:
                return "border-green-200 bg-green-50";
        }
    };

    const renderMetric = (
        label: string,
        value: string | number,
        icon: string
    ) => (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">{label}</p>
                <span className="text-lg" aria-hidden="true">
                    {icon}
                </span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
        </div>
    );

    const renderCameraCard = (camera: Camera) => {
        const status = liveStatus.cameras[camera.camera_id];
        const metrics = status?.metrics;

        const peopleCount = metrics?.people_count ?? 0;
        const density = metrics?.density ?? 0;
        const flowRate = metrics?.flow_metrics?.flow_rate ?? 0;
        const velocity = metrics?.flow_metrics?.avg_velocity ?? 0;
        const riskScore = metrics?.risk_result?.risk_score ?? 0;
        const riskLevel = metrics?.risk_result?.risk_level ?? "safe";
        const bottleneck = metrics?.is_bottleneck ?? false;
        const online = Boolean(status?.running && status?.connected);

        return (
            <section
                key={camera.camera_id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5">
                    <div>
                        <div className="flex items-center gap-3">
                            <span
                                className={`h-3 w-3 rounded-full ${online
                                    ? "animate-pulse bg-green-500"
                                    : "bg-slate-300"
                                    }`}
                            />
                            <h3 className="text-lg font-semibold text-slate-900">
                                {camera.camera_id}
                            </h3>
                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${online
                                    ? "bg-green-50 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                    }`}
                            >
                                {online ? "ONLINE" : "OFFLINE"}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            Sensor ID: {camera.sensor_id}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        {online ? (
                            <button
                                onClick={() => void stopCamera(camera.camera_id)}
                                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                            >
                                Stop Camera
                            </button>
                        ) : (
                            <button
                                onClick={() => void startCamera(camera.camera_id)}
                                disabled={camera.starting}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {camera.starting ? "Starting..." : "Start Camera"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex min-h-[280px] items-center justify-center bg-slate-950">
                    {online ? (
                        <img
                            src={`/api/live/stream/${encodeURIComponent(
                                camera.camera_id
                            )}`}
                            alt={`${camera.camera_id} live feed`}
                            className="max-h-[600px] w-full object-contain"
                        />
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <div className="mb-4 text-5xl">📹</div>
                            <p className="font-medium text-white">
                                Camera feed unavailable
                            </p>
                            <p className="mt-2 text-sm text-slate-400">
                                Start the camera to view the live feed.
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 p-5">
                    <div>
                        <p className="text-xs text-slate-500">Frame</p>
                        <p className="mt-1 font-semibold text-slate-900">
                            {status?.frame_number ?? 0}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Tracks</p>
                        <p className="mt-1 font-semibold text-slate-900">
                            {status?.unique_track_count ?? 0}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Processing FPS</p>
                        <p className="mt-1 font-semibold text-slate-900">
                            {status?.processing_fps?.toFixed(1) ?? "0.0"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
                    {renderMetric("People", peopleCount, "👥")}
                    {renderMetric("Density", density.toFixed(3), "◉")}
                    {renderMetric("Flow Rate", flowRate.toFixed(2), "↔")}
                    {renderMetric("Velocity", velocity.toFixed(2), "↗")}
                </div>

                <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-2">
                    <div
                        className={`rounded-xl border p-4 ${getRiskBackground(
                            riskLevel
                        )}`}
                    >
                        <p className="text-sm text-slate-600">Current Risk</p>
                        <div className="mt-2 flex items-end gap-3">
                            <p
                                className={`text-3xl font-bold ${getRiskColor(
                                    riskLevel
                                )}`}
                            >
                                {riskScore.toFixed(1)}
                            </p>
                            <p
                                className={`mb-1 text-sm font-semibold ${getRiskColor(
                                    riskLevel
                                )}`}
                            >
                                {riskLevel.toUpperCase()}
                            </p>
                        </div>
                    </div>

                    <div
                        className={`rounded-xl border p-4 ${bottleneck
                            ? "border-red-200 bg-red-50"
                            : "border-green-200 bg-green-50"
                            }`}
                    >
                        <p className="text-sm text-slate-600">Bottleneck Status</p>
                        <p
                            className={`mt-2 text-xl font-bold ${bottleneck
                                ? "text-red-700"
                                : "text-green-700"
                                }`}
                        >
                            {bottleneck ? "DETECTED" : "NORMAL"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {metrics?.bottleneck_reason || "No additional information"}
                        </p>
                    </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                    <button
                        onClick={() => void removeCamera(camera.camera_id)}
                        className="text-sm font-medium text-red-600 transition hover:text-red-800"
                    >
                        Remove Camera
                    </button>
                </div>
            </section>
        );
    };

    const webcamMetrics = webcamStatus?.metrics;
    const webcamPeopleCount = webcamMetrics?.people_count ?? 0;
    const webcamDensity = webcamMetrics?.density ?? 0;
    const webcamFlowRate = webcamMetrics?.flow_metrics?.flow_rate ?? 0;
    const webcamVelocity = webcamMetrics?.flow_metrics?.avg_velocity ?? 0;
    const webcamRiskScore = webcamMetrics?.risk_result?.risk_score ?? 0;
    const webcamRiskLevel =
        webcamMetrics?.risk_result?.risk_level ?? "safe";

    const onlineCount = Object.values(liveStatus.cameras).filter(
        (camera) => camera.running && camera.connected
    ).length;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/60">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                            📹
                        </div>
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
                                CrowdManagement AI
                            </p>
                            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                                CCTV Monitoring
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Real-time crowd monitoring and risk detection
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                        <span
                            className={`h-2.5 w-2.5 rounded-full ${loading
                                ? "animate-pulse bg-amber-400"
                                : "bg-green-500"
                                }`}
                        />
                        <span className="text-sm font-medium text-slate-600">
                            {loading ? "Connecting..." : "Monitoring service"}
                        </span>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                    >
                        <p className="break-words">{error}</p>
                        <button
                            onClick={() => setError("")}
                            className="font-semibold hover:text-red-900"
                            aria-label="Dismiss error"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div className="mb-8 flex gap-2 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab("live")}
                        className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${activeTab === "live"
                            ? "border-blue-600 text-blue-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        Live CCTV
                    </button>
                    <button
                        onClick={() => setActiveTab("webcam")}
                        className={`border-b-2 px-5 py-3 text-sm font-semibold transition ${activeTab === "webcam"
                            ? "border-blue-600 text-blue-700"
                            : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                    >
                        Webcam
                    </button>
                </div>

                {activeTab === "live" && (
                    <>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Live CCTV Cameras
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Manage camera feeds and monitor crowd conditions.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAddCamera((value) => !value)}
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                {showAddCamera ? "Close Form" : "+ Add Camera"}
                            </button>
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    Configured Cameras
                                </p>
                                <p className="mt-2 text-3xl font-bold text-slate-900">
                                    {cameras.length}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    Backend Cameras
                                </p>
                                <p className="mt-2 text-3xl font-bold text-slate-900">
                                    {liveStatus.total_cameras}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm text-slate-500">
                                    Cameras Online
                                </p>
                                <p className="mt-2 text-3xl font-bold text-green-700">
                                    {onlineCount}
                                </p>
                            </div>
                        </div>

                        {showAddCamera && (
                            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900">
                                    Configure a Camera
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Enter the camera details below.
                                </p>

                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Camera ID
                                        </label>
                                        <input
                                            value={newCameraId}
                                            onChange={(event) =>
                                                setNewCameraId(event.target.value)
                                            }
                                            placeholder="camera_2"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Sensor ID
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newSensorId}
                                            onChange={(event) =>
                                                setNewSensorId(event.target.value)
                                            }
                                            placeholder="2"
                                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Camera Source
                                        </label>
                                        <select
                                            value={newCameraSource}
                                            onChange={(event) =>
                                                setNewCameraSource(
                                                    event.target.value as
                                                    | "cctv"
                                                    | "webcam"
                                                )
                                            }
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        >
                                            <option value="cctv">
                                                CCTV / IP Camera
                                            </option>
                                            <option value="webcam">
                                                Webcam
                                            </option>
                                        </select>
                                    </div>

                                    {newCameraSource === "cctv" && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                                RTSP URL
                                            </label>
                                            <input
                                                value={newRtspUrl}
                                                onChange={(event) =>
                                                    setNewRtspUrl(event.target.value)
                                                }
                                                placeholder="rtsp://camera-address/stream"
                                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowAddCamera(false)}
                                        className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addCamera}
                                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        Add Camera
                                    </button>
                                </div>
                            </section>
                        )}

                        {cameras.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6">
                                {cameras.map(renderCameraCard)}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                                <div className="text-5xl">📹</div>
                                <h3 className="mt-4 text-lg font-bold text-slate-900">
                                    No cameras configured
                                </h3>
                                <p className="mt-2 text-sm text-slate-500">
                                    Add a camera to begin monitoring.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === "webcam" && (
                    <>
                        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    Computer Webcam
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Test crowd detection using the connected webcam.
                                </p>
                            </div>

                            {!webcamRunning ? (
                                <button
                                    onClick={() => void startWebcam()}
                                    disabled={webcamStarting}
                                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {webcamStarting
                                        ? "Starting..."
                                        : "Start Camera"}
                                </button>
                            ) : (
                                <button
                                    onClick={() => void stopWebcam()}
                                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                                >
                                    Stop Camera
                                </button>
                            )}
                        </div>

                        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        Webcam Feed
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Source: Computer webcam (0)
                                    </p>
                                </div>

                                {webcamRunning && webcamStatus?.connected && (
                                    <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                                        LIVE
                                    </span>
                                )}
                            </div>

                            <div className="flex min-h-[350px] items-center justify-center bg-slate-950 sm:min-h-[450px]">
                                {webcamRunning && webcamStatus?.connected ? (
                                    <img
                                        key={webcamStreamKey}
                                        src={`/api/live/stream/webcam?t=${webcamStreamKey}`}
                                        alt="Webcam live feed"
                                        className="max-h-[650px] w-full object-contain"
                                    />
                                ) : (
                                    <div className="px-6 py-20 text-center">
                                        <div className="text-5xl">📹</div>
                                        <p className="mt-4 font-semibold text-white">
                                            Webcam is offline
                                        </p>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Click Start Camera to begin monitoring.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {renderMetric("People Count", webcamPeopleCount, "👥")}
                            {renderMetric(
                                "Crowd Density",
                                webcamDensity.toFixed(3),
                                "◉"
                            )}
                            {renderMetric(
                                "Flow Rate",
                                webcamFlowRate.toFixed(2),
                                "↔"
                            )}
                            {renderMetric(
                                "Average Velocity",
                                webcamVelocity.toFixed(2),
                                "↗"
                            )}
                        </div>

                        <section
                            className={`rounded-2xl border p-6 shadow-sm ${getRiskBackground(
                                webcamRiskLevel
                            )}`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-slate-900">
                                        Current Webcam Risk
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Risk assessment from current webcam metrics.
                                    </p>
                                </div>

                                <div className="flex items-end gap-3">
                                    <p
                                        className={`text-4xl font-bold ${getRiskColor(
                                            webcamRiskLevel
                                        )}`}
                                    >
                                        {webcamRiskScore.toFixed(1)}
                                    </p>
                                    <p
                                        className={`mb-1 font-semibold ${getRiskColor(
                                            webcamRiskLevel
                                        )}`}
                                    >
                                        {webcamRiskLevel.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}