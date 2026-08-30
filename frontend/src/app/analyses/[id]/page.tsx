'use client';

import { useState, useEffect, use } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  unique_people_count: number | null;
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
  acknowledged: boolean;
  acknowledged_at: string | null;
}

interface Video {
  id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  status: string;
}

export default function AnalysisDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const analysisId = resolvedParams.id;

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [metrics, setMetrics] = useState<AnalysisMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    // Poll for updates if analysis is running
    const interval = setInterval(() => {
      if (analysis?.status === 'running' || analysis?.status === 'pending') {
        fetchData();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [analysisId, analysis?.status]);

  const fetchData = async () => {
    try {
      const [analysisRes, metricsRes, alertsRes] = await Promise.all([
        fetch(`http://localhost:8000/api/analysis/${analysisId}`),
        fetch(`http://localhost:8000/api/analysis/${analysisId}/metrics`),
        fetch(`http://localhost:8000/api/analysis/${analysisId}/alerts`)
      ]);

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json();
        setAnalysis(analysisData);

        // Fetch video details
        const videoRes = await fetch(`http://localhost:8000/api/videos/${analysisData.video_id}`);
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          setVideo(videoData);
        }
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (err) {
      setError('Failed to fetch analysis data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'warning': return 'text-yellow-400';
      case 'safe': return 'text-green-400';
      case 'no_data': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/analysis/${analysisId}/alerts/${alertId}/acknowledge`, {
        method: 'PUT',
      });
      if (response.ok) {
        // Refresh alerts
        const alertsRes = await fetch(`http://localhost:8000/api/analysis/${analysisId}/alerts`);
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData);
        }
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/30 border-red-700';
      case 'high': return 'bg-orange-900/30 border-orange-700';
      case 'warning': return 'bg-yellow-900/30 border-yellow-700';
      default: return 'bg-slate-700/30 border-slate-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading analysis...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-red-400">{error || 'Analysis not found'}</div>
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
              <button
                onClick={() => window.location.href = '/analyses'}
                className="text-slate-400 hover:text-white mb-4 inline-block"
              >
                ← Back to Analyses
              </button>
              <h1 className="text-4xl font-bold text-white mb-2">
                Analysis #{analysis.id}
              </h1>
              <p className="text-slate-300">
                Video ID: {analysis.video_id}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getStatusColor(analysis.status)}`}>
                {analysis.status.toUpperCase()}
              </div>
              <div className="text-slate-400 text-sm mt-1">
                {analysis.total_frames
                  ? `${analysis.frames_processed}/${analysis.total_frames} frames`
                  : 'Processing...'
                }
              </div>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">People</div>

            <div className="text-3xl font-bold text-white">
              {analysis.max_people_count ?? '-'}
            </div>

            <div className="text-slate-500 text-sm mt-1">
              Avg: {analysis.avg_people_count?.toFixed(1) ?? '-'}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Max Density</div>
            <div className="text-3xl font-bold text-white">
              {analysis.max_density ? analysis.max_density.toFixed(3) : '-'}
            </div>
            <div className="text-slate-500 text-sm mt-1">
              Avg: {analysis.avg_density?.toFixed(3) ?? '-'}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Max Risk Score</div>
            <div className="text-3xl font-bold text-white">
              {analysis.max_risk_score ? analysis.max_risk_score.toFixed(1) : '-'}
            </div>
            <div className="text-slate-500 text-sm mt-1">
              Avg Flow: {analysis.avg_flow_rate?.toFixed(3) ?? '-'}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Alerts Generated</div>
            <div className="text-3xl font-bold text-white">
              {alerts.length}
            </div>
            <div className="text-slate-500 text-sm mt-1">
              {analysis.status === 'completed' ? 'Analysis complete' : 'Processing...'}
            </div>
          </div>
        </div>

        {/* Video Player */}
        {video && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">
              Original Video {analysis.status !== 'completed' && <span className="text-sm text-yellow-400 ml-2">(Analyzing...)</span>}
            </h2>
            <div className="bg-black rounded-lg overflow-hidden">
              <video
                controls
                autoPlay
                muted
                className="w-full"
                src={`http://localhost:8000/api/videos/${video.id}/stream`}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="mt-2 text-slate-400 text-sm">
              Filename: {video.original_filename}
            </div>
          </div>
        )}

        {/* Alerts Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Alerts</h2>
          {alerts.length === 0 ? (
            <div className="text-slate-400">No alerts generated</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)} ${alert.acknowledged ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">
                      {alert.severity.toUpperCase()}
                      {alert.acknowledged && <span className="ml-2 text-xs text-slate-400">(Acknowledged)</span>}
                    </span>
                    <span className="text-slate-400 text-sm">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-300 text-sm mb-1">{alert.reason}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-slate-400 text-sm">Risk Score: {alert.risk_score.toFixed(1)}</div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                        className="px-3 py-1 bg-slate-600 text-white text-sm rounded hover:bg-slate-500 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics Timeline */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">Frame-by-Frame Metrics</h2>
          {metrics.length === 0 ? (
            <div className="text-slate-400">No metrics available yet</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {metrics.slice(-50).map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg text-sm hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="text-slate-400 mb-1">
                      Frame {metric.frame_number} • {metric.timestamp.toFixed(2)}s
                    </div>
                    <div className="flex gap-4 text-white">
                      <span>People: {metric.people_count}</span>
                      <span>Density: {metric.density.toFixed(3)}</span>
                      <span>Flow: {metric.flow_rate?.toFixed(3) ?? 'N/A'}</span>
                      <span>Velocity: {metric.avg_velocity?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <div className={`font-semibold ${getRiskLevelColor(metric.risk_level)}`}>
                    {metric.risk_level.toUpperCase()}
                  </div>
                  <div className={`font-semibold ${getRiskLevelColor(metric.risk_level)}`}>
                    {metric.risk_score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottleneck Status */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Bottleneck Risk Assessment</h2>
          {analysis.max_risk_score === null ? (
            <div className="text-slate-400">No risk data available</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Overall Bottleneck Risk</span>
                <span className={`font-semibold ${getRiskLevelColor(
                  analysis.max_risk_score >= 76 ? 'critical' :
                    analysis.max_risk_score >= 56 ? 'high' :
                      analysis.max_risk_score >= 31 ? 'warning' : 'safe'
                )}`}>
                  {analysis.max_risk_score >= 76 ? 'HIGH BOTTLENECK RISK' :
                    analysis.max_risk_score >= 56 ? 'MODERATE BOTTLENECK RISK' :
                      analysis.max_risk_score >= 31 ? 'LOW BOTTLENECK RISK' : 'NO BOTTLENECK DETECTED'}
                </span>
              </div>
              <div className="text-slate-400 text-sm">
                Bottleneck risk is calculated from density, flow consistency, and velocity.
                High density combined with low flow consistency or low velocity indicates potential bottleneck conditions.
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Max Density</div>
                  <div className="text-white font-semibold">
                    {analysis.max_density?.toFixed(3) ?? 'N/A'}
                  </div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-slate-400 text-sm">Avg Flow Rate</div>
                  <div className="text-white font-semibold">
                    {analysis.avg_flow_rate?.toFixed(3) ?? 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Risk Score Over Time</h2>
          {metrics.length === 0 ? (
            <div className="text-slate-400">No metrics available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.slice(-100).map(m => ({
                  frame: m.frame_number,
                  risk: m.risk_score,
                  level: m.risk_level
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    label={{ value: 'Frame', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    domain={[0, 100]}
                    label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="risk"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                    name="Risk Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Density Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Density Over Time</h2>
          {metrics.length === 0 ? (
            <div className="text-slate-400">No metrics available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.slice(-100).map(m => ({
                  frame: m.frame_number,
                  density: m.density
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    label={{ value: 'Frame', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    domain={[0, 1]}
                    label={{ value: 'Density', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="density"
                    stroke="#a855f7"
                    strokeWidth={2}
                    name="Density"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* People Count Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">People Count Over Time</h2>
          {metrics.length === 0 ? (
            <div className="text-slate-400">No metrics available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.slice(-100).map(m => ({
                  frame: m.frame_number,
                  people: m.people_count
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    label={{ value: 'Frame', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'People', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="people"
                    fill="#3b82f6"
                    name="People Count"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Velocity Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Average Velocity Over Time</h2>
          {metrics.length === 0 ? (
            <div className="text-slate-400">No metrics available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.slice(-100).map(m => ({
                  frame: m.frame_number,
                  velocity: m.avg_velocity || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="frame"
                    stroke="#94a3b8"
                    label={{ value: 'Frame', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    label={{ value: 'Velocity (px/frame)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="velocity"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Avg Velocity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Alert Events Visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 mt-8">
          <h2 className="text-xl font-semibold text-white mb-4">Alert Events Timeline</h2>
          {alerts.length === 0 ? (
            <div className="text-slate-400">No alerts generated</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alerts.map((a, i) => ({
                  index: i + 1,
                  score: a.risk_score,
                  severity: a.severity,
                  color: a.severity === 'critical' ? '#ef4444' :
                    a.severity === 'high' ? '#f97316' :
                      a.severity === 'warning' ? '#eab308' : '#22c55e'
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis
                    dataKey="index"
                    stroke="#94a3b8"
                    label={{ value: 'Alert #', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    domain={[0, 100]}
                    label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Bar
                    dataKey="score"
                    fill="#ef4444"
                    name="Alert Risk Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
