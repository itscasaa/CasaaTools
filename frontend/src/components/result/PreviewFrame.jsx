import React, { useState } from 'react'
import { Card, CardContent } from '../ui/Card'
import { Monitor, Tablet, Phone, RotateCcw } from 'lucide-react'
import { appConfig } from '../../constants/appConfig'

/**
 * Renders the snapshot preview inside a sandboxed iframe.
 * Allows switching between desktop, tablet, and mobile widths.
 */
export default function PreviewFrame({ jobId, url }) {
  const [device, setDevice] = useState('desktop')
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0) // helper to force iframe reload

  const deviceWidths = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]'
  }

  const handleRefresh = () => {
    setLoading(true)
    setKey(prev => prev + 1)
  }

  const handleLoad = () => {
    setLoading(false)
  }

  const previewUrl = `${appConfig.apiBaseUrl}/preview/${jobId}`

  return (
    <Card className="flex flex-col overflow-hidden border border-border" glass={false}>
      
      {/* Viewport controls bar */}
      <div className="p-3 border-b border-border bg-black/20 flex flex-wrap items-center justify-between gap-3">
        
        {/* Device toggle list */}
        <div className="flex gap-1 bg-black/40 border border-white/5 p-1 rounded-lg">
          {[
            { id: 'desktop', icon: <Monitor className="w-4 h-4" />, label: 'Desktop' },
            { id: 'tablet', icon: <Tablet className="w-4 h-4" />, label: 'Tablet' },
            { id: 'mobile', icon: <Phone className="w-4 h-4" />, label: 'Mobile' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDevice(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 outline-none ${
                device === item.id
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
              title={item.label}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Action icons */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-transparent text-gray-400 hover:text-white hover:bg-white/5 text-[11px] font-semibold transition-all duration-200 outline-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reload Sandbox
        </button>

      </div>

      {/* Path rewrite notification banner */}
      <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 text-blue-400/90 text-[10px] leading-relaxed flex flex-col gap-1.5 text-left">
        <div>
          <strong>Preview status:</strong> Preview now uses rewritten HTML and CSS asset paths where available. Some JavaScript may still depend on the original site origin or APIs. Detected libraries are informational. Some animations may still depend on original APIs, timing, browser state, or external services. Visual comparison estimates screenshot similarity. Dynamic animations, API calls, and browser timing may affect the score.
        </div>
        <div className="text-gray-400 border-t border-blue-500/10 pt-1">
          This snapshot uses auto-scroll to trigger lazy-loaded assets before capture. Some interaction-based content may still require manual actions and may not be captured.
        </div>
      </div>

      <CardContent className="p-0 bg-slate-950 flex justify-center items-center overflow-x-auto min-h-[450px] relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 space-y-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted">Compiling dynamic sandbox frame...</span>
          </div>
        )}
        <div className={`h-[500px] border-x border-border/40 transition-all duration-500 bg-white ${deviceWidths[device]} ${loading ? 'opacity-0' : 'opacity-100'}`}>
          <iframe
            key={key}
            src={previewUrl}
            onLoad={handleLoad}
            title="CasaaTools Local Snapshot Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </CardContent>
    </Card>
  )
}