import React, { useState, useEffect } from 'react'
import { FileCode, FileImage, FileText, HelpCircle, Layers, ShieldAlert, AlertTriangle } from 'lucide-react'
import { jobApi } from '../../services/jobApi'
import { Card, CardContent } from '../ui/Card'
import { formatBytes } from '../../utils/formatBytes'

/**
 * Component to list discovered and downloaded assets from the snapshot manifest.json.
 */
export default function AssetList({ jobId }) {
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadManifest() {
      setLoading(true)
      setError(null)
      try {
        const manifestData = await jobApi.getManifest(jobId)
        setManifest(manifestData)
      } catch (e) {
        console.error(e)
        setError(e.message || 'Failed to load manifest')
      } finally {
        setLoading(false)
      }
    }
    if (jobId) {
      loadManifest()
    }
  }, [jobId])

  const assetIcons = {
    css: <FileCode className="w-4 h-4 text-violet-400" />,
    stylesheet: <FileCode className="w-4 h-4 text-violet-400" />,
    js: <FileCode className="w-4 h-4 text-indigo-400" />,
    script: <FileCode className="w-4 h-4 text-indigo-400" />,
    image: <FileImage className="w-4 h-4 text-blue-400" />,
    font: <FileText className="w-4 h-4 text-emerald-400" />,
    media: <FileText className="w-4 h-4 text-rose-400" />
  }

  const getStatusBadge = (asset) => {
    switch (asset.status) {
      case 'downloaded':
        if (asset.rewrittenInHtml) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-violet-400 font-semibold bg-violet-500/10 px-2.5 py-0.5 rounded-full" title="Rewritten in index.html">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              HTML Rewritten
            </span>
          )
        }
        if (asset.rewrittenInCss) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2.5 py-0.5 rounded-full" title="Rewritten in CSS file">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              CSS Rewritten
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Downloaded only
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-red-400 font-semibold bg-red-500/10 px-2.5 py-0.5 rounded-full" title={asset.error?.message}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Failed
          </span>
        )
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold bg-white/5 px-2.5 py-0.5 rounded-full" title={asset.error?.message}>
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Skipped
          </span>
        )
      case 'discovered':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Download pending
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="text-center p-8 space-y-2">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <span className="text-xs text-muted font-medium">Reading asset downloader manifest...</span>
      </div>
    )
  }

  if (error || !manifest) {
    return (
      <div className="text-center p-8 border border-dashed border-white/[0.08] rounded-xl bg-black/20 space-y-2">
        <ShieldAlert className="w-8 h-8 text-gray-500 mx-auto" />
        <p className="text-xs text-muted">Asset downloader catalog not available for this snapshot.</p>
      </div>
    )
  }

  const assets = manifest.assets || []
  const summary = manifest.summary || {}

  const otherCount = 
    (summary.other || 0) + 
    (summary.html || 0) + 
    (summary.iframe || 0) + 
    (summary.document || 0) + 
    (summary.data || 0)

  return (
    <div className="space-y-4">
      {/* Informational warning banner */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <strong>Informational only:</strong> Asset discovery and library detection results are best-effort. Some animations may still depend on original APIs, browser state, or external services.
      </div>
      
      {/* Type breakdown counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Stylesheets', count: summary.stylesheet || 0, color: 'text-violet-400' },
          { label: 'Scripts', count: summary.script || 0, color: 'text-indigo-400' },
          { label: 'Images', count: summary.image || 0, color: 'text-blue-400' },
          { label: 'Fonts', count: summary.font || 0, color: 'text-emerald-400' },
          { label: 'Media', count: summary.media || 0, color: 'text-rose-400' },
          { label: 'Others', count: otherCount, color: 'text-gray-400' }
        ].map((item, idx) => (
          <div key={idx} className="bg-black/25 border border-white/5 p-3 rounded-lg text-center shadow">
            <span className={`text-lg font-bold block ${item.color}`}>{item.count}</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block mt-0.5">{item.label}</span>
          </div>
        ))}
      </div>

      <Card className="overflow-hidden border border-border" glass={false}>
        <div className="p-3 border-b border-border bg-black/25 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Downloaded Assets Catalog (manifest.json)
          </span>
          <span className="text-[10px] text-muted font-mono">{summary.total || assets.length} resources discovered</span>
        </div>
        
        <CardContent className="p-0 bg-slate-950/60 max-h-[350px] overflow-y-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 border-b border-border/80 text-gray-400 text-[10px] tracking-wider uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Suggested / Local Path</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Original URL</th>
                  <th className="px-4 py-2.5">File Size</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {assets.map((asset, idx) => {
                  const hasError = asset.status === 'failed' || asset.status === 'skipped'
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors duration-150">
                      <td className="px-4 py-2.5 text-white font-medium flex flex-col gap-0.5 truncate max-w-[200px]" title={asset.localPath || asset.suggestedLocalPath}>
                        <div className="flex items-center gap-2">
                          {assetIcons[asset.type] || <HelpCircle className="w-4 h-4 text-gray-500" />}
                          <span>{asset.localPath || asset.suggestedLocalPath}</span>
                        </div>
                        {hasError && asset.error?.message && (
                          <span className="text-[9px] text-red-400/90 flex items-center gap-1 pl-6">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            {asset.error.message}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 uppercase text-gray-400 font-semibold text-[10px]">{asset.type}</td>
                      <td className="px-4 py-2.5 text-muted truncate max-w-[220px]" title={asset.originalUrl}>
                        <a href={asset.originalUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                          {asset.originalUrl}
                        </a>
                      </td>
                      <td className="px-4 py-2.5 text-gray-300">
                        {asset.sizeBytes ? formatBytes(asset.sizeBytes) : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {getStatusBadge(asset)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}