"use client";

import { useEffect, useState } from "react";

interface LiveMetrics {
    people_count: number | null;
    density: number | null;
    flow_metrics: {
        flow_rate: number | null;
        avg_velocity: number | null;
        flow_consistency: number | null;
        movement_data_available: boolean;
    } | null;
    is_bottleneck: boolean;
    bottleneck_reason: string;
    risk_result: {
        risk_score: number;
        risk_level: string;
    } | null;
}

interface LiveStatus {
    camera_id: string | null;
    running: boolean;
    connected: boolean;
    frame_number: number;
    unique_track_count: number;
    metrics?: LiveMetrics;
}

export default function CCTVPage() {

    const [liveStatus, setLiveStatus] =
        useState<LiveStatus | null>(null);

    const [starting, setStarting] =
        useState(false);

    const [error, setError] =
        useState("");

    // ---------------------------------------------------------
    // Camera source
    // ---------------------------------------------------------

    const [cameraSource, setCameraSource] =
        useState<"webcam" | "cctv">("webcam");

    const [rtspUrl, setRtspUrl] =
        useState("");

    const [cameraId, setCameraId] =
        useState("camera_1");


    // ---------------------------------------------------------
    // Get live status
    // ---------------------------------------------------------

    const fetchLiveStatus = async () => {

        try {

            const response = await fetch(
                "http://localhost:8000/api/live/status"
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to fetch live status"
                );
            }

            const data = await response.json();

            setLiveStatus(data);

        } catch (err) {

            console.error(
                "Live status error:",
                err
            );

            setError(
                "Unable to connect to backend"
            );
        }
    };


    // ---------------------------------------------------------
    // Start camera
    // ---------------------------------------------------------

    const startCamera = async () => {

        try {

            setStarting(true);
            setError("");

            // -------------------------------------------------
            // Determine source
            // -------------------------------------------------

            let source = "0";

            if (cameraSource === "cctv") {

                if (!rtspUrl.trim()) {

                    setError(
                        "Please enter the CCTV RTSP URL"
                    );

                    setStarting(false);

                    return;
                }

                source = rtspUrl.trim();
            }


            // -------------------------------------------------
            // Build API URL
            // -------------------------------------------------

            const params = new URLSearchParams({
                source: source,
                camera_id: cameraId.trim() || "camera_1",
            });

            const response = await fetch(
                `http://localhost:8000/api/live/start?${params.toString()}`,
                {
                    method: "POST",
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Failed to start camera"
                );
            }


            const data = await response.json();

            console.log(
                "Camera started:",
                data
            );


            // Get updated status
            await fetchLiveStatus();

        } catch (err) {

            console.error(
                "Start camera error:",
                err
            );

            setError(
                "Failed to start camera"
            );

        } finally {

            setStarting(false);
        }
    };


    // ---------------------------------------------------------
    // Stop camera
    // ---------------------------------------------------------

    const stopCamera = async () => {

        try {

            setError("");

            const response = await fetch(
                "http://localhost:8000/api/live/stop",
                {
                    method: "POST",
                }
            );


            if (!response.ok) {

                throw new Error(
                    "Failed to stop camera"
                );
            }


            await response.json();

            await fetchLiveStatus();

        } catch (err) {

            console.error(
                "Stop camera error:",
                err
            );

            setError(
                "Failed to stop camera"
            );
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


        return () =>
            clearInterval(interval);

    }, []);


    // ---------------------------------------------------------
    // Values
    // ---------------------------------------------------------

    const metrics =
        liveStatus?.metrics;


    const peopleCount =
        metrics?.people_count ?? 0;


    const density =
        metrics?.density ?? 0;


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


    // ---------------------------------------------------------
    // Risk styling
    // ---------------------------------------------------------

    const getRiskColor = () => {

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


    const getRiskBackground = () => {

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


    return (

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

            <div className="container mx-auto px-6 py-8">


                {/* ------------------------------------------------ */}
                {/* Header */}
                {/* ------------------------------------------------ */}

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

                    <div>

                        <h1 className="text-3xl font-bold text-white">
                            Live CCTV Monitoring
                        </h1>

                        <p className="text-slate-400 mt-1">
                            Real-time crowd monitoring and risk detection
                        </p>

                    </div>


                    {/* Camera status */}

                    <div className="flex items-center gap-4">

                        <div className="flex items-center gap-2">

                            <div
                                className={`w-3 h-3 rounded-full ${liveStatus?.running &&
                                    liveStatus?.connected
                                    ? "bg-green-500 animate-pulse"
                                    : "bg-slate-500"
                                    }`}
                            />

                            <span className="text-slate-300">

                                {liveStatus?.running &&
                                    liveStatus?.connected
                                    ? "Camera Online"
                                    : "Camera Offline"}

                            </span>

                        </div>


                        {!liveStatus?.running ? (

                            <button
                                onClick={startCamera}
                                disabled={starting}
                                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                            >

                                {starting
                                    ? "Starting..."
                                    : "Start Camera"}

                            </button>

                        ) : (

                            <button
                                onClick={stopCamera}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Stop Camera
                            </button>

                        )}

                    </div>

                </div>


                {/* ------------------------------------------------ */}
                {/* Error */}
                {/* ------------------------------------------------ */}

                {error && (

                    <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-400">

                        {error}

                    </div>

                )}


                {/* ------------------------------------------------ */}
                {/* Camera Configuration */}
                {/* ------------------------------------------------ */}

                {!liveStatus?.running && (

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">

                        <h2 className="text-lg font-semibold text-white mb-5">
                            Camera Source
                        </h2>


                        {/* Source selection */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

                            {/* Webcam */}

                            <button
                                type="button"
                                onClick={() =>
                                    setCameraSource("webcam")
                                }
                                className={`p-5 rounded-xl border text-left transition ${cameraSource === "webcam"
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-slate-700 bg-slate-900/30 hover:border-slate-500"
                                    }`}
                            >

                                <div className="text-white font-semibold">
                                    Computer Webcam
                                </div>

                                <div className="text-slate-400 text-sm mt-1">
                                    Use the webcam connected to this computer
                                </div>

                                <div className="text-slate-500 text-xs mt-3">
                                    Source: 0
                                </div>

                            </button>


                            {/* CCTV */}

                            <button
                                type="button"
                                onClick={() =>
                                    setCameraSource("cctv")
                                }
                                className={`p-5 rounded-xl border text-left transition ${cameraSource === "cctv"
                                    ? "border-green-500 bg-green-500/10"
                                    : "border-slate-700 bg-slate-900/30 hover:border-slate-500"
                                    }`}
                            >

                                <div className="text-white font-semibold">
                                    CCTV / IP Camera
                                </div>

                                <div className="text-slate-400 text-sm mt-1">
                                    Connect using an RTSP stream
                                </div>

                                <div className="text-slate-500 text-xs mt-3">
                                    Source: RTSP URL
                                </div>

                            </button>

                        </div>


                        {/* CCTV RTSP URL */}

                        {cameraSource === "cctv" && (

                            <div className="mb-5">

                                <label className="block text-slate-300 text-sm mb-2">
                                    CCTV RTSP URL
                                </label>

                                <input
                                    type="text"
                                    value={rtspUrl}
                                    onChange={(e) =>
                                        setRtspUrl(
                                            e.target.value
                                        )
                                    }
                                    placeholder="rtsp://username:password@192.168.1.100:554/..."
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                                />

                                <p className="text-slate-500 text-xs mt-2">
                                    Enter the RTSP URL provided by your CCTV camera or NVR.
                                </p>

                            </div>

                        )}


                        {/* Camera ID */}

                        <div>

                            <label className="block text-slate-300 text-sm mb-2">
                                Camera ID
                            </label>

                            <input
                                type="text"
                                value={cameraId}
                                onChange={(e) =>
                                    setCameraId(
                                        e.target.value
                                    )
                                }
                                placeholder="camera_1"
                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                            />

                        </div>

                    </div>

                )}


                {/* ------------------------------------------------ */}
                {/* Live CCTV Video */}
                {/* ------------------------------------------------ */}

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-6">

                    <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">

                        <div>

                            <h2 className="text-lg font-semibold text-white">
                                Live Camera Feed
                            </h2>

                            <p className="text-slate-400 text-sm mt-1">
                                Real-time camera stream
                            </p>

                        </div>


                        {liveStatus?.running &&
                            liveStatus?.connected && (

                                <div className="flex items-center gap-2">

                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                                    <span className="text-red-400 text-sm font-medium">
                                        LIVE
                                    </span>

                                </div>

                            )}

                    </div>


                    <div className="bg-black flex items-center justify-center min-h-[400px]">

                        {liveStatus?.running &&
                            liveStatus?.connected ? (

                            <img
                                src="http://localhost:8000/api/live/stream"
                                alt="Live Camera Feed"
                                className="w-full max-h-[650px] object-contain"
                            />

                        ) : (

                            <div className="text-center py-24">

                                <div className="text-slate-500 text-5xl mb-4">
                                    📹
                                </div>

                                <p className="text-slate-400">
                                    Camera is offline
                                </p>

                                <p className="text-slate-600 text-sm mt-2">
                                    Select a camera source and start the camera
                                </p>

                            </div>

                        )}

                    </div>

                </div>


                {/* ------------------------------------------------ */}
                {/* Camera Information */}
                {/* ------------------------------------------------ */}

                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">

                    <div className="flex items-center justify-between">

                        <div>

                            <div className="text-slate-400 text-sm">
                                Camera
                            </div>

                            <div className="text-white font-semibold text-lg">
                                {liveStatus?.camera_id ??
                                    "Not connected"}
                            </div>

                        </div>


                        <div className="text-right">

                            <div className="text-slate-400 text-sm">
                                Frame
                            </div>

                            <div className="text-white font-semibold text-lg">
                                {liveStatus?.frame_number ?? 0}
                            </div>

                        </div>


                        <div className="text-right">

                            <div className="text-slate-400 text-sm">
                                Unique Tracks
                            </div>

                            <div className="text-white font-semibold text-lg">
                                {liveStatus?.unique_track_count ?? 0}
                            </div>

                        </div>

                    </div>

                </div>


                {/* ------------------------------------------------ */}
                {/* Main Metrics */}
                {/* ------------------------------------------------ */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">


                    {/* People */}

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

                        <div className="text-slate-400 text-sm mb-2">
                            People Count
                        </div>

                        <div className="text-4xl font-bold text-white">
                            {peopleCount}
                        </div>

                        <div className="text-slate-500 text-sm mt-2">
                            Currently detected
                        </div>

                    </div>


                    {/* Density */}

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

                        <div className="text-slate-400 text-sm mb-2">
                            Crowd Density
                        </div>

                        <div className="text-4xl font-bold text-white">
                            {density.toFixed(3)}
                        </div>

                        <div className="text-slate-500 text-sm mt-2">
                            People per normalized area
                        </div>

                    </div>


                    {/* Flow */}

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

                        <div className="text-slate-400 text-sm mb-2">
                            Flow Rate
                        </div>

                        <div className="text-4xl font-bold text-white">
                            {flowRate.toFixed(2)}
                        </div>

                        <div className="text-slate-500 text-sm mt-2">
                            Movement rate
                        </div>

                    </div>


                    {/* Velocity */}

                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">

                        <div className="text-slate-400 text-sm mb-2">
                            Avg Velocity
                        </div>

                        <div className="text-4xl font-bold text-white">
                            {avgVelocity.toFixed(2)}
                        </div>

                        <div className="text-slate-500 text-sm mt-2">
                            Average movement
                        </div>

                    </div>

                </div>


                {/* ------------------------------------------------ */}
                {/* Risk + Bottleneck */}
                {/* ------------------------------------------------ */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


                    {/* Risk */}

                    <div
                        className={`border rounded-xl p-6 ${getRiskBackground()}`}
                    >

                        <div className="text-slate-400 text-sm mb-3">
                            Current Risk
                        </div>

                        <div className="flex items-end gap-4">

                            <div
                                className={`text-5xl font-bold ${getRiskColor()}`}
                            >
                                {riskScore.toFixed(1)}
                            </div>

                            <div
                                className={`text-xl font-semibold ${getRiskColor()} mb-1`}
                            >
                                {riskLevel.toUpperCase()}
                            </div>

                        </div>


                        <div className="mt-4">

                            <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">

                                <div
                                    className={`h-full transition-all duration-500 ${getRiskColor().replace(
                                        "text-",
                                        "bg-"
                                    )}`}
                                    style={{
                                        width: `${Math.min(
                                            riskScore,
                                            100
                                        )}%`,
                                    }}
                                />

                            </div>

                        </div>

                    </div>


                    {/* Bottleneck */}

                    <div
                        className={`border rounded-xl p-6 ${bottleneck
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-green-500/10 border-green-500/30"
                            }`}
                    >

                        <div className="text-slate-400 text-sm mb-3">
                            Bottleneck Status
                        </div>


                        <div
                            className={`text-3xl font-bold ${bottleneck
                                ? "text-red-400"
                                : "text-green-400"
                                }`}
                        >
                            {bottleneck
                                ? "DETECTED"
                                : "NORMAL"}
                        </div>


                        <p className="text-slate-400 text-sm mt-3">

                            {metrics?.bottleneck_reason ??
                                "No bottleneck information available"}

                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}