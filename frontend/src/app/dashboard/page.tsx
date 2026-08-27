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
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch latest completed analysis
      const analysesRes = await fetch('http://localhost:8000/api/analysis/');
      if (analysesRes.ok) {
        const analyses = await analysesRes.json();
        const completed = analyses.filter((a: Analysis) => a.status === 'completed');
        if (completed.length > 0) {
          const latest = completed[0];
          setLatestAnalysis(latest);
          
          // Fetch metrics for this analysis
          const metricsRes = await fetch(`http://localhost:8000/api/analysis/${latest.id}/metrics`);
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            setMetrics(metricsData);
          }
          
          // Fetch alerts for this analysis
          const alertsRes = await fetch(`http://localhost:8000/api/analysis/${latest.id}/alerts`);
          if (alertsRes.ok) {
            const alertsData = await alertsRes.json();
            setAlerts(alertsData);
          }
        }
      }
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskScore: number | null) => {
    if (riskScore === null) return 'text-gray-400';
    if (riskScore >= 76) return 'text-red-400';
    if (riskScore >= 56) return 'text-orange-400';
    if (riskScore >= 31) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskLevelBg = (riskScore: number | null) => {
    if (riskScore === null) return 'bg-gray-600';
    if (riskScore >= 76) return 'bg-red-600';
    if (riskScore >= 56) return 'bg-orange-600';
    if (riskScore >= 31) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-700 text-red-400';
      case 'high': return 'bg-orange-900/30 border-orange-700 text-orange-400';
      case 'warning': return 'bg-yellow-900/30 border-yellow-700 text-yellow-400';
      default: return 'bg-slate-700/30 border-slate-600 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  if (!latestAnalysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">No completed analyses found. Upload a video to get started.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Crowd Analytics Dashboard
              </h1>
              <p className="text-slate-300">
                Analysis #{latestAnalysis.id} • Completed at {latestAnalysis.completed_at ? new Date(latestAnalysis.completed_at).toLocaleString() : 'N/A'}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Upload New Video
            </button>
          </div>
        </header>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* People Count */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-sm">Max People</div>
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {latestAnalysis.max_people_count ?? '-'}
            </div>
            <div className="text-slate-500 text-sm">
              Avg: {latestAnalysis.avg_people_count?.toFixed(1) ?? '-'}
            </div>
          </div>

          {/* Density */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-sm">Max Density</div>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {latestAnalysis.max_density ? latestAnalysis.max_density.toFixed(3) : '-'}
            </div>
            <div className="text-slate-500 text-sm">
              Avg: {latestAnalysis.avg_density?.toFixed(3) ?? '-'}
            </div>
          </div>

          {/* Flow Rate */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-sm">Avg Flow Rate</div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {latestAnalysis.avg_flow_rate ? latestAnalysis.avg_flow_rate.toFixed(3) : '-'}
            </div>
            <div className="text-slate-500 text-sm">
              People moving per frame
            </div>
          </div>

          {/* Risk Score */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-sm">Max Risk Score</div>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              {latestAnalysis.max_risk_score ? latestAnalysis.max_risk_score.toFixed(1) : '-'}
            </div>
            <div className="text-slate-500 text-sm">
              Scale: 0-100
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* People Count Trend */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">People Count Trend</h3>
            {metrics.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {metrics.slice(-50).map((metric) => {
                  const maxCount = Math.max(...metrics.map(m => m.people_count), 1);
                  const height = (metric.people_count / maxCount) * 100;
                  return (
                    <div
                      key={metric.id}
                      className="flex-1 bg-blue-600 rounded-t transition-all hover:bg-blue-500"
                      style={{ height: `${height}%` }}
                      title={`Frame ${metric.frame_number}: ${metric.people_count} people`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No metrics available
              </div>
            )}
          </div>

          {/* Risk Score Trend */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Score Trend</h3>
            {metrics.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {metrics.slice(-50).map((metric) => {
                  const height = (metric.risk_score / 100) * 100;
                  const color = metric.risk_score >= 76 ? 'bg-red-600' :
                               metric.risk_score >= 56 ? 'bg-orange-600' :
                               metric.risk_score >= 31 ? 'bg-yellow-600' : 'bg-green-600';
                  return (
                    <div
                      key={metric.id}
                      className={`flex-1 ${color} rounded-t transition-all hover:opacity-80`}
                      style={{ height: `${height}%` }}
                      title={`Frame ${metric.frame_number}: Risk ${metric.risk_score.toFixed(1)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No metrics available
              </div>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getRiskLevelBg(latestAnalysis.max_risk_score)}`}></div>
              <div>
                <div className="text-slate-400 text-sm">Overall Risk Level</div>
                <div className={`font-semibold ${getRiskLevelColor(latestAnalysis.max_risk_score)}`}>
                  {latestAnalysis.max_risk_score === null ? 'N/A' :
                   latestAnalysis.max_risk_score >= 76 ? 'CRITICAL' :
                   latestAnalysis.max_risk_score >= 56 ? 'HIGH' :
                   latestAnalysis.max_risk_score >= 31 ? 'WARNING' : 'SAFE'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${alerts.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <div>
                <div className="text-slate-400 text-sm">Alerts Generated</div>
                <div className={`font-semibold ${alerts.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {alerts.length} alerts
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <div>
                <div className="text-slate-400 text-sm">Frames Processed</div>
                <div className="font-semibold text-blue-400">
                  {latestAnalysis.frames_processed} / {latestAnalysis.total_frames ?? '?'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <button
              onClick={() => window.location.href = `/analyses/${latestAnalysis.id}`}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              View All Alerts →
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="text-slate-400">No alerts generated</div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold uppercase">{alert.severity}</span>
                    <span className="text-sm opacity-75">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm mb-1">{alert.reason}</div>
                  <div className="text-sm opacity-75">Risk Score: {alert.risk_score.toFixed(1)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
