"use client";

import { useEffect, useRef, useState } from "react";

type UploadStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "error";

type AnalysisData = {
  id: number;
  status: string;
  total_frames?: number;
  frames_processed?: number;
  error_message?: string;
};

const API_URL = "http://localhost:8000";

const pipelineStages = [
  "Video Upload",
  "Frame Extraction",
  "YOLO Detection",
  "Object Tracking",
  "Crowd Counting",
  "Density Analysis",
  "Flow Analysis",
  "Bottleneck Detection",
  "Risk Assessment",
  "Alert Generation",
];

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const pollingInProgressRef = useRef(false);

  const clearPolling = () => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    pollingInProgressRef.current = false;
  };

  useEffect(() => {
    return () => {
      clearPolling();
      xhrRef.current?.abort();
    };
  }, []);

  const resetProgress = () => {
    setUploadProgress(0);
    setProcessingProgress(0);
    setAnalysisId(null);
  };

  const acceptFile = (file?: File) => {
    if (!file) return;

    const allowedExtensions = /\.(mp4|avi|mov|mkv|webm)$/i;

    if (!allowedExtensions.test(file.name)) {
      setSelectedFile(null);
      setUploadStatus("error");
      setUploadMessage(
        "Unsupported video format. Please select MP4, AVI, MOV, MKV, or WEBM."
      );
      return;
    }

    setSelectedFile(file);
    setUploadStatus("idle");
    setUploadMessage("");
    resetProgress();
  };

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    acceptFile(event.target.files?.[0]);

    // Allow selecting the same file again.
    event.target.value = "";
  };

  const handleCancel = () => {
    const wasUploading = uploadStatus === "uploading";

    clearPolling();

    if (xhrRef.current) {
      const xhr = xhrRef.current;
      xhrRef.current = null;
      xhr.abort();
    }

    setUploadStatus("idle");
    setUploadMessage(
      wasUploading
        ? "Upload cancelled."
        : "Progress monitoring stopped. Any analysis already running on the backend may continue."
    );

    setUploadProgress(0);
    setProcessingProgress(0);
  };

  const pollAnalysisProgress = (id: number) => {
    clearPolling();

    const checkProgress = async () => {
      if (pollingInProgressRef.current) return;

      pollingInProgressRef.current = true;

      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          clearPolling();
          setUploadStatus("error");
          setUploadMessage("Authentication required. Please log in again.");
          return;
        }

        const response = await fetch(`${API_URL}/api/analysis/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          clearPolling();
          setUploadStatus("error");
          setUploadMessage("Authentication failed. Please log in again.");
          return;
        }

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data: AnalysisData = await response.json();

        if (
          typeof data.total_frames === "number" &&
          data.total_frames > 0 &&
          typeof data.frames_processed === "number"
        ) {
          const progress = Math.min(
            100,
            Math.round(
              (data.frames_processed / data.total_frames) * 100
            )
          );

          setProcessingProgress(progress);
          setUploadMessage(`Analyzing video... ${progress}%`);
        } else {
          setUploadMessage("Analyzing video... Please wait.");
        }

        if (data.status === "completed") {
          clearPolling();
          setProcessingProgress(100);
          setUploadStatus("success");
          setUploadMessage("Analysis completed successfully! Your results are ready.");
        } else if (data.status === "failed") {
          clearPolling();
          setUploadStatus("error");
          setUploadMessage(
            `Analysis failed: ${data.error_message || "Unknown error"}`
          );
        }
      } catch (error) {
        clearPolling();
        setUploadStatus("error");
        setUploadMessage(
          error instanceof Error
            ? error.message
            : "Failed to check analysis status."
        );
      } finally {
        pollingInProgressRef.current = false;
      }
    };

    void checkProgress();
    pollIntervalRef.current = setInterval(() => {
      void checkProgress();
    }, 2000);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const token = localStorage.getItem("access_token");

    if (!token) {
      setUploadStatus("error");
      setUploadMessage("Authentication required. Please log in again.");
      return;
    }

    clearPolling();
    setAnalysisId(null);
    setUploadStatus("uploading");
    setUploadMessage("Preparing your video...");
    setUploadProgress(0);
    setProcessingProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;

      const progress = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(progress);
      setUploadMessage(`Uploading video... ${progress}%`);
    });

    xhr.addEventListener("load", async () => {
      if (xhrRef.current === xhr) {
        xhrRef.current = null;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        let detail = "The server could not upload this video.";

        try {
          const error = JSON.parse(xhr.responseText);
          detail = error.detail || detail;
        } catch {
          // Keep the fallback message when the response is not JSON.
        }

        setUploadStatus("error");
        setUploadMessage(`Upload failed: ${detail}`);
        return;
      }

      let videoData: { id?: number };

      try {
        videoData = JSON.parse(xhr.responseText);
      } catch {
        setUploadStatus("error");
        setUploadMessage("The server returned an invalid upload response.");
        return;
      }

      if (videoData.id == null) {
        setUploadStatus("error");
        setUploadMessage("Upload succeeded, but no video ID was returned.");
        return;
      }

      setUploadProgress(100);
      setUploadStatus("processing");
      setUploadMessage("Video uploaded. Starting crowd analysis...");

      try {
        const analysisResponse = await fetch(
          `${API_URL}/api/analysis/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ video_id: videoData.id }),
          }
        );

        if (!analysisResponse.ok) {
          let detail = "Unable to start the analysis.";

          try {
            const error = await analysisResponse.json();
            detail = error.detail || detail;
          } catch {
            // Use the fallback message.
          }

          setUploadStatus("error");
          setUploadMessage(`Analysis failed: ${detail}`);
          return;
        }

        const analysisData: AnalysisData = await analysisResponse.json();

        if (analysisData.id == null) {
          setUploadStatus("error");
          setUploadMessage(
            "The server did not return an analysis ID."
          );
          return;
        }

        setAnalysisId(analysisData.id);
        setUploadMessage("Analysis started. Processing video frames...");
        pollAnalysisProgress(analysisData.id);
      } catch {
        setUploadStatus("error");
        setUploadMessage(
          "Analysis failed: Could not connect to the backend."
        );
      }
    });

    xhr.addEventListener("error", () => {
      if (xhrRef.current === xhr) {
        xhrRef.current = null;
      }

      setUploadStatus("error");
      setUploadMessage("Upload failed. Check your backend connection.");
    });

    xhr.addEventListener("abort", () => {
      if (xhrRef.current === xhr) {
        xhrRef.current = null;
      }
    });

    xhr.open("POST", `${API_URL}/api/videos/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleRetry = () => {
    clearPolling();

    if (xhrRef.current) {
      const xhr = xhrRef.current;
      xhrRef.current = null;
      xhr.abort();
    }

    setUploadStatus("idle");
    setUploadMessage("");
    resetProgress();
  };

  const isBusy =
    uploadStatus === "uploading" || uploadStatus === "processing";

  const activeProgress =
    uploadStatus === "uploading"
      ? uploadProgress
      : processingProgress;

  const statusStyles: Record<UploadStatus, string> = {
    idle: "bg-slate-100 text-slate-600",
    uploading: "bg-blue-50 text-blue-700",
    processing: "bg-violet-50 text-violet-700",
    success: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
  };

  const statusLabels: Record<UploadStatus, string> = {
    idle: "Ready to upload",
    uploading: "Uploading",
    processing: "Processing",
    success: "Completed",
    error: "Needs attention",
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="relative mb-8 overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 opacity-80 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Video intelligence
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Video{" "}
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  Processing
                </span>
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Upload recorded footage to detect people, analyze crowd
                movement, and evaluate potential crowd-safety risks.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 md:self-auto">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Analysis workspace
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Crowd detection pipeline
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                  Step 01
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
                  Upload video
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Select a supported video file to begin analysis.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    d="M12 16V4m0 0L7 9m5-5 5 5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.avi,.mov,.mkv,.webm,video/*"
              onChange={handleFileSelect}
              disabled={isBusy}
              className="hidden"
              aria-label="Choose video file"
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isBusy) setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                if (!isBusy) acceptFile(event.dataTransfer.files?.[0]);
              }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-10 ${isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-gradient-to-br from-slate-50/80 to-blue-50/40 hover:border-blue-300 hover:bg-blue-50/40"
                } ${isBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-8 w-8"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="13" height="14" rx="2" />
                  <path
                    d="m16 10 5-3v10l-5-3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m8 10 4 2-4 2v-4Z"
                    fill="currentColor"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="mt-5 text-base font-semibold text-slate-800">
                {isDragging
                  ? "Drop your video here"
                  : selectedFile
                    ? "Video selected"
                    : "Drag and drop your video"}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Or browse your computer to select a file.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Browse files
              </button>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["MP4", "AVI", "MOV", "MKV", "WEBM"].map((format) => (
                  <span
                    key={format}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold tracking-wide text-slate-500"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>

            {selectedFile && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6M8 13h8M8 17h8" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      <span className="mx-2">·</span>
                      Ready for upload
                    </p>
                  </div>

                  {!isBusy && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadStatus("idle");
                        setUploadMessage("");
                        resetProgress();
                      }}
                      className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {uploadStatus === "idle" && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/25"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 16V4m0 0L7 9m5-5 5 5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Upload and analyze
                  </button>
                )}
              </div>
            )}

            {isBusy && (
              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {uploadStatus === "uploading"
                        ? "Uploading video"
                        : "Analyzing crowd activity"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {uploadStatus === "uploading"
                        ? "Sending your video to the backend."
                        : analysisId
                          ? `Analysis ID: ${analysisId}`
                          : "Initializing analysis..."}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-blue-700">
                    {uploadStatus === "uploading"
                      ? `${Math.round(uploadProgress)}%`
                      : processingProgress > 0
                        ? `${processingProgress}%`
                        : "Working"}
                  </span>
                </div>

                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100"
                  role="progressbar"
                  aria-label={
                    uploadStatus === "uploading"
                      ? "Video upload progress"
                      : "Video processing progress"
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={activeProgress}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-500 transition-all duration-300 ${uploadStatus === "processing" &&
                      processingProgress === 0
                      ? "w-1/3 animate-pulse"
                      : ""
                      }`}
                    style={{
                      width:
                        uploadStatus === "processing" &&
                          processingProgress === 0
                          ? undefined
                          : `${activeProgress}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  {uploadMessage}
                </p>

                <button
                  type="button"
                  onClick={handleCancel}
                  className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  {uploadStatus === "uploading"
                    ? "Cancel upload"
                    : "Stop monitoring"}
                </button>
              </div>
            )}

            {uploadMessage && !isBusy && (
              <div
                role="status"
                className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${uploadStatus === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : uploadStatus === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
              >
                <span className="font-bold">
                  {uploadStatus === "error"
                    ? "!"
                    : uploadStatus === "success"
                      ? "✓"
                      : "i"}
                </span>
                <span>{uploadMessage}</span>
              </div>
            )}

            {uploadStatus === "error" && (
              <button
                type="button"
                onClick={handleRetry}
                className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Try again
              </button>
            )}


            {uploadStatus === "success" && (
              <div className="mt-4 space-y-3">
                <a
                  href={`/analyses/${analysisId}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
                >
                  View Analysis Results
                  <span>→</span>
                </a>

                <a
                  href="/dashboard"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
                >
                  View Analytics Dashboard
                  <span>↗</span>
                </a>

                <button
                  type="button"
                  onClick={handleRetry}
                  className="w-full rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  Analyze Another Video
                </button>
              </div>
            )}


            <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <span className="font-bold">Note</span>
              <span>
                Analysis duration depends on video length, resolution, and
                backend processing performance. Keep the backend running
                while uploading and analyzing.
              </span>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
                    Current job
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">
                    Analysis status
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${statusStyles[uploadStatus]}`}
                >
                  {statusLabels[uploadStatus]}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${uploadStatus === "uploading"
                      ? "animate-pulse bg-blue-500"
                      : uploadProgress === 100
                        ? "bg-emerald-500"
                        : "bg-slate-300"
                      }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Video upload
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {uploadStatus === "uploading"
                        ? `${Math.round(uploadProgress)}% transferred`
                        : uploadProgress === 100
                          ? "Upload completed"
                          : selectedFile
                            ? "Ready to upload"
                            : "Waiting for a video"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${uploadStatus === "processing"
                      ? "animate-pulse bg-violet-500"
                      : uploadStatus === "success"
                        ? "bg-emerald-500"
                        : uploadStatus === "error" && analysisId
                          ? "bg-red-500"
                          : "bg-slate-300"
                      }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Crowd analysis
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {uploadStatus === "processing"
                        ? processingProgress > 0
                          ? `${processingProgress}% processed`
                          : "Initializing processing"
                        : uploadStatus === "success"
                          ? "Completed"
                          : analysisId
                            ? "Check status message"
                            : "Waiting for upload"}
                    </p>
                  </div>
                </div>
              </div>

              {analysisId !== null && (
                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Analysis reference
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
                    #{analysisId}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
                Workflow
              </p>
              <h2 className="mt-2 text-lg font-bold text-slate-900">
                Processing pipeline
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The analysis workflow includes these processing stages.
              </p>

              <div className="mt-5 space-y-0">
                {pipelineStages.map((stage, index) => (
                  <div key={stage} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${uploadStatus === "processing" &&
                          index === 2
                          ? "bg-blue-600 text-white"
                          : uploadStatus === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {uploadStatus === "success" ? "✓" : index + 1}
                      </span>
                      {index < pipelineStages.length - 1 && (
                        <span className="my-1 h-4 w-px bg-slate-200" />
                      )}
                    </div>

                    <p className="pt-1 text-sm text-slate-600">
                      {stage}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Explore your results
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Visit the existing pages to review completed analyses and
                available crowd metrics.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/analyses"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                Analysis history
                <span>→</span>
              </a>

              <a
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
              >
                Analytics dashboard
                <span>↗</span>
              </a>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          CrowdManagement AI
          <span className="mx-2 text-slate-300">·</span>
          Crowd Management &amp; Stampede Prevention
        </footer>
      </div>
    </div>
  );
}