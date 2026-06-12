import React, { useState, useEffect } from 'react'
import { Monitor, Image, Layers, FileCode, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Button } from '../ui/Button'
import PreviewFrame from './PreviewFrame'
import ScreenshotPreview from './ScreenshotPreview'
import AssetList from './AssetList'
import HtmlViewer from './HtmlViewer'
import VisualCompareCard from './VisualCompareCard'
import { formatBytes } from '../../utils/formatBytes'
import { formatDate } from '../../utils/formatDate'
import { jobApi } from '../../services/jobApi'

export default function ResultPanel({ job, onRetry = null, isAnyJobRunning = false }) {
  const [activeTab, setActiveTab] = useState('preview')
  const [fullJob, setFullJob] = useState(null)

  useEffect(() => {
    if (job && job.jobId) {
      jobApi.getJob(job.jobId)
        .then(data => {
          setFullJob(data)
        })
        .catch(err => {
          console.error("Failed to fetch full job detail for ResultPanel:", err)
        })
    }
  }, [job])

  if (!job) return null

  const status = job.status === 'done' ? 'completed' : job.status
  const realStatus = job.realStatus || status

  if (realStatus === 'failed' || job.error) {
    const errorTitle = job.error?.code === 'CAPTURE_TIMEOUT' ? 'Capture Timeout' : 
                       job.error?.code === 'DNS_LOOKUP_FAILED' ? 'DNS Lookup Failed' : 
                       job.error?.code === 'NAVIGATION_FAILED' ? 'Navigation Failed' : 
                       job.error?.code === 'ASSET_DOWNLOAD_FAILED' ? 'Asset Download Failed' : 
                       job.error?.code === 'VISUAL_COMPARE_FAILED' ? 'Visual Compare Failed' : 
                       job.error?.code === 'JOB_INTERRUPTED' ? 'Job Interrupted' : 
                       job.error?.code === 'JOB_STALE' ? 'Job Stale & Stopped' : 'Capture Failed';
                       
    // Sanitize stack trace or excessive logs from error message
    const sanitizeErrorMessage = (msg) => {
      if (!msg) return 'The page could not be opened or captured.';
      const firstLine = msg.split('\n')[0];
      return firstLine.replace(/at\s+[\s\S]+/gi, '').trim();
    }

    const safeMessage = sanitizeErrorMessage(job.error?.message);

    return (
      <Card className="border-red-500/20 bg-slate-950/60 p-6 rounded-2xl border text-left space-y-4 shadow-2xl relative overflow-hidden" glass={true}>
        <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0 shadow-md">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-base font-bold text-white tracking-tight">{errorTitle}</h3>
            <p className="text-xs text-red-400 font-semibold">{safeMessage}</p>
            {job.currentStep && (
              <p className="text-[11px] text-muted mt-1.5">
                Failed at step: <span className="font-semibold text-gray-300 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">{job.currentStep}</span>
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-black/35 border border-white/5 rounded-xl p-4 font-mono text-[11px] text-gray-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div><span className="text-muted">Code:</span> <span className="text-red-400 font-bold">{job.error?.code || 'CAPTURE_FAILED'}</span></div>
            {job.finishedAt && (
              <div><span className="text-muted">Timestamp:</span> <span>{formatDate ? formatDate(job.finishedAt) : job.finishedAt}</span></div>
            )}
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              disabled={isAnyJobRunning}
              variant="danger"
              size="sm"
              className="flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Snapshot
            </Button>
          )}
        </div>
      </Card>
    )
  }

  if (realStatus === 'queued' || realStatus === 'running') {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/[0.08] rounded-3xl bg-black/20">
        <div className="w-12 h-12 border-4 border-[#6D5DFB] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-bold text-white">Rebuilding Page Offline</h3>
        <p className="text-xs text-[#A1A1AA] max-w-xs mt-2 leading-relaxed">
          Pipeline status: <span className="text-blue-400 font-semibold">{job.currentStep || 'Running'}</span> ({job.progress || 0}%)
        </p>
      </div>
    )
  }

  const activeJob = fullJob || job
  const { title, screenshotPath, assetSummary, rewrite, files, intelligence, visualCompare, capture, mode } = {
    ...(job.metadata || {}),
    ...(activeJob || {}),
    mode: activeJob.mode || job.metadata?.mode || job.mode || 'offline-package',
    files: activeJob.files || job.metadata?.files,
    rewrite: activeJob.rewrite || job.metadata?.rewrite,
    intelligence: activeJob.intelligence || job.metadata?.intelligence,
    visualCompare: activeJob.visualCompare || job.metadata?.visualCompare,
    capture: activeJob.capture || job.metadata?.capture
  }

  const tabs = [
    { id: 'preview', label: 'Local Preview', icon: <Monitor className="w-4.5 h-4.5" /> },
    { id: 'screenshot', label: 'Original Screenshot', icon: <Image className="w-4.5 h-4.5" /> },
    { id: 'assets', label: 'Assets Captured', icon: <Layers className="w-4.5 h-4.5" /> },
    { id: 'html', label: 'Rebuilt HTML', icon: <FileCode className="w-4.5 h-4.5" /> },
    { id: 'compare', label: 'Visual Match', icon: <Sparkles className="w-4.5 h-4.5" /> }
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden shadow-2xl border border-border" glass={true}>
      <CardHeader className="bg-black/10 p-0 border-b border-border">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6 bg-slate-900/35">
        {/* Mode Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Snapshot Mode:</span>
          {mode === 'single-html' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
              Single HTML (Remote Assets)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
              Offline Package (Downloaded Assets)
            </span>
          )}
        </div>
        
        {/* Single HTML Mode Warning */}
        {mode === 'single-html' && (
          <div className="mb-5 p-3.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p><strong className="text-purple-200">Single HTML Mode:</strong> This snapshot uses remote asset references. Assets (images, CSS, JS) are loaded from the original website URLs.</p>
                <p className="text-[11px] text-purple-300/80">⚠️ Not fully offline-ready. If the original website changes or removes assets, this snapshot may change visually or stop working.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Phase Limitations Notice - Only for offline-package mode */}
        {mode !== 'single-html' && (
          <div className="mb-5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#A1A1AA] text-xs space-y-1">
            <div><strong>Status:</strong> <span className="text-emerald-400 font-semibold">More offline-ready</span> | HTML paths rewritten | CSS URLs rewritten</div>
            <div className="text-[11px] text-gray-400">HTML asset links and tag attributes have been rewritten to load local resources. CSS internal url() and @import statements are also mapped to downloaded assets. Original backups included. Note: JS/API dependencies may still require original origin.</div>
          </div>
        )}

        {/* Discovered Asset Summary bar - Only for offline-package mode */}
        {mode !== 'single-html' && assetSummary && (
          <div className="mb-5 p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Asset Downloader Summary:</span>
              <span className="text-[10px] text-muted">
                Total size: <strong className="text-white">{formatBytes(assetSummary.totalSizeBytes || 0)}</strong>
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2.5 text-[11px]">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                Downloaded: {assetSummary.downloaded || 0}
              </span>
              <span className="bg-red-500/10 text-red-400 border border-red-500/10 px-2.5 py-1 rounded-full font-semibold">
                Failed: {assetSummary.failed || 0}
              </span>
              <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                Skipped: {assetSummary.skipped || 0}
              </span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/10 px-2.5 py-1 rounded-full font-semibold">
                Total Discovered: {assetSummary.total || 0}
              </span>
            </div>
          </div>
        )}

        {/* HTML Rewrite Summary bar - Only for offline-package mode */}
        {mode !== 'single-html' && rewrite?.html && (
          <div className="mb-5 p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">HTML Path Rewrite:</span>
              <span className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                {files?.originalHtml ? (
                  <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[9px]">Original HTML backup included</span>
                ) : null}
                <span className="text-gray-400">({files?.originalHtml || 'index.original.html'})</span>
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2.5 text-[11px]">
              <span className="bg-violet-500/10 text-violet-400 border border-violet-500/10 px-2.5 py-1 rounded-full font-semibold">
                Status: HTML paths rewritten
              </span>
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/10 px-2.5 py-1 rounded-full font-semibold">
                Rewritten tags: {rewrite.html.rewrittenCount || 0}
              </span>
              <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                Skipped/Unchanged: {rewrite.html.skippedCount || 0}
              </span>
            </div>
          </div>
        )}

        {/* CSS Rewrite Summary bar - Only for offline-package mode */}
        {mode !== 'single-html' && rewrite?.css && (
          <div className="mb-5 p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">CSS URL Rewrite:</span>
              <span className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                {rewrite.css.createdBackups ? (
                  <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[9px]">Original backups included</span>
                ) : null}
                <span className="text-gray-400">({rewrite.css.filesProcessed} stylesheet files processed)</span>
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2.5 text-[11px]">
              <span className="bg-teal-500/10 text-teal-400 border border-teal-500/10 px-2.5 py-1 rounded-full font-semibold">
                Status: CSS URLs rewritten
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                Rewritten: {rewrite.css.rewrittenCount || 0}
              </span>
              <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                Skipped/Unchanged: {rewrite.css.skippedCount || 0}
              </span>
            </div>
          </div>
        )}

        {/* Auto Scroll / Lazy Load Capture bar */}
        {capture?.autoScroll && (
          <div className="mb-5 p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-left">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Auto Scroll & Lazy Load Capture:</span>
              <span className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
                {capture.autoScroll.enabled ? (
                  <>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[9px] ${
                      capture.autoScroll.status === 'completed' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {capture.autoScroll.status === 'completed' ? 'Completed Successfully' : 'Failed / Incomplete'}
                    </span>
                    {capture.autoScroll.error && (
                      <span className="text-red-400/80 font-medium">({capture.autoScroll.error.message})</span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400">Auto scroll was disabled for this snapshot.</span>
                )}
              </span>
            </div>
            
            {capture.autoScroll.enabled && (
              <div className="flex flex-wrap gap-2.5 text-[11px]">
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/10 px-2.5 py-1 rounded-full font-semibold">
                  Scrolled: {capture.autoScroll.scrolledDistancePx ?? 0} px
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/10 px-2.5 py-1 rounded-full font-semibold">
                  Duration: {capture.autoScroll.durationMs ? `${(capture.autoScroll.durationMs / 1000).toFixed(2)}s` : '0s'}
                </span>
                <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                  Step Size: {capture.autoScroll.stepPx ?? 0} px
                </span>
                <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                  Back to Top: {capture.autoScroll.backToTop ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Snapshot Intelligence Card */}
        {intelligence && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Animation-aware snapshot analysis
              </span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/15">
                Runtime libraries detected
              </span>
            </div>

            {/* Counts summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
                <span className="text-sm font-bold text-white block">
                  {intelligence.summary?.totalDetected || 0}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block mt-0.5">
                  Total Detected
                </span>
              </div>
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
                <span className="text-sm font-bold text-violet-400 block">
                  {intelligence.summary?.animationLibraries || 0}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block mt-0.5">
                  Animation Libraries
                </span>
              </div>
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
                <span className="text-sm font-bold text-blue-400 block">
                  {intelligence.summary?.frameworks || 0}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block mt-0.5">
                  Frameworks
                </span>
              </div>
              <div className="bg-black/40 border border-white/5 p-2 rounded-lg text-center">
                <span className="text-sm font-bold text-teal-400 block">
                  {intelligence.summary?.uiLibraries || 0}
                </span>
                <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold block mt-0.5">
                  UI Libraries
                </span>
              </div>
            </div>

            {/* Badges list */}
            {intelligence.detectedNames && intelligence.detectedNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(intelligence.libraries || {}).flatMap(([category, libs]) => 
                  libs.map(lib => {
                    const categoryColors = {
                      animation: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
                      frameworks: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
                      ui: 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                    }
                    const confidenceDot = {
                      high: 'bg-emerald-400',
                      medium: 'bg-blue-400',
                      low: 'bg-gray-400'
                    }
                    return (
                      <div 
                        key={lib.name}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${categoryColors[category] || 'bg-gray-500/10 text-gray-300 border-white/10'}`}
                        title={`${lib.notes || ''} (Confidence: ${lib.confidence})`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${confidenceDot[lib.confidence] || 'bg-gray-400'}`} />
                        <span>{lib.name}</span>
                        <span className="text-[9px] text-muted opacity-80 uppercase tracking-wider font-mono pl-1 border-l border-white/10 ml-0.5">
                          {lib.confidence}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <div className="text-center py-2 text-[11px] text-muted font-medium">
                No known frontend frameworks or animation libraries detected. (Informational only)
              </div>
            )}
          </div>
        )}

        {/* Visual Comparison Summary bar */}
        <div className="mb-5 p-3.5 rounded-xl bg-black/30 border border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5 text-left">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Visual Matching:</span>
            <span className="text-[10px] text-muted flex items-center gap-1.5 mt-0.5">
              {visualCompare && visualCompare.status === 'completed' ? (
                <>
                  <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded text-[9px]">
                    Comparison Complete
                  </span>
                  <span className="text-gray-400">({visualCompare.differentPixels?.toLocaleString() || 0} different pixels)</span>
                </>
              ) : visualCompare && visualCompare.status === 'failed' ? (
                <span className="text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded text-[9px]">
                  Comparison Failed
                </span>
              ) : (
                <span className="text-gray-400">Visual comparison has not run for this snapshot yet.</span>
              )}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2.5 text-[11px]">
            {visualCompare && visualCompare.status === 'completed' ? (
              <>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/10 px-2.5 py-1 rounded-full font-semibold font-mono">
                  Match Score: {visualCompare.score}%
                </span>
                <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold font-mono">
                  Dimensions: {visualCompare.dimensions?.width || 1440}x{visualCompare.dimensions?.height || 1200} px
                </span>
              </>
            ) : visualCompare && visualCompare.status === 'failed' ? (
              <span className="bg-red-500/10 text-red-400 border border-red-500/10 px-2.5 py-1 rounded-full font-semibold">
                Error: {visualCompare.error?.code || 'FAILED'}
              </span>
            ) : (
              <span className="bg-gray-500/15 text-gray-400 border border-white/5 px-2.5 py-1 rounded-full font-semibold">
                Status: Not run
              </span>
            )}
          </div>
        </div>

        {activeTab === 'preview' && (
          <PreviewFrame jobId={job.jobId} url={job.url} />
        )}
        
        {activeTab === 'screenshot' && (
          <ScreenshotPreview screenshotPath={screenshotPath} title={title} />
        )}
        
        {activeTab === 'assets' && (
          <AssetList jobId={job.jobId} />
        )}
        
        {activeTab === 'html' && (
          <HtmlViewer jobId={job.jobId} url={job.url} />
        )}

        {activeTab === 'compare' && (
          <VisualCompareCard job={job} />
        )}
      </CardContent>
    </Card>
  )
}