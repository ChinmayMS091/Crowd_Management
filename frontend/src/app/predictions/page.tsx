"use client";

import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

async function authenticatedFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const token = localStorage.getItem("access_token");

    if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
    }

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

interface Sensor {
    id: number;
    sensor_code: string;
    location_name: string;
    location_type: string;
}

interface Prediction {
    sensor_code: string;
    location_name: string;
    location_type: string;
    forecast_time: string;
    predicted_people: number;
    crowd_level: string;
    future_risk_score: number;
    future_risk_level: string;
    model_name: string;
    model_version: string;
}

interface Evaluation {
    model_name: string;
    model_version: string;
    metrics: {
        mae: number;
        rmse: number;
        r2: number;
    };
    test_samples: number;
    sensors: number;
}

const cardClass =
    "rounded-2xl border border-slate-200/80 bg-white shadow-sm";

export default function PredictionsPage() {
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);

    const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
    const [selectedDate, setSelectedDate] = useState("");
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

    const [loading, setLoading] = useState(true);
    const [predictionLoading, setPredictionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchSensors = async () => {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE}/api/predictions/sensors`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch prediction locations");
                }

                const result = await response.json();
                const sensorList: Sensor[] = result.sensors ?? [];

                setSensors(sensorList);

                if (sensorList.length > 0) {
                    setSelectedLocation(sensorList[0].location_name);
                    setSelectedSensorId(sensorList[0].id);
                }
            } catch (err) {
                console.error(err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load prediction locations"
                );
            } finally {
                setLoading(false);
            }
        };

        void fetchSensors();
    }, []);

    useEffect(() => {
        const fetchEvaluation = async () => {
            try {
                const response = await authenticatedFetch(
                    `${API_BASE}/api/predictions/evaluation`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch evaluation metrics");
                }

                const result = await response.json();
                setEvaluation(result);
            } catch (err) {
                console.error(err);
            }
        };

        void fetchEvaluation();
    }, []);

    useEffect(() => {
        if (selectedSensorId === null) return;

        const fetchPredictionDates = async () => {
            try {
                setError("");
                setPredictions([]);
                setSelectedDate("");
                setAvailableDates(new Set());

                const response = await authenticatedFetch(
                    `${API_BASE}/api/predictions/dates?sensor_id=${selectedSensorId}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch prediction dates");
                }

                const result = await response.json();
                const dates: string[] = result.dates ?? [];

                setAvailableDates(new Set(dates));

                if (dates.length > 0) {
                    const latestDate = dates[dates.length - 1];
                    setSelectedDate(latestDate);

                    const latest = new Date(`${latestDate}T00:00:00`);

                    setCalendarMonth(
                        new Date(
                            latest.getFullYear(),
                            latest.getMonth(),
                            1
                        )
                    );
                }
            } catch (err) {
                console.error(err);
                setAvailableDates(new Set());
                setSelectedDate("");
                setPredictions([]);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load prediction dates"
                );
            }
        };

        void fetchPredictionDates();
    }, [selectedSensorId]);

    useEffect(() => {
        if (selectedSensorId === null || !selectedDate) return;

        let cancelled = false;

        const fetchForecast = async () => {
            setPredictionLoading(true);
            setError("");

            try {
                const response = await authenticatedFetch(
                    `${API_BASE}/api/predictions/forecast?sensor_id=${selectedSensorId}&forecast_date=${selectedDate}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch prediction forecast");
                }

                const result = await response.json();

                if (!cancelled) {
                    setPredictions(result.predictions ?? []);
                }
            } catch (err) {
                console.error(err);

                if (!cancelled) {
                    setPredictions([]);
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load 24-hour crowd forecast"
                    );
                }
            } finally {
                if (!cancelled) {
                    setPredictionLoading(false);
                }
            }
        };

        void fetchForecast();

        return () => {
            cancelled = true;
        };
    }, [selectedSensorId, selectedDate]);

    const handleLocationChange = (locationName: string) => {
        const sensor = sensors.find(
            (item) => item.location_name === locationName
        );

        setSelectedLocation(locationName);
        setSelectedSensorId(sensor?.id ?? null);
        setSelectedDate("");
        setPredictions([]);
        setAvailableDates(new Set());
    };

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendarCells = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];

    const isAvailableDate = (day: number) =>
        availableDates.has(formatDate(new Date(year, month, day)));

    const isSelectedDate = (day: number) =>
        selectedDate === formatDate(new Date(year, month, day));

    const selectCalendarDate = (day: number) => {
        const formatted = formatDate(new Date(year, month, day));

        if (availableDates.has(formatted)) {
            setSelectedDate(formatted);
        }
    };

    const getCrowdBadge = (level: string) => {
        switch (level.toLowerCase()) {
            case "low":
                return "border-emerald-200 bg-emerald-50 text-emerald-700";
            case "moderate":
                return "border-amber-200 bg-amber-50 text-amber-700";
            case "high":
                return "border-orange-200 bg-orange-50 text-orange-700";
            case "very high":
                return "border-red-200 bg-red-50 text-red-700";
            default:
                return "border-slate-200 bg-slate-100 text-slate-600";
        }
    };

    const getRiskBadge = (level: string) => {
        switch (level.toLowerCase()) {
            case "safe":
                return "border-emerald-200 bg-emerald-50 text-emerald-700";
            case "warning":
                return "border-amber-200 bg-amber-50 text-amber-700";
            case "high":
                return "border-orange-200 bg-orange-50 text-orange-700";
            case "critical":
                return "border-red-200 bg-red-50 text-red-700";
            default:
                return "border-slate-200 bg-slate-100 text-slate-600";
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        const nextHour = new Date(date.getTime() + 60 * 60 * 1000);

        const formatter = (value: Date) =>
            value.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
            });

        return `${formatter(date)} - ${formatter(nextHour)}`;
    };

    const getMaxPrediction = () => {
        if (predictions.length === 0) return 1;

        return Math.max(
            1,
            ...predictions.map((prediction) => prediction.predicted_people)
        );
    };

    const averagePrediction =
        predictions.length > 0
            ? predictions.reduce(
                (sum, prediction) => sum + prediction.predicted_people,
                0
            ) / predictions.length
            : 0;

    const peakPrediction =
        predictions.length > 0
            ? predictions.reduce((peak, prediction) =>
                prediction.predicted_people > peak.predicted_people
                    ? prediction
                    : peak
            )
            : null;

    const selectedDateLabel = selectedDate
        ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "No forecast date selected";

    if (loading) {
        return (
            <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-5 py-12 sm:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className={`${cardClass} p-8`}>
                        <div className="h-4 w-36 animate-pulse rounded bg-blue-100" />
                        <div className="mt-4 h-9 w-72 max-w-full animate-pulse rounded-lg bg-slate-100" />
                        <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
                        <p className="mt-8 text-sm text-slate-500">
                            Loading prediction locations...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-7xl">
                <section className="relative mb-7 overflow-hidden rounded-3xl border border-blue-100/80 bg-white p-6 shadow-sm sm:p-9">
                    <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-70 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-28 right-1/3 h-48 w-48 rounded-full bg-cyan-100/50 blur-3xl" />

                    <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                                <span className="h-2 w-2 rounded-full bg-violet-500" />
                                Predictive intelligence
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Crowd{" "}
                                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                                    Forecast
                                </span>
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                Explore hourly crowd predictions, compare
                                forecast dates, and review model-generated
                                crowd-risk assessments by location.
                            </p>
                        </div>

                        <div className="relative rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-5 sm:min-w-56">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Selected location
                            </p>
                            <p className="mt-2 text-lg font-bold text-slate-900">
                                {selectedLocation || "No location selected"}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                {selectedDate
                                    ? `Forecast date: ${selectedDate}`
                                    : "Choose a location and date"}
                            </p>
                        </div>
                    </div>
                </section>

                {error && (
                    <div
                        role="alert"
                        className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                    >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold">
                            !
                        </span>
                        <div>
                            <p className="font-semibold">
                                Unable to load forecast data
                            </p>
                            <p className="mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {evaluation && (
                    <section className="mb-7">
                        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                                    Model performance
                                </p>
                                <h2 className="mt-2 text-xl font-bold text-slate-900">
                                    Model evaluation
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Evaluation metrics returned by the
                                    prediction service.
                                </p>
                            </div>

                            <span className="self-start rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:self-auto">
                                {evaluation.model_name} v{evaluation.model_version}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                            <div className={`${cardClass} p-5`}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    MAE
                                </p>
                                <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {evaluation.metrics.mae.toFixed(2)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    People
                                </p>
                            </div>

                            <div className={`${cardClass} p-5`}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    RMSE
                                </p>
                                <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {evaluation.metrics.rmse.toFixed(2)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    People
                                </p>
                            </div>

                            <div className={`${cardClass} p-5`}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    R² Score
                                </p>
                                <p className="mt-3 bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-2xl font-bold text-transparent">
                                    {(evaluation.metrics.r2 * 100).toFixed(2)}%
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Model metric
                                </p>
                            </div>

                            <div className={`${cardClass} p-5`}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Test samples
                                </p>
                                <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {evaluation.test_samples.toLocaleString()}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Evaluation dataset
                                </p>
                            </div>

                            <div className={`${cardClass} col-span-2 p-5 sm:col-span-1`}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Sensors
                                </p>
                                <p className="mt-3 text-2xl font-bold text-slate-900">
                                    {evaluation.sensors.toLocaleString()}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Model evaluation
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                <section className={`${cardClass} mb-7 p-5 sm:p-6`}>
                    <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-6 w-6"
                                aria-hidden="true"
                            >
                                <path d="M3 21h18M5 21V7l8-4v18M13 10h6v11" />
                                <path d="M8 9h2M8 13h2M8 17h2M16 14h1M16 17h1" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-900">
                                Forecast location
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a sensor location to view its available
                                prediction dates.
                            </p>
                        </div>
                    </div>

                    <label
                        htmlFor="prediction-location"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        Location
                    </label>

                    <select
                        id="prediction-location"
                        value={selectedLocation}
                        onChange={(event) =>
                            handleLocationChange(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    >
                        {sensors.map((sensor) => (
                            <option key={sensor.id} value={sensor.location_name}>
                                {sensor.location_name} · {sensor.sensor_code}
                            </option>
                        ))}
                    </select>

                    {sensors.length === 0 && (
                        <p className="mt-3 text-sm text-slate-500">
                            No prediction sensors are available.
                        </p>
                    )}
                </section>

                <section className={`${cardClass} mb-7 p-5 sm:p-6`}>
                    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                                Forecast history
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                Prediction calendar
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a highlighted date to load its hourly
                                forecast.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                aria-label="Previous month"
                                onClick={() =>
                                    setCalendarMonth(
                                        new Date(year, month - 1, 1)
                                    )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                                ←
                            </button>

                            <button
                                type="button"
                                aria-label="Next month"
                                onClick={() =>
                                    setCalendarMonth(
                                        new Date(year, month + 1, 1)
                                    )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    <div className="mx-auto max-w-2xl">
                        <div className="mb-5 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-4 text-center">
                            <p className="text-lg font-bold text-slate-900">
                                {calendarMonth.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {availableDates.size} available forecast dates
                            </p>
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                (day) => (
                                    <div
                                        key={day}
                                        className="py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:text-xs"
                                    >
                                        {day}
                                    </div>
                                )
                            )}

                            {calendarCells.map((day, index) => {
                                if (day === null) {
                                    return (
                                        <div
                                            key={`empty-${index}`}
                                            className="aspect-square"
                                        />
                                    );
                                }

                                const available = isAvailableDate(day);
                                const selected = isSelectedDate(day);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={!available}
                                        onClick={() => selectCalendarDate(day)}
                                        aria-pressed={selected}
                                        aria-label={`${day} ${calendarMonth.toLocaleDateString(
                                            "en-US",
                                            { month: "long", year: "numeric" }
                                        )}${available ? ", forecast available" : ", no forecast available"}`}
                                        className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm font-semibold transition ${selected
                                            ? "border-blue-600 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
                                            : available
                                                ? "border-blue-100 bg-blue-50/70 text-blue-800 hover:border-blue-300 hover:bg-blue-100"
                                                : "cursor-not-allowed border-transparent bg-slate-50 text-slate-300"
                                            }`}
                                    >
                                        {day}
                                        {available && !selected && (
                                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                                Forecast available
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                No forecast
                            </span>
                        </div>
                    </div>
                </section>

                {selectedDate && (
                    <section className="mb-7 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-violet-50 p-5 sm:p-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                    Selected forecast date
                                </p>
                                <h2 className="mt-2 text-lg font-bold text-slate-900 sm:text-xl">
                                    {selectedDateLabel}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {selectedLocation}
                                </p>
                            </div>

                            <div className="rounded-xl border border-white bg-white/80 px-4 py-3 shadow-sm">
                                <p className="text-xs font-medium text-slate-500">
                                    Hourly predictions
                                </p>
                                <p className="mt-1 text-xl font-bold text-slate-900">
                                    {predictionLoading ? "Loading..." : predictions.length}
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                <section className={`${cardClass} mb-7 overflow-hidden`}>
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                                Hourly visualization
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                Predicted crowd trend
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Expected number of people throughout the
                                selected forecast date.
                            </p>
                        </div>

                        <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:self-auto">
                            {predictions.length} data points
                        </span>
                    </div>

                    {predictionLoading ? (
                        <div className="px-6 py-14 text-center text-sm text-slate-500">
                            Loading crowd trend...
                        </div>
                    ) : predictions.length === 0 ? (
                        <div className="px-6 py-14 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-6 w-6"
                                    aria-hidden="true"
                                >
                                    <path d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6" />
                                </svg>
                            </div>
                            <p className="mt-4 text-sm font-semibold text-slate-700">
                                No forecast data to display
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a date with available predictions.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 sm:px-6">
                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                    <p className="text-xs font-medium text-slate-500">
                                        Average predicted crowd
                                    </p>
                                    <p className="mt-2 text-xl font-bold text-slate-900">
                                        {Math.round(averagePrediction).toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        People per forecast interval
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                                    <p className="text-xs font-medium text-slate-500">
                                        Peak predicted crowd
                                    </p>
                                    <p className="mt-2 text-xl font-bold text-slate-900">
                                        {Math.round(
                                            peakPrediction?.predicted_people ?? 0
                                        ).toLocaleString()}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Highest forecast value
                                    </p>
                                </div>

                                <div className="col-span-2 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 p-4 sm:col-span-1">
                                    <p className="text-xs font-medium text-slate-500">
                                        Peak forecast time
                                    </p>
                                    <p className="mt-2 text-lg font-bold text-blue-800">
                                        {peakPrediction
                                            ? formatTime(peakPrediction.forecast_time)
                                            : "—"}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Based on available predictions
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 px-4 py-6 sm:px-6">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        People predicted by hour
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Hover over a bar for details
                                    </p>
                                </div>

                                <div className="overflow-x-auto pb-2">
                                    <div className="flex min-w-[720px] items-end gap-2">
                                        {predictions.map((prediction) => {
                                            const maximum = getMaxPrediction();
                                            const height =
                                                (prediction.predicted_people / maximum) *
                                                100;

                                            return (
                                                <div
                                                    key={prediction.forecast_time}
                                                    className="flex min-w-0 flex-1 flex-col items-center"
                                                >
                                                    <span className="mb-2 text-[10px] font-semibold tabular-nums text-slate-600 sm:text-xs">
                                                        {Math.round(
                                                            prediction.predicted_people
                                                        )}
                                                    </span>

                                                    <div className="flex h-48 w-full items-end justify-center rounded-t-lg bg-slate-50">
                                                        <div
                                                            className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-blue-600 to-violet-400 transition-all duration-300 hover:from-indigo-600 hover:to-cyan-400"
                                                            style={{
                                                                height: `${Math.max(height, 3)}%`,
                                                            }}
                                                            title={`${Math.round(prediction.predicted_people)} people · ${formatTime(prediction.forecast_time)}`}
                                                        />
                                                    </div>

                                                    <span className="mt-2 whitespace-nowrap text-[9px] text-slate-400 sm:text-[10px]">
                                                        {new Date(
                                                            prediction.forecast_time
                                                        ).toLocaleTimeString("en-US", {
                                                            hour: "numeric",
                                                        })}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                <section className={`${cardClass} overflow-hidden`}>
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                                Forecast details
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                24-hour crowd forecast
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Hourly predicted crowd counts and future-risk
                                assessments.
                            </p>
                        </div>

                        {predictions.length > 0 && !predictionLoading && (
                            <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:self-auto">
                                {predictions.length} records
                            </span>
                        )}
                    </div>

                    {predictionLoading ? (
                        <div className="px-6 py-14 text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
                            <p className="mt-4 text-sm text-slate-500">
                                Loading 24-hour forecast...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="px-6 py-12 text-center">
                            <p className="text-sm font-medium text-red-700">
                                Forecast could not be loaded.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">
                                Check the error message above and try selecting
                                the location or date again.
                            </p>
                        </div>
                    ) : predictions.length === 0 ? (
                        <div className="px-6 py-14 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                                No model forecast is available for this date.
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Choose another highlighted date on the calendar.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80">
                                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Forecast time
                                        </th>
                                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Predicted people
                                        </th>
                                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Crowd level
                                        </th>
                                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Risk score
                                        </th>
                                        <th className="px-5 py-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Risk level
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {predictions.map((prediction) => (
                                        <tr
                                            key={prediction.forecast_time}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                                                {formatTime(prediction.forecast_time)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold tabular-nums text-slate-900">
                                                        {Math.round(
                                                            prediction.predicted_people
                                                        ).toLocaleString()}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        people
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getCrowdBadge(
                                                        prediction.crowd_level
                                                    )}`}
                                                >
                                                    {prediction.crowd_level}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span className="font-semibold tabular-nums text-slate-800">
                                                    {prediction.future_risk_score.toFixed(
                                                        1
                                                    )}
                                                </span>
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskBadge(
                                                        prediction.future_risk_level
                                                    )}`}
                                                >
                                                    {prediction.future_risk_level}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-xs text-slate-500 sm:px-6">
                        <span className="font-semibold text-slate-600">
                            Risk legend
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Safe
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Warning
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            High
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Critical
                        </span>
                    </div>
                </section>

                <footer className="py-8 text-center text-xs text-slate-400">
                    CrowdManagement AI
                    <span className="mx-2 text-slate-300">·</span>
                    Predictive Crowd Intelligence
                </footer>
            </div>
        </div>
    );
}