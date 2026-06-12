import React from 'react'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'

export default function ProcessTimeline({ logs = [], currentStep = '' }) {
  const pipelineSteps = [
    { id: 'Queued', label: 'Queued', description: 'Job received and queued.' },
    { id: 'Starting snapshot', label: 'Starting Snapshot', description: 'Preparing output directory.' },
    { id: 'Launching browser', label: 'Launching Browser', description: 'Starting headless browser instance.' },
    { id: 'Opening page', label: 'Opening Page', description: 'Navigating to target URL.' },
    { id: 'Triggering lazy-loaded content', label: 'Triggering Lazy-Loaded Content', description: 'Scrolling viewport gradually to trigger lazy-loaded sections.' },
    { id: 'Capturing rendered DOM', label: 'Capturing Rendered DOM', description: 'Extracting fully rendered HTML DOM.' },
    { id: 'Capturing screenshot', label: 'Capturing Screenshot', description: 'Saving original viewport screenshot.' },
    { id: 'Discovering assets', label: 'Discovering Assets', description: 'Scanning page references.' },
    { id: 'Downloading assets', label: 'Downloading Assets', description: 'Downloading files locally.' },
    { id: 'Rewriting HTML paths', label: 'Rewriting HTML Paths', description: 'Replacing asset links.' },
    { id: 'Rewriting CSS URLs', label: 'Rewriting CSS URLs', description: 'Replacing internal stylesheet links.' },
    { id: 'Detecting libraries', label: 'Detecting Libraries', description: 'Analyzing runtime frameworks.' },
    { id: 'Running visual compare', label: 'Running Visual Compare', description: 'Comparing screenshots.' },
    { id: 'Writing metadata', label: 'Writing Metadata', description: 'Finalizing metadata catalog.' },
    { id: 'Completed', label: 'Completed', description: 'Rebuild is complete.' }
  ]

  // Detect if there is a failed step in the logs
  const failedLog = logs.find(l => l.status === 'failed' || (l.message && l.message.toLowerCase().includes('failed')))
  const failedStepId = failedLog ? failedLog.step : null

  const currentStepIndex = pipelineSteps.findIndex(s => s.id === currentStep)
  const isComplete = currentStep === 'Completed' || logs.some(l => l.step === 'Completed')

  const renderedLogs = pipelineSteps.map((step, idx) => {
    const matchingLog = logs.find(l => l.step === step.id)
    
    let status = 'pending'
    if (isComplete) {
      status = 'done'
    } else if (failedStepId) {
      const failedIdx = pipelineSteps.findIndex(s => s.id === failedStepId)
      if (idx < failedIdx) {
        status = 'done'
      } else if (idx === failedIdx) {
        status = 'failed'
      } else {
        status = 'pending'
      }
    } else {
      if (idx < currentStepIndex) {
        status = 'done'
      } else if (idx === currentStepIndex) {
        status = 'active'
      } else {
        status = 'pending'
      }
    }

    return {
      ...step,
      status,
      message: matchingLog ? matchingLog.message : (status === 'pending' ? 'Waiting to start...' : step.description)
    }
  })

  const startIndex = Math.max(0, Math.min(currentStepIndex - 3, renderedLogs.length - 7))
  const visibleLogs = renderedLogs.slice(startIndex, startIndex + 7)

  return (
    <div className="space-y-2.5 font-mono">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-bold text-gray-400 tracking-wider uppercase flex items-center gap-1.5">
          {!isComplete && !failedStepId && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />}
          Process Logs
        </h4>
        <span className="text-[9px] text-gray-500">Showing latest process events</span>
      </div>
      <div className="space-y-1.5 max-h-[350px] overflow-hidden">
        {visibleLogs.map((log) => {
          const isDone = log.status === 'done'
          const isActive = log.status === 'active'
          const isFailed = log.status === 'failed'

          return (
            <div
              key={log.id}
              className={`rounded-lg border text-[11px] flex items-start gap-2.5 transition-all duration-300 ${
                isActive
                  ? 'p-2.5 bg-blue-500/5 border-blue-500/20 text-blue-200'
                  : isDone
                  ? 'py-1.5 px-2.5 bg-emerald-500/5 border-emerald-500/5 text-emerald-400/80'
                  : isFailed
                  ? 'p-2.5 bg-red-500/5 border-red-500/15 text-red-400'
                  : 'py-1 px-2.5 bg-transparent border-transparent text-gray-600'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                {isActive && <div className="w-3.5 h-3.5 border border-blue-500 border-t-transparent rounded-full animate-spin" />}
                {isFailed && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                {!isDone && !isActive && !isFailed && <Circle className="w-3.5 h-3.5 text-gray-800" />}
              </div>
              
              <div className="flex-1 text-left leading-normal">
                <span className="font-semibold">{log.label}</span>
                {(!isDone && log.message && log.message !== 'Waiting to start...') && (
                  <span className="text-[9px] text-muted block mt-0.5">{log.message}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}