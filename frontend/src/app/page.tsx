'use client';

import { useState } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setUploadMessage('');
      setUploadProgress(0);
      setProcessingProgress(0);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setUploadStatus('idle');
    setUploadMessage('Upload cancelled');
    setUploadProgress(0);
    setProcessingProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const controller = new AbortController();
    setAbortController(controller);
    setUploadStatus('uploading');
    setUploadMessage('Uploading video...');
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
          setUploadMessage(`Uploading... ${percentComplete.toFixed(0)}%`);
        }
      });

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          setUploadStatus('processing');
          setUploadMessage('Starting analysis...');
          setUploadProgress(100);

          // Start analysis
          try {
            const analysisResponse = await fetch('http://localhost:8000/api/analysis/start', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ video_id: data.id }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              setAnalysisId(analysisData.id);

              // Poll for processing progress
              pollAnalysisProgress(analysisData.id);
            } else {
              const error = await analysisResponse.json();
              setUploadStatus('error');
              setUploadMessage(`Analysis failed: ${error.detail}`);
            }
          } catch (error) {
            setUploadStatus('error');
            setUploadMessage('Analysis failed: Could not connect to backend');
          }
        } else {
          const error = JSON.parse(xhr.responseText);
          setUploadStatus('error');
          setUploadMessage(`Upload failed: ${error.detail}`);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadStatus('error');
        setUploadMessage('Upload failed: Network error');
      });

      xhr.addEventListener('abort', () => {
        setUploadStatus('idle');
        setUploadMessage('Upload cancelled');
      });

      xhr.open('POST', 'http://localhost:8000/api/videos/upload');
      xhr.send(formData);

    } catch (error) {
      setUploadStatus('error');
      setUploadMessage('Upload failed: Could not connect to backend');
    }
  };

  const pollAnalysisProgress = async (id: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/analysis/${id}`);
        if (response.ok) {
          const data = await response.json();

          if (data.total_frames && data.frames_processed) {
            const progress = (data.frames_processed / data.total_frames) * 100;
            setProcessingProgress(progress);
            setUploadMessage(`Processing... ${progress.toFixed(0)}%`);
          }

          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setUploadStatus('success');
            setUploadMessage('Analysis complete! Redirecting...');
            setTimeout(() => {
              window.location.href = `/analyses/${id}`;
            }, 1000);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setUploadStatus('error');
            setUploadMessage(`Analysis failed: ${data.error_message || 'Unknown error'}`);
          }
        }
      } catch (error) {
        clearInterval(pollInterval);
        setUploadStatus('error');
        setUploadMessage('Failed to check analysis status');
      }
    }, 2000);
  };

  const handleRetry = () => {
    setUploadStatus('idle');
    setUploadMessage('');
    setUploadProgress(0);
    setProcessingProgress(0);
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'uploading': return 'text-blue-400';
      case 'processing': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getProgressColor = () => {
    switch (uploadStatus) {
      case 'uploading': return 'bg-blue-600';
      case 'processing': return 'bg-purple-600';
      case 'success': return 'bg-green-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            CrowdManagement AI
          </h1>
          <p className="text-xl text-slate-300">
            AI-powered early crowd-risk monitoring and decision-support system
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Upload Video for Analysis
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors">
                <input
                  type="file"
                  id="video-upload"
                  accept="video/mp4,video/avi,video/mov,video/mkv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer block"
                >
                  <div className="text-slate-300 mb-2">
                    {selectedFile ? selectedFile.name : 'Click to select a video file'}
                  </div>
                  <div className="text-sm text-slate-400">
                    Supported formats: MP4, AVI, MOV, MKV
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-4">
                    <div className="text-slate-300">
                      <span className="font-medium">Selected:</span> {selectedFile.name}
                      <span className="ml-4 text-slate-400">
                        ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    {uploadStatus === 'idle' && (
                      <button
                        onClick={handleUpload}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upload
                      </button>
                    )}
                    {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                      <button
                        onClick={handleCancel}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">
                          {uploadStatus === 'uploading' ? 'Upload Progress' : 'Processing Progress'}
                        </span>
                        <span className="text-slate-300 text-sm">
                          {uploadStatus === 'uploading' ? uploadProgress.toFixed(0) : processingProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                          style={{ width: `${uploadStatus === 'uploading' ? uploadProgress : processingProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status Message */}
                  {uploadMessage && (
                    <div className={`text-sm ${getStatusColor()} bg-slate-700/30 rounded-lg p-3`}>
                      {uploadMessage}
                    </div>
                  )}

                  {/* Retry Button */}
                  {uploadStatus === 'error' && (
                    <button
                      onClick={handleRetry}
                      className="w-full px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-6">
              System Status
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Backend API</div>
                <div className="text-green-400 font-medium">Running (localhost:8000)</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">YOLO Model</div>
                <div className="text-green-400 font-medium">Loaded</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Database</div>
                <div className="text-green-400 font-medium">Connected (SQLite)</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-1">Tracking</div>
                <div className="text-green-400 font-medium">Implemented</div>
              </div>
            </div>
          </div>

          {/* Pipeline Overview */}
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Processing Pipeline
            </h2>

            <div className="flex flex-wrap gap-2">
              {[
                'Video Upload',
                'Frame Extraction',
                'YOLO Detection',
                'ByteTrack',
                'Counting',
                'Density',
                'Flow',
                'Bottleneck',
                'Risk Engine',
                'Alerts',
                'Dashboard',
                'Historical'
              ].map((stage, index) => (
                <div
                  key={stage}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-sm text-slate-300"
                >
                  {index + 1}. {stage}
                </div>
              ))}
            </div>
          </div>

          {/* View Analyses Link */}
          <div className="mt-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => window.location.href = '/analyses'}
                className="w-full px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                View Analysis History
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
