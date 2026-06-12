import React, { useState } from 'react'
import { Sparkles, Eye, ImagePlus, AlertTriangle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { jobApi } from '../../services/jobApi'

export default function VisualCompareCard({ job }) {
  const [view, setView] = useState('diff')

  if (!job || (job.status !== 'completed' && job.status !== 'done')) return null

  const vc = job.visualCompare || job.metadata?.visualCompare

  if (!vc) {
    return (
      <Card className="overflow-hidden border border-border" glass={false}>
        <CardContent className="p-8 text-center text-xs text-muted">
          Visual comparison has not run for this snapshot yet.
        </CardContent>
      </Card>
    )
  }

  if (vc.status === 'failed') {
    return (
      <Card className="overflow-hidden border border-border" glass={false}>
        <CardHeader className="bg-black/25 pb-3 border-b border-border">
          <CardTitle className="text-xs flex items-center gap-1.5 uppercase tracking-wider text-red-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Visual Comparison Failed
          </CardTitle>
          <CardDescription>
            The comparison pipeline encountered an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-xs text-red-400/90 bg-red-950/15">
          <p><strong>Error Message:</strong> {vc.error?.message || 'Unknown visual compare error'}</p>
          <p className="mt-1 text-gray-400 font-sans">Please make sure the snapshot runs successfully and generates a viewport capture.</p>
        </CardContent>
      </Card>
    )
  }

  const getScoreBadgeVariant = (score) => {
    if (score >= 95) return 'success'
    if (score >= 80) return 'primary'
    return 'neutral'
  }

  return (
    <Card className="overflow-hidden border border-border" glass={false}>
      <CardHeader className="bg-black/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <CardTitle className="text-xs flex items-center gap-1.5 uppercase tracking-wider text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            Visual Match Score
          </CardTitle>
          <CardDescription>
            Estimated similarity: visual comparison of rendered screenshot vs rebuilt preview screenshot.
          </CardDescription>
        </div>
        
        <Badge variant={getScoreBadgeVariant(vc.score)} className="text-xs font-mono font-bold shrink-0 px-3 py-1">
          Similarity: {vc.score}%
        </Badge>
      </CardHeader>
      
      <CardContent className="p-0 bg-slate-950 flex flex-col min-h-[350px]">
        {/* View togglers */}
        <div className="p-3 border-b border-border/40 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-1.5 bg-black/40 border border-white/5 p-1 rounded-lg">
            {[
              { id: 'diff', label: 'Difference Map', icon: <ImagePlus className="w-3.5 h-3.5" /> },
              { id: 'original', label: 'Original Capture', icon: <Eye className="w-3.5 h-3.5" /> },
              { id: 'snapshot', label: 'Local Preview', icon: <Eye className="w-3.5 h-3.5" /> }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setView(btn.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200 outline-none ${
                  view === btn.id
                    ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex gap-4 text-[10px] text-muted font-semibold">
            <span>
              Diff Pixels: <strong className="text-gray-300">{vc.differentPixels?.toLocaleString() || 0}</strong>
            </span>
            <span>
              Dimensions: <strong className="text-gray-300">{vc.dimensions?.width || 1440}x{vc.dimensions?.height || 1200} px</strong>
            </span>
          </div>
        </div>

        {/* Diff Canvas / Frame View */}
        <div className="flex-1 p-4 flex flex-col justify-center items-center relative overflow-hidden bg-slate-900 min-h-[350px]">
          
          {view === 'diff' && (
            <div className="w-full flex flex-col items-center gap-4">
              <img 
                src={jobApi.getVisualDiffUrl(job.jobId)} 
                alt="Difference Map" 
                className="max-w-full max-h-[500px] object-contain border border-white/10 rounded-lg shadow-lg"
              />
              <p className="text-[10px] text-muted text-center max-w-md">
                Highlights design shifts or layout offsets in hot-pink. Differences may be caused by loading timing, lazy fonts, or dynamic web elements.
              </p>
            </div>
          )}

          {view === 'original' && (
            <div className="w-full flex flex-col items-center gap-4">
              <img 
                src={jobApi.getScreenshotUrl(job.jobId)} 
                alt="Original Capture" 
                className="max-w-full max-h-[500px] object-contain border border-white/10 rounded-lg shadow-lg"
              />
              <p className="text-[10px] text-muted text-center max-w-md">
                Reference capture taken from the original live page render context.
              </p>
            </div>
          )}

          {view === 'snapshot' && (
            <div className="w-full flex flex-col items-center gap-4">
              <img 
                src={jobApi.getPreviewScreenshotUrl(job.jobId)} 
                alt="Local Preview" 
                className="max-w-full max-h-[500px] object-contain border border-white/10 rounded-lg shadow-lg"
              />
              <p className="text-[10px] text-muted text-center max-w-md">
                Capture of the compiled offline snapshot package running in the preview sandbox.
              </p>
            </div>
          )}

        </div>

      </CardContent>
    </Card>
  )
}
