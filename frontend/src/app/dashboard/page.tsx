
'use client';

import { useCallback, useEffect, useState } from 'react';

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

interface AnalysisMetric {
  id: number;
  frame_number: number;
  timestamp: number;
  people_count: number;
  density: number;
  flow_rate: number | null;
  avg_velocity: number | null;
  risk_score: number;
  risk_level: string;
}

interface Alert {
  id: number;
  severity: string;
  risk_score: number;
  reason: string;
  timestamp: string;
}

export default function DashboardPage() {
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [metrics, setMetrics] = useState<AnalysisMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const analysesResponse = await fetch(
        'http://localhost:8000/api/analysis/',
        { headers }
      );

      if (!analysesResponse.ok) {
        if (
          analysesResponse.status === 401 ||
          analysesResponse.status === 403
        ) {
          setError('You are not authorized to view the dashboard.');
        } else {
          setError('Failed to fetch dashboard data.');
        }
        return;
      }

      const analysesData: Analysis[] = await analysesResponse.json();

      const completedAnalyses = analysesData.filter(
        (item) => item.status.toLowerCase() === 'completed'
      );

      if (completedAnalyses.length === 0) {
        setLatestAnalysis(null);
        setMetrics([]);
        setAlerts([]);
        return;
      }

      const latest = completedAnalyses[0];
      setLatestAnalysis(latest);

      const [metricsResponse, alertsResponse] = await Promise.all([
        fetch(
          `http://localhost:8000/api/analysis/${latest.id}/metrics`,
          { headers }
        ),
        fetch(
          `http://localhost:8000/api/analysis/${latest.id}/alerts`,
          { headers }
        ),
      ]);

      if (metricsResponse.ok) {
        const metricsData: AnalysisMetric[] = await metricsResponse.json();
        setMetrics(Array.isArray(metricsData) ? metricsData : []);
      } else {
        setMetrics([]);
      }

      if (alertsResponse.ok) {
        const alertsData: Alert[] = await alertsResponse.json();
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      } else {
        setAlerts([]);
      }
    } catch {
      setError('Failed to connect to the backend. Check that the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const formatNumber = (
    value: number | null | undefined,
    digits = 1
  ) => value == null ? '—' : value.toFixed(digits);

  const formatDate = (value: string | null) => {
    if (!value) return 'Not available';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? 'Not available'
      : date.toLocaleString();
  };

  const getRiskLabel = (score: number | null) => {
    if (score == null) return 'Unavailable';
    if (score >= 76) return 'Critical';
    if (score >= 56) return 'High';
    if (score >= 31) return 'Warning';
    return 'Safe';
  };

  const getRiskText = (score: number | null) => {
    if (score == null) return 'text-slate-400';
    if (score >= 76) return 'text-red-600';
    if (score >= 56) return 'text-orange-600';
    if (score >= 31) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getRiskDot = (score: number | null) => {
    if (score == null) return 'bg-slate-300';
    if (score >= 76) return 'bg-red-500';
    if (score >= 56) return 'bg-orange-500';
    if (score >= 31) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getRiskBar = (score: number) => {
    if (score >= 76) return 'bg-red-500';
    if (score >= 56) return 'bg-orange-500';
    if (score >= 31) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getAlertStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'high':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const recentMetrics = metrics.slice(-50);

  const maxPeople = Math.max(
    1,
    ...recentMetrics.map((metric) => metric.people_count)
  );

  const completedProgress =
    latestAnalysis?.total_frames != null &&
      latestAnalysis.total_frames > 0
      ? Math.min(
        100,
        Math.max(
          0,
          (latestAnalysis.frames_processed / latestAnalysis.total_frames) *
          100
        )
      )
      : null;

  const metricCards = latestAnalysis
    ? [
      {
        label: 'Maximum people',
        value: latestAnalysis.max_people_count ?? '—',
        subtext: `Average: ${formatNumber(latestAnalysis.avg_people_count)}`,
        gradient: 'from-blue-500 to-indigo-500',
        icon: 'people',
      },
      {
        label: 'Maximum density',
        value: formatNumber(latestAnalysis.max_density, 3),
        subtext: `Average: ${formatNumber(latestAnalysis.avg_density, 3)}`,
        gradient: 'from-violet-500 to-purple-500',
        icon: 'density',
      },
      {
        label: 'Average flow rate',
        value: formatNumber(latestAnalysis.avg_flow_rate, 3),
        subtext: 'People moving per frame',
        gradient: 'from-emerald-500 to-teal-500',
        icon: 'flow',
      },
      {
        label: 'Maximum risk score',
        value: formatNumber(latestAnalysis.max_risk_score),
        subtext: 'Scale: 0–100',
        gradient: 'from-orange-500 to-red-500',
        icon: 'risk',
      },
    ]
    : [];

  if (loading) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading dashboard...
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Retrieving your latest analysis
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-slate-50 px-4 py-10">
        <div
          role="alert"
          className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-7 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl font-bold text-red-600">
            !
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Unable to load dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
          <button
            onClick={() => void fetchDashboardData()}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!latestAnalysis) {
    return (
      <main className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
        />
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-violet-50 text-blue-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-8 w-8"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 9h10M7 13h6M7 17h3"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Your dashboard is ready
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            No completed video analyses were found. Process a video to see
            crowd metrics, risk trends, and generated alerts here.
          </p>

          <button
            onClick={() => window.location.assign('/videoprocessing')}
            className="mt-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700"
          >
            Process a video
          </button>
        </div>
      </main>
    );
  }

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
        <header className="mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                VIDEO ANALYTICS
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Crowd Analytics Dashboard
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Insights from your latest completed video analysis.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Analysis #{latestAnalysis.id} · Completed{' '}
                {formatDate(latestAnalysis.completed_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void fetchDashboardData(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
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
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>

              <button
                onClick={() =>
                  window.location.assign('/videoprocessing')
                }
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-indigo-700"
              >
                + Process new video
              </button>
            </div>
          </div>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`h-1 bg-gradient-to-r ${card.gradient}`} />

              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>

                  <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${card.gradient}`} />
                </div>

                <p
                  className={`mt-4 break-words text-3xl font-bold tracking-tight ${card.icon === 'risk'
                      ? getRiskText(latestAnalysis.max_risk_score)
                      : 'text-slate-900'
                    }`}
                >
                  {card.value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {card.subtext}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  People Count Trend
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recent recorded frames
                </p>
              </div>
              <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                People
              </span>
            </div>

            {recentMetrics.length > 0 ? (
              <>
                <div
                  className="mt-6 flex h-52 items-end gap-1 border-b border-slate-100 pb-1"
                  aria-label="People count trend chart"
                >
                  {recentMetrics.map((metric) => {
                    const height = Math.max(
                      2,
                      (metric.people_count / maxPeople) * 100
                    );

                    return (
                      <div
                        key={metric.id}
                        className="group relative flex h-full min-w-0 flex-1 items-end"
                        title={`Frame ${metric.frame_number}: ${metric.people_count} people`}
                      >
                        <div
                          className="w-full rounded-t-sm bg-gradient-to-t from-blue-600 to-indigo-400 transition-opacity group-hover:opacity-70"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Frame {recentMetrics[0].frame_number}
                  </span>
                  <span>
                    {recentMetrics.length} data points
                  </span>
                  <span>
                    Frame {recentMetrics[recentMetrics.length - 1].frame_number}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                No people-count metrics available
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Risk Score Trend
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Recorded risk scores across recent frames
                </p>
              </div>
              <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                Risk / 100
              </span>
            </div>

            {recentMetrics.length > 0 ? (
              <>
                <div
                  className="relative mt-6 flex h-52 items-end gap-1 border-b border-slate-100 pb-1"
                  aria-label="Risk score trend chart"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                  <div className="pointer-events-none absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

                  {recentMetrics.map((metric) => (
                    <div
                      key={metric.id}
                      className="group relative z-10 flex h-full min-w-0 flex-1 items-end"
                      title={`Frame ${metric.frame_number}: Risk ${metric.risk_score.toFixed(1)}`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-opacity group-hover:opacity-70 ${getRiskBar(metric.risk_score)}`}
                        style={{
                          height: `${Math.min(
                            100,
                            Math.max(2, metric.risk_score)
                          )}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {[
                    { label: 'Safe', color: 'bg-emerald-500' },
                    { label: 'Warning', color: 'bg-amber-500' },
                    { label: 'High', color: 'bg-orange-500' },
                    { label: 'Critical', color: 'bg-red-500' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-1.5 text-xs text-slate-500"
                    >
                      <span className={`h-2 w-2 rounded-full ${item.color}`} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
                No risk metrics available
              </div>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">Analysis Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Summary of the completed analysis and its recorded alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${getRiskDot(latestAnalysis.max_risk_score)}`}
              />
              <div>
                <p className="text-sm text-slate-500">Overall risk level</p>
                <p
                  className={`mt-1 font-semibold ${getRiskText(latestAnalysis.max_risk_score)}`}
                >
                  {getRiskLabel(latestAnalysis.max_risk_score)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Based on maximum recorded risk
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${alerts.length > 0 ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
              />
              <div>
                <p className="text-sm text-slate-500">Alerts generated</p>
                <p
                  className={`mt-1 font-semibold ${alerts.length > 0
                      ? 'text-red-600'
                      : 'text-emerald-600'
                    }`}
                >
                  {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Associated with this analysis
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">Frames processed</p>
                <p className="text-sm font-semibold text-blue-700">
                  {completedProgress == null
                    ? '—'
                    : `${completedProgress.toFixed(1)}%`}
                </p>
              </div>

              <p className="text-lg font-bold text-slate-900">
                {latestAnalysis.frames_processed.toLocaleString()} /{' '}
                {latestAnalysis.total_frames?.toLocaleString() ?? '—'}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
                  style={{
                    width: `${completedProgress ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Alerts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest alerts recorded for this analysis.
              </p>
            </div>

            <button
              onClick={() =>
                window.location.assign(`/analyses/${latestAnalysis.id}`)
              }
              className="w-fit text-sm font-semibold text-blue-700 transition hover:text-indigo-700"
            >
              View analysis details →
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m5 12 4 4L19 6"
                  />
                </svg>
              </div>
              <p className="mt-3 font-medium text-slate-800">
                No alerts generated
              </p>
              <p className="mt-1 text-sm text-slate-500">
                No alerts are available for this analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-4 sm:p-5">
              {alerts.slice(0, 5).map((alert) => (
                <article
                  key={alert.id}
                  className={`rounded-xl border p-4 ${getAlertStyle(alert.severity)}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {alert.severity}
                      </span>
                      <span className="text-xs opacity-80">
                        Risk score: {formatNumber(alert.risk_score)}
                      </span>
                    </div>

                    <time className="text-xs opacity-75">
                      {formatDate(alert.timestamp)}
                    </time>
                  </div>

                  <p className="mt-2 text-sm leading-6">{alert.reason}</p>
                </article>
              ))}

              {alerts.length > 5 && (
                <p className="pt-1 text-center text-xs text-slate-400">
                  Showing 5 of {alerts.length} alerts.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
