import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FolderGit, Download, ExternalLink, RefreshCw, Calendar, FileArchive, Layers, Trash2, Eye } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import StatusBadge from '../components/result/StatusBadge'
import { jobApi } from '../services/jobApi'
import { formatDate } from '../utils/formatDate'
import { formatBytes } from '../utils/formatBytes'

export default function HistoryPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)

  const loadHistory = async () => {
    setLoading(true)
    try {
      const data = await jobApi.getRecentJobs(20)
      if (data.success) {
        setJobs(data.jobs)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this snapshot? All local files will be permanently removed.")) {
      return
    }
    try {
      setLoading(true)
      await jobApi.deleteJob(jobId)
      // Refresh list after successful delete
      await loadHistory()
    } catch (e) {
      // Show error message to user
      console.error('Delete error:', e)
      alert(e.message || "Failed to delete snapshot.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div className="min-h-screen bg-radial-grid flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FolderGit className="w-6 h-6 text-blue-400" />
              Rebuilt Snapshots History
            </h1>
            <p className="text-xs text-muted mt-1">
              Access your previously compiled offline site packages stored in the sandbox session storage.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            loading={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Log
          </Button>
        </div>

        {/* History List */}
        <Card className="w-full" glass={true}>
          <CardContent className="p-0">
            {loading && jobs.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <span className="text-xs text-muted">Reading history logs...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div className="p-12 text-center max-w-sm mx-auto space-y-4">
                <FolderGit className="w-10 h-10 text-gray-600 mx-auto" />
                <h3 className="text-sm font-semibold text-white">No snapshots created yet</h3>
                <p className="text-xs text-muted">Head back to the tool page and rebuild your first site snapshot!</p>
                <Link to="/">
                  <Button size="sm">Go to Rebuilder</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/30 border-b border-border/80 text-gray-400 font-semibold tracking-wider text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-4">Target Website Info</th>
                      <th className="px-6 py-4">Submission Date</th>
                      <th className="px-6 py-4">Size / Files</th>
                      <th className="px-6 py-4">Rebuild Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono">
                    {jobs.map((job) => {
                      const isDone = job.status === 'completed'
                      const title = job.title || job.metadata?.title || 'No Title'
                      const size = job.assetSummary?.totalSizeBytes || job.metadata?.totalSize || 0
                      const count = job.assetSummary?.total || job.metadata?.assetCount || 0
                      const downloadReady = job.download?.ready !== false
                      const downloadMode = job.download?.mode || 'unavailable'
                      const missingFiles = job.download?.missingFiles || []
                      const snapshotMode = job.mode || 'offline-package'

                      return (
                        <tr key={job.jobId} className="hover:bg-white/5 transition-colors duration-150">
                          
                          {/* Info Column */}
                          <td className="px-6 py-4 max-w-[280px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium font-sans block truncate" title={title}>
                                {title}
                              </span>
                              {/* Mode badge */}
                              {snapshotMode === 'single-html' ? (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 shrink-0">Single HTML</Badge>
                              ) : (
                                <Badge variant="primary" className="text-[9px] px-1.5 py-0.5 shrink-0">Bundle</Badge>
                              )}
                            </div>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 mt-1 truncate max-w-full font-mono"
                            >
                              {job.url}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            {job.status === 'failed' && job.error?.message && (
                              <span className="text-[10px] text-red-400 block mt-1 leading-normal font-sans border-l-2 border-red-500/40 pl-1.5">
                                Error: {job.error.message} ({job.error.code})
                              </span>
                            )}
                            {isDone && downloadMode === 'partial' && missingFiles.length > 0 && (
                              <span className="text-[10px] text-amber-400 block mt-1 leading-normal font-sans border-l-2 border-amber-500/40 pl-1.5 flex items-center gap-1">
                                <Badge variant="warning" className="text-[9px] px-1.5 py-0.5">Partial</Badge>
                                Missing: {missingFiles.join(', ')}
                              </span>
                            )}
                            {isDone && downloadMode === 'unavailable' && (
                              <span className="text-[10px] text-red-400 block mt-1 leading-normal font-sans border-l-2 border-red-500/40 pl-1.5 flex items-center gap-1">
                                <Badge variant="danger" className="text-[9px] px-1.5 py-0.5">Unavailable</Badge>
                                Core files missing
                              </span>
                            )}
                          </td>

                          {/* Created date column */}
                          <td className="px-6 py-4 text-gray-300 text-xs font-sans">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-500" />
                              {formatDate(job.createdAt)}
                            </span>
                          </td>

                          {/* Sizing Column */}
                          <td className="px-6 py-4 text-gray-300 text-xs font-sans">
                            {isDone ? (
                              <div className="space-y-1">
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-200">
                                  <FileArchive className="w-3.5 h-3.5 text-blue-400/80" />
                                  {formatBytes(size)}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-muted">
                                  <Layers className="w-3 h-3" />
                                  {count} assets
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            <StatusBadge status={job.status} />
                          </td>

                          {/* Action Items */}
                          <td className="px-6 py-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/result/${job.jobId}`}>
                                <Button size="sm" variant="outline" className="text-xs">
                                  Open details
                                </Button>
                              </Link>
                              
                              {isDone && (
                                <>
                                  <a
                                    href={jobApi.getPreviewUrl(job.jobId)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open live preview"
                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </a>
                                  {downloadReady ? (
                                    <a
                                      href={jobApi.getDownloadUrl(job.jobId)}
                                      download={`snapshot-${job.jobId}.zip`}
                                      title={downloadMode === 'partial' ? `Download partial ZIP: missing ${missingFiles.join(', ')}` : 'Download complete ZIP'}
                                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  ) : (
                                    <button
                                      disabled
                                      title={`Cannot download: missing core files`}
                                      className="p-1.5 text-gray-600 cursor-not-allowed opacity-50 rounded"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                onClick={() => handleDelete(job.jobId)}
                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete snapshot permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  )
}