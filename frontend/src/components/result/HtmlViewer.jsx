import React, { useState, useEffect } from 'react'
import { FileCode, Copy, Check } from 'lucide-react'
import { jobApi } from '../../services/jobApi'
import { Card, CardContent } from '../ui/Card'

export default function HtmlViewer({ jobId, url }) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadHtml() {
      setLoading(true)
      try {
        const content = await jobApi.getJobHtml(jobId, url)
        setHtml(content)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    if (jobId) {
      loadHtml()
    }
  }, [jobId, url])

  const handleCopy = () => {
    navigator.clipboard.writeText(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="text-center p-8 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted">Reading rebuilt index.html source code...</span>
      </div>
    )
  }

  const lines = html.split('\n')

  return (
    <Card className="overflow-hidden border border-border" glass={false}>
      <div className="p-3 border-b border-border bg-black/25 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          index.html (Rebuilt DOM Source)
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-white/5 text-[10px] font-semibold transition-all duration-200 outline-none"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy Code
            </>
          )}
        </button>
      </div>
      <CardContent className="p-0 bg-slate-950 font-mono text-xs max-h-[400px] overflow-y-auto flex">
        {/* Line Numbers */}
        <div className="text-right select-none text-gray-700 bg-black/25 border-r border-border/40 py-4 px-3 w-10 shrink-0 text-[10px]">
          {lines.map((_, idx) => (
            <div key={idx} className="h-[18px]">{idx + 1}</div>
          ))}
        </div>
        {/* Source Code */}
        <pre className="p-4 text-slate-300 overflow-x-auto w-full leading-[18px] select-all">
          <code>{html}</code>
        </pre>
      </CardContent>
    </Card>
  )
}