"use client";

import { useEffect, useMemo, useState } from "react";

interface Sensor {
    id: number;
    sensor_code: string;
    location_name: string;
    location_type: string;
}

interface HistoryRecord {
    timestamp: string;
    people_count: number;
}

interface HistoryResponse {
    sensor: {
        sensor_id: number;
        sensor_code: string;
        location_name: string;
        location_type: string;
    } | null;
    date: string;
    total_records: number;
    records: HistoryRecord[];
}

export default function PredictionsPage() {
    const [sensors, setSensors] = useState<Sensor[]>([]);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [selectedSensorId, setSelectedSensorId] = useState<number | null>(
        null
    );

    const [availableDates, setAvailableDates] = useState<Set<string>>(
        new Set()
    );
    const [selectedDate, setSelectedDate] = useState("");
    const [calendarMonth, setCalendarMonth] = useState(new Date());

    const [history, setHistory] = useState<HistoryResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [error, setError] = useState("");

    // =========================================================
    // LOAD LOCATIONS FROM THE ACTUAL DATASET
    // =========================================================

    useEffect(() => {
        const fetchSensors = async () => {
            try {
                const response = await fetch(
                    "http://127.0.0.1:8000/api/history/sensors"
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch dataset locations");
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
                setError("Failed to load dataset locations");
            } finally {
                setLoading(false);
            }
        };

        fetchSensors();
    }, []);

    // =========================================================
    // LOAD DATES THAT ACTUALLY EXIST FOR THIS LOCATION
    // =========================================================

    useEffect(() => {
        if (selectedSensorId === null) return;

        const fetchAvailableDates = async () => {
            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/api/history/available-dates?sensor_id=${selectedSensorId}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch available dates");
                }

                const result = await response.json();
                const dates: string[] = result.dates ?? [];

                setAvailableDates(new Set(dates));

                if (dates.length > 0) {
                    /*
                     * Start with the latest date available in the
                     * actual dataset for the selected location.
                     */
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
                } else {
                    setSelectedDate("");
                }
            } catch (err) {
                console.error(err);
                setAvailableDates(new Set());
                setSelectedDate("");
            }
        };

        fetchAvailableDates();
    }, [selectedSensorId]);

    // =========================================================
    // LOAD THE 24-HOUR DATA FOR THE SELECTED DATE
    // =========================================================

    useEffect(() => {
        if (selectedSensorId === null || !selectedDate) return;

        const fetchDayData = async () => {
            setHistoryLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `http://127.0.0.1:8000/api/history?sensor_id=${selectedSensorId}&selected_date=${selectedDate}`
                );

                if (!response.ok) {
                    throw new Error("Failed to fetch 24-hour dataset");
                }

                const result: HistoryResponse = await response.json();

                setHistory(result);
            } catch (err) {
                console.error(err);
                setHistory(null);
                setError("Failed to load 24-hour dataset");
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchDayData();
    }, [selectedSensorId, selectedDate]);

    // =========================================================
    // LOCATION CHANGE
    // =========================================================

    const handleLocationChange = (
        locationName: string
    ) => {
        const sensor = sensors.find(
            (item) =>
                item.location_name === locationName
        );

        setSelectedLocation(locationName);
        setSelectedSensorId(sensor?.id ?? null);
        setHistory(null);
        setSelectedDate("");
    };

    // =========================================================
    // CALENDAR
    // =========================================================

    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");
        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(
        year,
        month,
        1
    ).getDay();

    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const calendarCells = [
        ...Array(firstDay).fill(null),
        ...Array.from(
            { length: daysInMonth },
            (_, index) => index + 1
        ),
    ];

    const isAvailableDate = (day: number) => {
        return availableDates.has(
            formatDate(
                new Date(year, month, day)
            )
        );
    };

    const isSelectedDate = (day: number) => {
        return (
            selectedDate ===
            formatDate(
                new Date(year, month, day)
            )
        );
    };

    const selectCalendarDate = (day: number) => {
        const date = new Date(year, month, day);
        const formatted = formatDate(date);

        if (!availableDates.has(formatted)) {
            return;
        }

        /*
         * This immediately causes /api/history to load the
         * actual 24-hour records for this selected date.
         */
        setSelectedDate(formatted);
    };

    // =========================================================
    // DATA-DERIVED SUMMARY
    // =========================================================

    const peakCrowd = useMemo(() => {
        if (!history?.records.length) return 0;

        return Math.max(
            ...history.records.map(
                (record) => record.people_count
            )
        );
    }, [history]);

    const averageCrowd = useMemo(() => {
        if (!history?.records.length) return 0;

        const total = history.records.reduce(
            (sum, record) =>
                sum + record.people_count,
            0
        );

        return Math.round(
            total / history.records.length
        );
    }, [history]);

    const getCrowdLevel = (count: number) => {
        if (count <= 100) return "Low";
        if (count <= 300) return "Moderate";
        if (count <= 500) return "High";
        return "Very High";
    };

    const getCrowdBadge = (level: string) => {
        switch (level) {
            case "Low":
                return "bg-green-500/15 text-green-400 border border-green-500/30";

            case "Moderate":
                return "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30";

            case "High":
                return "bg-orange-500/15 text-orange-400 border border-orange-500/30";

            case "Very High":
                return "bg-red-500/15 text-red-400 border border-red-500/30";

            default:
                return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
        }
    };

    const formatTime = (timestamp: string) => {
        return new Intl.DateTimeFormat("en-AU", {
            timeZone: "Australia/Melbourne",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        }).format(new Date(timestamp));
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0f14] p-6 text-white">
                <h1 className="text-3xl font-bold">
                    Crowd Forecast
                </h1>

                <p className="mt-3 text-gray-500">
                    Loading dataset...
                </p>
            </div>
        );
    }

    // =========================================================
    // PAGE
    // =========================================================

    return (
        <div className="min-h-screen bg-[#0b0f14] p-6 text-white">
            <div className="mx-auto max-w-6xl">

                {/* HEADER */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">
                        Crowd Forecast
                    </h1>

                    <p className="mt-2 text-gray-400">
                        24-hour crowd data from the dataset
                    </p>
                </div>

                {/* LOCATION */}
                <section className="mb-6 rounded-2xl border border-gray-800 bg-[#11161d] p-5 shadow-xl">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Location
                    </label>

                    <select
                        value={selectedLocation}
                        onChange={(event) =>
                            handleLocationChange(
                                event.target.value
                            )
                        }
                        className="w-full rounded-xl border border-gray-700 bg-[#0b0f14] px-4 py-3 text-white outline-none focus:border-blue-500"
                    >
                        {sensors.map((sensor) => (
                            <option
                                key={sensor.id}
                                value={sensor.location_name}
                                className="bg-[#0b0f14] text-white"
                            >
                                {sensor.location_name}
                            </option>
                        ))}
                    </select>
                </section>

                {/* CALENDAR */}
                <section className="mb-6 rounded-2xl border border-gray-800 bg-[#11161d] p-5 shadow-xl">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                Calendar
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Select a date available in the dataset
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setCalendarMonth(
                                        new Date(
                                            year,
                                            month - 1,
                                            1
                                        )
                                    )
                                }
                                className="rounded-lg border border-gray-700 px-3 py-2 text-gray-300 hover:bg-[#172033]"
                            >
                                ←
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setCalendarMonth(
                                        new Date(
                                            year,
                                            month + 1,
                                            1
                                        )
                                    )
                                }
                                className="rounded-lg border border-gray-700 px-3 py-2 text-gray-300 hover:bg-[#172033]"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    <div className="mb-4 text-center text-lg font-semibold">
                        {calendarMonth.toLocaleDateString(
                            "en-US",
                            {
                                month: "long",
                                year: "numeric",
                            }
                        )}
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center">
                        {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                        ].map((day) => (
                            <div
                                key={day}
                                className="py-2 text-xs font-semibold uppercase text-gray-600"
                            >
                                {day}
                            </div>
                        ))}

                        {calendarCells.map(
                            (day, index) => {
                                if (day === null) {
                                    return (
                                        <div
                                            key={`empty-${index}`}
                                            className="min-h-[48px]"
                                        />
                                    );
                                }

                                const available =
                                    isAvailableDate(day);

                                const selected =
                                    isSelectedDate(day);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        disabled={!available}
                                        onClick={() =>
                                            selectCalendarDate(
                                                day
                                            )
                                        }
                                        className={`min-h-[48px] rounded-lg border p-2 text-sm transition ${selected
                                                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                                                : available
                                                    ? "border-transparent text-gray-300 hover:border-gray-700 hover:bg-[#172033]"
                                                    : "cursor-not-allowed border-transparent text-gray-700 opacity-40"
                                            }`}
                                    >
                                        {day}
                                    </button>
                                );
                            }
                        )}
                    </div>
                </section>

                {/* SELECTED DATE */}
                {selectedDate && (
                    <div className="mb-6 rounded-xl border border-gray-800 bg-[#11161d] px-5 py-4">
                        <p className="text-xs uppercase tracking-wider text-gray-600">
                            Selected Date
                        </p>

                        <p className="mt-1 text-lg font-semibold">
                            {new Date(
                                `${selectedDate}T00:00:00`
                            ).toLocaleDateString(
                                "en-US",
                                {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }
                            )}
                        </p>
                    </div>
                )}

                {/* 24-HOUR DATA */}
                <section className="overflow-hidden rounded-2xl border border-gray-800 bg-[#11161d] shadow-xl">
                    <div className="border-b border-gray-800 px-5 py-5 sm:px-6">
                        <h2 className="text-xl font-semibold">
                            24-Hour Crowd Forecast
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Actual hourly people count from the dataset
                        </p>
                    </div>

                    {/* SUMMARY */}
                    <div className="grid border-b border-gray-800 sm:grid-cols-3">
                        <div className="border-b border-gray-800 px-5 py-4 sm:border-b-0 sm:border-r">
                            <p className="text-xs uppercase tracking-wider text-gray-600">
                                Records
                            </p>

                            <p className="mt-1 text-xl font-semibold">
                                {history?.total_records ?? 0}
                            </p>
                        </div>

                        <div className="border-b border-gray-800 px-5 py-4 sm:border-b-0 sm:border-r">
                            <p className="text-xs uppercase tracking-wider text-gray-600">
                                Peak Crowd
                            </p>

                            <p className="mt-1 text-xl font-semibold">
                                {peakCrowd}
                            </p>
                        </div>

                        <div className="px-5 py-4">
                            <p className="text-xs uppercase tracking-wider text-gray-600">
                                Average Crowd
                            </p>

                            <p className="mt-1 text-xl font-semibold">
                                {averageCrowd}
                            </p>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div className="px-6 py-14 text-center">
                            <p className="text-sm text-gray-500">
                                Loading 24-hour data...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="px-6 py-14 text-center">
                            <p className="text-sm text-red-400">
                                {error}
                            </p>
                        </div>
                    ) : !history?.records.length ? (
                        <div className="px-6 py-14 text-center">
                            <p className="text-sm text-gray-500">
                                No data is available for this date.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px]">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-[#151b24] text-left">
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Time
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            People Count
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                            Crowd Level
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {history.records.map(
                                        (record) => {
                                            const level =
                                                getCrowdLevel(
                                                    record.people_count
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        record.timestamp
                                                    }
                                                    className="border-b border-gray-800 last:border-0 hover:bg-[#151b24]"
                                                >
                                                    <td className="px-5 py-4 text-sm text-gray-300">
                                                        {formatTime(
                                                            record.timestamp
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-4 text-sm font-semibold">
                                                        {
                                                            record.people_count
                                                        }{" "}
                                                        people
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getCrowdBadge(
                                                                level
                                                            )}`}
                                                        >
                                                            {level}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
