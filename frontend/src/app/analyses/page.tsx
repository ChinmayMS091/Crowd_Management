
'use client';

import { useState, useEffect } from 'react';

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

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      setError('');

      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/analysis/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(data);
      } else if (response.status === 401 || response.status === 403) {
        setError('You are not authorized to view analyses.');
      } else {
        setError('Failed to fetch analyses.');
      }
    } catch {
      setError('Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      setDeletingId(id);

      const token = localStorage.getItem('access_token');

      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/analysis/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setAnalyses((current) =>
          current.filter((analysis) => analysis.id !== id)
        );
      } else {
        alert('Failed to delete analysis.');
      }
    } catch {
      alert('Failed to connect to backend.');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusStyle = (status: string) => {
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

  const getRiskStyle = (riskScore: number | null) => {
    if (riskScore === null) return 'text-slate-400';
    if (riskScore >= 76) return 'text-red-600';
    if (riskScore >= 56) return 'text-orange-600';
    if (riskScore >= 31) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const formatValue = (value: number | null | undefined) =>
    value == null ? '—' : value.toFixed(1);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute -left-40 top-64 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <button
            onClick={() => window.location.assign('/')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Back to Home
          </button>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                VIDEO ANALYTICS
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Analysis History
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Review previous video analyses, monitor processing status,
                and inspect crowd safety metrics.
              </p>
            </div>

            <button
              onClick={() => void fetchAnalyses()}
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
              Refresh
            </button>
          </div>
        </header>

        {!loading && !error && (
          <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Total analyses
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {analyses.length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Available in your history
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">
                {analyses.filter((item) => item.status.toLowerCase() === 'completed').length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Successfully processed
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                In progress
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {analyses.filter((item) =>
                  ['running', 'pending'].includes(item.status.toLowerCase())
                ).length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Running or awaiting processing
              </p>
            </div>
          </section>
        )}

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              Loading analyses...
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Retrieving your video analysis history
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 font-bold text-red-700">
                !
              </span>
              <div className="flex-1">
                <h2 className="font-semibold text-red-800">
                  Unable to load analyses
                </h2>
                <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
                <button
                  onClick={() => void fetchAnalyses()}
                  className="mt-3 text-sm font-semibold text-red-800 underline underline-offset-4 hover:text-red-900"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && analyses.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-blue-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 9h8M8 13h5M8 17h3"
                />
              </svg>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              No analyses found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Once you upload and process a video, its analysis results will
              appear here.
            </p>
            <button
              onClick={() => window.location.assign('/videoprocessing')}
              className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700"
            >
              Process a video
            </button>
          </div>
        )}

        {!loading && !error && analyses.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Previous analyses
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select an analysis to view its details.
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {analyses.length} {analyses.length === 1 ? 'record' : 'records'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      'Analysis',
                      'Status',
                      'Started',
                      'Max people',
                      'Avg density',
                      'Max risk',
                      'Progress',
                      'Actions',
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {analyses.map((analysis, index) => (
                    <tr
                      key={analysis.id}
                      className="transition hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-semibold text-slate-800">
                          #{analysis.id}
                        </span>
                        <p className="mt-1 text-xs text-slate-400">
                          Record {index + 1}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyle(analysis.status)}`}
                        >
                          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                          {analysis.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {new Date(analysis.started_at).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {analysis.max_people_count ?? '—'}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {analysis.avg_density == null
                          ? '—'
                          : analysis.avg_density.toFixed(3)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`text-sm font-bold ${getRiskStyle(analysis.max_risk_score)}`}
                        >
                          {formatValue(analysis.max_risk_score)}
                        </span>
                        {analysis.max_risk_score != null && (
                          <span className="ml-1 text-xs text-slate-400">
                            / 100
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {analysis.total_frames != null &&
                          analysis.total_frames > 0 ? (
                          <div className="w-32">
                            <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                              <span>
                                {analysis.frames_processed.toLocaleString()} /{' '}
                                {analysis.total_frames.toLocaleString()}
                              </span>
                            </div>
                            <div
                              className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={analysis.total_frames}
                              aria-valuenow={Math.min(
                                analysis.frames_processed,
                                analysis.total_frames
                              )}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (analysis.frames_processed /
                                        analysis.total_frames) *
                                      100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              window.location.assign(`/analyses/${analysis.id}`)
                            }
                            className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
                          >
                            View details
                          </button>

                          <button
                            onClick={() => void handleDelete(analysis.id)}
                            disabled={deletingId === analysis.id}
                            className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === analysis.id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs leading-5 text-slate-500 sm:px-6">
              Risk score colors indicate the score range; they do not replace
              your system&apos;s risk assessment.
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
