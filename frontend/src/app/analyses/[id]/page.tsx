
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Analysis {
  id: number;
  video_id: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  total_frames: number | null;
  frames_processed: number;
  avg_people_count: number | null;
  max_people_count: number | null;
  avg_density: number | null;
  max_density: number | null;
  avg_flow_rate: number | null;
  max_risk_score: number | null;
}

export default function AnalysisDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const analysisId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');

  const fetchAnalysis = useCallback(async () => {
    if (!analysisId || !/^\d+$/.test(analysisId)) {
      setError('Invalid analysis ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/analysis/${analysisId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setError('You are not authorized to view this analysis.');
        } else if (response.status === 404) {
          setError('Analysis not found. It may have been deleted.');
        } else {
          setError('Failed to fetch analysis details.');
        }
        return;
      }

      const data: Analysis = await response.json();
      setAnalysis(data);
    } catch {
      setError('Cannot connect to the backend. Check that the server is running.');
    } finally {
      setLoading(false);
    }
  }, [analysisId]);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);
  useEffect(() => {
    if (!analysis?.video_id) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    async function loadVideo() {
      setVideoLoading(true);
      setVideoError('');
      setVideoUrl(null);

      try {
        const token = localStorage.getItem('access_token');

        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }

        const response = await fetch(
          `http://localhost:8000/api/videos/${analysis!.video_id}/stream`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'The original video file could not be found.'
              : 'Unable to load the video.'
          );
        }

        const videoBlob = await response.blob();
        objectUrl = URL.createObjectURL(videoBlob);
        setVideoUrl(objectUrl);
      } catch (err) {
        if (controller.signal.aborted) return;

        setVideoError(
          err instanceof Error
            ? err.message
            : 'Unable to load the video.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setVideoLoading(false);
        }
      }
    }

    void loadVideo();

    return () => {
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [analysis?.video_id]);

  const statusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'running':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'failed':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'pending':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
      default:
        return 'bg-slate-100 text-slate-600 ring-slate-500/20';
    }
  };

  const riskStyle = (risk: number | null) => {
    if (risk === null) return 'text-slate-400';
    if (risk >= 76) return 'text-red-600';
    if (risk >= 56) return 'text-orange-600';
    if (risk >= 31) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const formatNumber = (
    value: number | null,
    digits = 1
  ) => value == null ? '—' : value.toFixed(digits);

  const formatDate = (value: string | null) => {
    if (!value) return 'Not available';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'Not available'
      : date.toLocaleString();
  };

  const progress = analysis?.total_frames && analysis.total_frames > 0
    ? Math.min(
      100,
      Math.max(
        0,
        (analysis.frames_processed / analysis.total_frames) * 100
      )
    )
    : null;

  const metrics = analysis
    ? [
      {
        label: 'Maximum people',
        value: analysis.max_people_count ?? '—',
        description: 'Highest detected count',
        accent: 'from-blue-500 to-indigo-500',
        icon: 'people',
      },
      {
        label: 'Average people',
        value: formatNumber(analysis.avg_people_count, 1),
        description: 'Average across processed frames',
        accent: 'from-violet-500 to-purple-500',
        icon: 'average',
      },
      {
        label: 'Average density',
        value: formatNumber(analysis.avg_density, 3),
        description: 'Average recorded crowd density',
        accent: 'from-cyan-500 to-blue-500',
        icon: 'density',
      },
      {
        label: 'Maximum risk',
        value: formatNumber(analysis.max_risk_score, 1),
        description: 'Highest recorded risk score',
        accent: 'from-orange-500 to-red-500',
        icon: 'risk',
      },
      {
        label: 'Maximum density',
        value: formatNumber(analysis.max_density, 3),
        description: 'Highest recorded crowd density',
        accent: 'from-fuchsia-500 to-violet-500',
        icon: 'density',
      },
      {
        label: 'Average flow rate',
        value: formatNumber(analysis.avg_flow_rate, 2),
        description: 'Average recorded crowd flow',
        accent: 'from-emerald-500 to-teal-500',
        icon: 'flow',
      },
    ]
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute -left-40 top-72 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/analyses')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-700"
        >
          <span aria-hidden="true">←</span>
          Back to Analysis History
        </button>

        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              VIDEO ANALYTICS
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Analysis Details
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              View processing information and crowd safety metrics for this
              analysis.
            </p>

            {analysisId && (
              <p className="mt-2 text-sm font-medium text-slate-400">
                Analysis ID: #{analysisId}
              </p>
            )}
          </div>

          <button
            onClick={() => void fetchAnalysis()}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7v5h-5M4 17v-5h5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.5 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.5-3"
              />
            </svg>
            Refresh details
          </button>
        </header>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading analysis details...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Retrieving analysis #{analysisId}
            </p>
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 font-bold text-red-600">
                !
              </span>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Unable to load analysis
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {error}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => void fetchAnalysis()}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Try again
                  </button>

                  <button
                    onClick={() => router.push('/analyses')}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back to history
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && analysis && (
          <>
            <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Processing status
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${statusStyle(analysis.status)}`}
                    >
                      <span className="mr-2 h-2 w-2 rounded-full bg-current" />
                      {analysis.status.toUpperCase()}
                    </span>

                    <span className="text-sm text-slate-400">
                      Video ID: #{analysis.video_id}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right">
                  <p className="text-sm text-slate-500">Started at</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(analysis.started_at)}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Completed: {formatDate(analysis.completed_at)}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">
                    Frame processing
                  </p>

                  <p className="text-sm font-semibold text-slate-700">
                    {analysis.frames_processed.toLocaleString()}
                    {analysis.total_frames != null
                      ? ` / ${analysis.total_frames.toLocaleString()}`
                      : ' frames'}
                  </p>
                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Frame processing progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress ?? 0}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
                    style={{ width: `${progress ?? 0}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {progress == null
                    ? 'Total frame count is not available.'
                    : `${progress.toFixed(1)}% of frames processed`}
                </p>
              </div>
            </section>

            <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-bold text-slate-900">
                  Source video
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the original video used for this crowd analysis.
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  Video ID: #{analysis.video_id}
                </p>
              </div>

              <div className="bg-slate-950 p-3 sm:p-5">
                {videoLoading && (
                  <div className="flex min-h-64 flex-col items-center justify-center text-white">
                    <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                    <p className="mt-4 text-sm text-slate-300">
                      Loading video...
                    </p>
                  </div>
                )}

                {!videoLoading && videoError && (
                  <div className="flex min-h-48 flex-col items-center justify-center text-center">
                    <p className="font-semibold text-white">
                      Video unavailable
                    </p>
                    <p className="mt-2 max-w-lg text-sm text-slate-300">
                      {videoError}
                    </p>
                  </div>
                )}

                {!videoLoading && !videoError && videoUrl && (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="mx-auto max-h-[650px] w-full rounded-xl bg-black"
                  >
                    Your browser does not support HTML video playback.
                  </video>
                )}
              </div>
            </section>


            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Crowd analytics
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Metrics reported by the analysis service.
              </p>
            </div>

            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`h-1 bg-gradient-to-r ${metric.accent}`} />

                  <div className="p-5">
                    <p className="text-sm font-medium text-slate-500">
                      {metric.label}
                    </p>

                    <p
                      className={`mt-3 text-3xl font-bold tracking-tight ${metric.icon === 'risk'
                        ? riskStyle(analysis.max_risk_score)
                        : 'text-slate-900'
                        }`}
                    >
                      {metric.value}
                      {metric.icon === 'risk' &&
                        analysis.max_risk_score != null && (
                          <span className="ml-1 text-sm font-medium text-slate-400">
                            / 100
                          </span>
                        )}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      {metric.description}
                    </p>
                  </div>
                </div>
              ))}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <h2 className="font-semibold text-slate-900">
                  Analysis information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Additional processing details for this record.
                </p>
              </div>

              <dl className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-sm text-slate-500">Analysis ID</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    #{analysis.id}
                  </dd>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-sm text-slate-500">Video ID</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    #{analysis.video_id}
                  </dd>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-sm text-slate-500">Maximum density</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatNumber(analysis.max_density, 3)}
                  </dd>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <dt className="text-sm text-slate-500">Average flow rate</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {formatNumber(analysis.avg_flow_rate, 2)}
                  </dd>
                </div>
              </dl>
            </section>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/analyses')}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                ← Analysis History
              </button>

              <button
                onClick={() => router.push('/videoprocessing')}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700"
              >
                Process another video
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
