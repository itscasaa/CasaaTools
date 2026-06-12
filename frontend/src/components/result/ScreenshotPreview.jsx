import React from 'react'
import { Card, CardContent } from '../ui/Card'
import { Eye, ImageIcon } from 'lucide-react'

export default function ScreenshotPreview({ screenshotPath, title }) {
  return (
    <Card className="overflow-hidden border border-border bg-black/40" glass={false}>
      <div className="p-3 border-b border-border bg-black/25 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
          Full Page Render Screenshot
        </span>
        <span className="text-[10px] text-muted font-mono">1280 x 800 px</span>
      </div>
      <CardContent className="p-0 relative group min-h-[300px] flex items-center justify-center bg-slate-950">
        {screenshotPath ? (
          <>
            <img
              src={screenshotPath}
              alt={title || 'Page Snapshot Screenshot'}
              className="w-full h-auto max-h-[500px] object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
            {/* Hover overlay detail */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
              <span className="bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg text-xs font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Raw viewport snapshot capture
              </span>
            </div>
          </>
        ) : (
          <div className="text-center p-8">
            <ImageIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <span className="text-xs text-muted">Screenshot image not available</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}