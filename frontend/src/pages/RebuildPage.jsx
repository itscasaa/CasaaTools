import React, { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  RotateCcw, AlertTriangle, ArrowLeft, Chrome, FileCode, Layers, 
  RefreshCw, Archive, Eye, Play, Sparkles, Plus, Minus, HelpCircle, Cpu, ArrowUpRight, History, Trash2, Download, TrendingUp
} from 'lucide-react'

import CloneForm from '../components/tool/CloneForm'
import ToolShell from '../components/tool/ToolShell'
import CloneProgress from '../components/tool/CloneProgress'
import ProcessTimeline from '../components/tool/ProcessTimeline'
import DownloadCard from '../components/result/DownloadCard'
import ResultPanel from '../components/result/ResultPanel'
import { useCloneJob } from '../hooks/useCloneJob'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { jobApi } from '../services/jobApi'

export default function RebuildPage() {
  const { job, loading, error, errorCode, startClone, reset } = useCloneJob()
  const formRef = useRef(null)
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const stepMap = {
    'Queued': {
      title: 'Queued for Snapshot',
      description: 'Your URL has been accepted and is waiting for processing.'
    },
    'Starting snapshot': {
      title: 'Starting Snapshot',
      description: 'Preparing the browser capture pipeline.'
    },
    'Launching browser': {
      title: 'Launching Browser',
      description: 'Starting a safe headless Chromium session.'
    },
    'Opening page': {
      title: 'Opening Page',
      description: 'Navigating to the target URL and waiting for the page to load.'
    },
    'Cooldown delay': {
      title: 'Cooldown Delay',
      description: 'Waiting for website assets to render completely.'
    },
    'Triggering lazy-loaded content': {
      title: 'Triggering Lazy-Loaded Content',
      description: 'Scrolling viewport gradually to trigger lazy-loaded sections.'
    },
    'Capturing rendered DOM': {
      title: 'Capturing Rendered DOM',
      description: 'Saving the final browser-rendered HTML.'
    },
    'Capturing screenshot': {
      title: 'Capturing Screenshot',
      description: 'Creating the original full-page screenshot.'
    },
    'Discovering assets': {
      title: 'Discovering Assets',
      description: 'Scanning HTML and network resources.'
    },
    'Downloading assets': {
      title: 'Downloading Assets',
      description: 'Saving discovered CSS, JS, images, fonts, and media locally.'
    },
    'Rewriting HTML paths': {
      title: 'Rewriting HTML Paths',
      description: 'Pointing HTML references to downloaded local assets.'
    },
    'Refining HTML layout': {
      title: 'AI HTML Refinement',
      description: 'Optimizing and repairing CSS layout structures and fixing syntax conflicts using 9Router AI.'
    },
    'Rewriting CSS URLs': {
      title: 'Rewriting CSS URLs',
      description: 'Updating stylesheet URL references where local assets exist.'
    },
    'Detecting libraries': {
      title: 'Detecting Libraries',
      description: 'Analyzing runtime libraries and animation frameworks.'
    },
    'Running visual compare': {
      title: 'Running Visual Compare',
      description: 'Comparing the original screenshot with the local preview.'
    },
    'Writing metadata': {
      title: 'Writing Metadata',
      description: 'Saving final manifest, metrics, and snapshot details.'
    },
    'Completed': {
      title: 'Snapshot Ready',
      description: 'Your rebuilt preview and ZIP package are ready.'
    },
    'Failed': {
      title: 'Snapshot Failed',
      description: job?.error?.message || 'The page could not be opened or captured.'
    }
  }

  const currentStepDetails = job ? (stepMap[job.currentStep] || {
    title: job.currentStep || 'Processing Snapshot',
    description: 'Please stand by while Playwright crawls nodes, extracts media, and builds local references.'
  }) : null

  const handleFormSubmit = async (url, options) => {
    try {
      await startClone(url, options)
    } catch (e) {
      setToastMessage(e.message || 'Failed to submit URL.')
      setShowToast(true)
    }
  }

  const isRebuilding = !!job

  return (
    <>
      {!isRebuilding ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center select-none">
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-sans">
                Rebuild Target
              </h1>
              <p className="text-xs text-neutral-400 mt-1">
                Deploy a headless browser session to capture DOM and rewrite resource paths for offline package compilation.
              </p>
            </div>
          </div>

          {/* Form Card wrapper */}
          <div className="max-w-4xl mx-auto mt-4">
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 relative">
              <CloneForm onSubmit={handleFormSubmit} loading={loading} error={error} errorCode={errorCode} />
            </div>
          </div>
        </div>
      ) : (
        /* Active Rebuilder Workspace View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Create New Rebuild Target
            </Button>
            
            <span className="text-xs font-mono bg-[#12131e]/50 border border-white/5 px-3 py-1.5 rounded-lg text-neutral-400 select-none">
              Job ID: <span className="text-blue-400 font-bold">{job.jobId}</span>
            </span>
          </div>

          <ToolShell
            title={job.status === 'completed' ? 'Snapshot Completed Successfully' : 'Rebuilder Pipeline Active'}
            description={`Processing target URL: ${job.url}`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left progress column */}
              <div className="lg:col-span-4 space-y-6">
                <CloneProgress progress={job.progress} currentStep={job.currentStep} />
                <ProcessTimeline logs={job.logs} currentStep={job.currentStep} />
                
                {job.status === 'completed' && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 border-white/10 text-neutral-300 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Ambil Snapshot Baru
                  </Button>
                )}
              </div>

              {/* Right result column */}
              <div className="lg:col-span-8 space-y-6">
                {job.status === 'completed' || job.status === 'failed' ? (
                  <>
                    {job.status === 'completed' && <DownloadCard job={job} />}
                    <ResultPanel job={job} onRetry={() => startClone(job.url)} isAnyJobRunning={loading} />
                  </>
                ) : (
                  <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl bg-[#12131e]/20 space-y-6">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-neutral-900" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-blue-500 animate-spin" />
                      <span className="text-lg font-bold font-mono text-white select-none">{job.progress || 0}%</span>
                    </div>
                    
                    <div className="space-y-2 max-w-md select-none">
                      <h3 className="text-md font-bold text-white tracking-tight">
                        {currentStepDetails.title}
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {currentStepDetails.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 w-full max-w-sm select-none">
                      <p className="text-[10px] text-neutral-600 leading-normal font-sans">
                        CasaaTools sedang memproses snapshot di latar belakang. Halaman akan diperbarui otomatis saat selesai.
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </ToolShell>
        </div>
      )}

      {/* Toast notifications */}
      <Toast
        message={toastMessage || error}
        type="error"
        show={showToast || (!!error && 
          errorCode !== 'JOB_LIMIT_REACHED' &&
          errorCode !== 'RATE_LIMITED' &&
          !error.includes('Too many requests') && 
          !error.includes('Too many snapshot submissions') && 
          !error.includes('Another snapshot job') && 
          !error.includes('A snapshot job is already running') && 
          !error.includes('JOB_LIMIT_REACHED') && 
          !error.includes('RATE_LIMITED' && 
          !error.includes('request limit'))
        )}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
