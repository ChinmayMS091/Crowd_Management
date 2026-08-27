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

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/analysis/');
      if (response.ok) {
        const data = await response.json();
        setAnalyses(data);
      } else {
        setError('Failed to fetch analyses');
      }
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/analysis/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list after successful deletion
        fetchAnalyses();
      } else {
        alert('Failed to delete analysis');
      }
    } catch (err) {
      alert('Failed to connect to backend');
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

  const getRiskLevelColor = (riskScore: number | null) => {
    if (riskScore === null) return 'text-gray-400';
    if (riskScore >= 76) return 'text-red-400';
    if (riskScore >= 56) return 'text-orange-400';
    if (riskScore >= 31) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => window.location.href = '/'}
                className="text-slate-400 hover:text-white mb-4 inline-block"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-4xl font-bold text-white mb-2">
                Analysis History
              </h1>
              <p className="text-slate-300">
                View all video analysis results
              </p>
            </div>
            <button
              onClick={fetchAnalyses}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Refresh
            </button>
          </div>
        </header>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading analyses...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Analyses List */}
        {!loading && !error && analyses.length === 0 && (
          <div className="bg-slate-800/50 rounded-lg p-12 text-center">
            <div className="text-slate-400 text-lg mb-2">No analyses found</div>
            <div className="text-slate-500">Upload a video to start an analysis</div>
          </div>
        )}

        {!loading && !error && analyses.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">No.</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Started</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Max People</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Avg Density</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Max Risk</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Progress</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {analyses.map((analysis, index) => (
                  <tr key={analysis.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-white font-medium">#{index + 1}</td>
                    <td className="px-6 py-4">
                      <span className={getStatusColor(analysis.status)}>
                        {analysis.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {new Date(analysis.started_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {analysis.max_people_count ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {analysis.avg_density ? analysis.avg_density.toFixed(3) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={getRiskLevelColor(analysis.max_risk_score)}>
                        {analysis.max_risk_score ? analysis.max_risk_score.toFixed(1) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {analysis.total_frames
                        ? `${analysis.frames_processed}/${analysis.total_frames} frames`
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.location.href = `/analyses/${analysis.id}`}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDelete(analysis.id)}
                          className="px-3 py-1 bg-red-600/80 text-white rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
