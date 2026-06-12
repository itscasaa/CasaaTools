import React, { useState } from 'react'
import { Download, FileArchive, Calendar, FileText, ImageIcon, Code, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { formatDate } from '../../utils/formatDate'
import { jobApi } from '../../services/jobApi'
import { formatBytes } from '../../utils/formatBytes'

/**
 * Component to display ZIP export download options once a capture job finishes.
 */
export default function DownloadCard({ job }) {
  const [downloadedState, setDownloadedState] = useState(false)
  
  if (!job) return null

  const status = job.status === 'done' ? 'completed' : job.status
  const realStatus = job.realStatus || status
  const isCompleted = realStatus === 'completed'
  
  // Check download readiness and mode
  const downloadReady = job.download?.ready !== false
  const downloadMode = job.download?.mode || 'unavailable'
  const missingFiles = job.download?.missingFiles || []
  const warnings = job.download?.warnings || []
  const canDownload = isCompleted && downloadReady
  
  // Get snapshot mode
  const snapshotMode = job.mode || job.metadata?.mode || 'offline-package'

  const downloadUrl = canDownload ? jobApi.getDownloadUrl(job.jobId) : '#'
  const { totalSizeBytes = 0, downloaded = 0 } = job.metadata?.assetSummary || {}

  // Button text based on download mode
  let buttonText = 'Download ZIP'
  if (downloadMode === 'partial') {
    buttonText = 'Download Partial ZIP'
  } else if (downloadMode === 'unavailable') {
    buttonText = 'Download Unavailable'
  }
  
  // Title text based on snapshot mode
  const titleText = snapshotMode === 'single-html' 
    ? 'Download Single HTML Snapshot'
    : 'Download HTML Snapshot Bundle'

  const handleDownload = () => {
    if (!canDownload) return
    setDownloadedState(true)
    
    // Create actual file download trigger
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `pagemirror-${job.jobId}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => setDownloadedState(false), 2000)
  }

  return (
    <Card className="border-blue-500/10 shadow-lg shadow-blue-500/5 relative overflow-hidden" glass={true}>
      
      {/* Background glow lines */}
      <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-md">
              <FileArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {titleText}
              </h3>
              
              {/* Mode badge */}
              <div className="mt-1.5 mb-2">
                {snapshotMode === 'single-html' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                    Single HTML Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Offline Package Mode
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-muted font-medium">
                {snapshotMode === 'single-html' ? (
                  <>
                    <span className="flex items-center gap-1.5" title="Single HTML with remote assets">
                      <Code className="w-3.5 h-3.5 text-purple-400" />
                      single.html
                    </span>
                    <span className="flex items-center gap-1.5" title="Snapshot Metadata">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      metadata.json
                    </span>
                    <span className="flex items-center gap-1.5" title="Full-page screenshot">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      screenshot.png
                    </span>
                    <span className="flex items-center gap-1.5" title="Remote assets info">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      README_REMOTE_ASSETS.txt
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1.5" title="Rewritten HTML source">
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      index.html
                    </span>
                    {job.metadata?.files?.originalHtml && (
                      <span className="flex items-center gap-1.5" title="Original captured HTML source">
                        <Code className="w-3.5 h-3.5 text-violet-400" />
                        index.original.html
                      </span>
                    )}
                    <span className="flex items-center gap-1.5" title="Full-page screenshot">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      screenshot.png
                    </span>
                    <span className="flex items-center gap-1.5" title="Snapshot Metadata">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      metadata.json
                    </span>
                    <span className="flex items-center gap-1.5" title="Asset Discovery Manifest">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      manifest.json
                    </span>
                    <span className="flex items-center gap-1.5" title={`Downloaded ${downloaded} assets (${formatBytes(totalSizeBytes)})`}>
                      <FileArchive className="w-3.5 h-3.5 text-blue-500" />
                      assets/
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  {formatDate(job.finishedAt)}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            variant={downloadedState ? 'ghost' : 'primary'}
            size="lg"
            disabled={!canDownload}
            className="w-full sm:w-auto shrink-0 shadow-xl shadow-blue-500/15 font-semibold"
            title={!downloadReady ? `Cannot download: missing ${missingFiles.join(', ')}` : ''}
          >
            {downloadedState ? (
              <>
                <Check className="w-4.5 h-4.5 mr-2 text-emerald-400" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4.5 h-4.5 mr-2" />
                {buttonText}
              </>
            )}
          </Button>

        </div>

        {/* Partial snapshot warning */}
        {isCompleted && downloadMode === 'partial' && missingFiles.length > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/85 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Partial Snapshot:</strong> Some preferred files are missing, but the available HTML, metadata, and assets can still be downloaded. Missing: <span className="font-semibold text-amber-200">{missingFiles.join(', ')}</span>
            </p>
          </div>
        )}

        {/* Unavailable snapshot warning */}
        {isCompleted && downloadMode === 'unavailable' && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300/85 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p>
              <strong>Snapshot Unavailable:</strong> Core output files are missing, so this snapshot cannot be downloaded. Missing: <span className="font-semibold text-red-200">{missingFiles.join(', ')}</span>
            </p>
          </div>
        )}

        {/* Full snapshot info */}
        {canDownload && downloadMode === 'full' && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-300/85 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p>
              {snapshotMode === 'single-html' ? (
                <>
                  <strong>Single HTML Mode:</strong> ZIP includes single.html with remote asset references, metadata, screenshot, and README. Assets are loaded from original website URLs.
                </>
              ) : (
                <>
                  <strong>Offline Package Mode:</strong> ZIP includes rewritten HTML, CSS files with rewritten URL references, original backups, metadata, manifest, downloaded assets, original screenshot, preview screenshot, and visual diff image when available.
                </>
              )}
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  )
}