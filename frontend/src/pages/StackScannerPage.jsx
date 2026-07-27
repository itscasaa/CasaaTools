import React, { useState } from 'react'
import { 
  Globe, AlertTriangle, ShieldCheck, Cpu, Layers, Sparkles, RefreshCw, 
  Server, Activity, CheckCircle2, ChevronRight, BarChart3, AlertCircle 
} from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { scanApi } from '../services/scanApi'
import { validateUrl } from '../utils/urlValidator'

export default function StackScannerPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleScan = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError('Masukkan URL target terlebih dahulu.')
      return
    }

    const validation = validateUrl(trimmedUrl)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    setLoading(true)
    try {
      const response = await scanApi.startStackScan({ url: trimmedUrl })
      setResult(response.data)
    } catch (err) {
      setError(err.message || 'Gagal memindai teknologi dan layout website.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center mb-8 select-none animate-fadeIn">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight flex items-center justify-center gap-2.5">
          <Cpu className="w-8 h-8 text-blue-500 animate-pulse" />
          Stack & Layout Auditor
        </h1>
        <p className="mt-3 text-sm text-[#A1A1AA] max-w-xl mx-auto">
          Audit layout overlap, performa aset, framework frontend, dan pustaka animasi secara konkrit langsung dari context browser aktif.
        </p>
      </div>

      {/* Input Card */}
      <Card className="w-full relative overflow-hidden" glass={true}>
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    if (error) setError('')
                  }}
                  disabled={loading}
                  error={!!error}
                  icon={<Globe className="w-5 h-5" />}
                  className="w-full text-base py-3"
                  aria-label="Target Website URL"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading}
                className="px-6 py-3 text-sm font-semibold shrink-0 h-[48px] flex items-center gap-2"
              >
                {loading ? 'Auditing...' : 'Mulai Audit Website'}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Results panel */}
      {result && (
        <div className="space-y-6 animate-fadeIn text-left">
          {/* Metadata & Page Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <Card glass={true} className="p-4 flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono block">SERVER</span>
              <span className="text-sm font-semibold text-white truncate mt-1 block">{result.server || 'N/A'}</span>
            </Card>

            <Card glass={true} className="p-4 flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono block">GENERATOR</span>
              <span className="text-sm font-semibold text-white truncate mt-1 block">{result.generator || 'N/A'}</span>
            </Card>

            <Card glass={true} className="p-4 flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono block">POWERED BY</span>
              <span className="text-sm font-semibold text-white truncate mt-1 block">{result.poweredBy || 'N/A'}</span>
            </Card>

            <Card glass={true} className="p-4 flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono block">EST. SIZE</span>
              <span className="text-sm font-semibold text-white truncate mt-1 block">
                {result.stats?.totalAssetsSizeKb ? `${result.stats.totalAssetsSizeKb} KB` : 'N/A'}
              </span>
            </Card>

            <Card glass={true} className="p-4 flex flex-col justify-between border border-white/5">
              <span className="text-[10px] text-neutral-500 font-mono block">REQUESTS</span>
              <span className="text-sm font-semibold text-white truncate mt-1 block">
                {result.stats?.assetCount ? `${result.stats.assetCount} assets` : 'N/A'}
              </span>
            </Card>
          </div>

          {/* Overlapping Selection (Layout Audit) Section */}
          <Card glass={true} className="border border-white/5">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Overlapping Elements Check (Concrete Layout Audit)
              </h3>
              
              {result.overlaps && result.overlaps.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Terdeteksi {result.overlaps.length} elemen yang saling tumpang tindih (overlapping bounding box). Ini biasanya disebabkan oleh error inisialisasi ganda pada animasi atau absolute positioning yang tidak sinkron.</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.overlaps.map((overlap, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-black/30 border border-white/5 hover:border-red-500/20 transition-all flex flex-col gap-2">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="font-semibold text-red-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                            Overlapping Conflict #{idx + 1}
                          </span>
                          <span className="text-neutral-500 font-mono text-[10px]">
                            Overlap Area: {overlap.overlapArea} px² ({overlap.intersectWidth}x{overlap.intersectHeight}px)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                            <span className="text-[10px] text-neutral-500 font-mono block">ELEMENT A</span>
                            <span className="text-white font-medium">&lt;{overlap.elementA.tagName}&gt;</span>
                            <p className="text-neutral-400 text-[11px] mt-0.5 truncate italic">"{overlap.elementA.text || '(empty)'}"</p>
                            <span className="text-[10px] text-neutral-500 block mt-1">Dims: {overlap.elementA.width}x{overlap.elementA.height}px</span>
                          </div>
                          <div className="p-2 rounded bg-white/[0.02] border border-white/5">
                            <span className="text-[10px] text-neutral-500 font-mono block">ELEMENT B</span>
                            <span className="text-white font-medium">&lt;{overlap.elementB.tagName}&gt;</span>
                            <p className="text-neutral-400 text-[11px] mt-0.5 truncate italic">"{overlap.elementB.text || '(empty)'}"</p>
                            <span className="text-[10px] text-neutral-500 block mt-1">Dims: {overlap.elementB.width}x{overlap.elementB.height}px</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2.5">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-semibold text-white">Layout Aman</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Tidak ditemukan tumpang tindih elemen yang signifikan. Struktur bounding box dan rendering aman.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Animation & Stack Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Animation Libraries Card */}
            <Card glass={true} className="border border-white/5">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Library Animasi Runtime
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  {Object.entries(result.animations).map(([name, detected]) => (
                    <div 
                      key={name}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        detected 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 font-medium' 
                          : 'bg-white/[0.02] border-white/5 text-neutral-500'
                      }`}
                    >
                      <span className="capitalize">{name.replace('Js', ' JS')}</span>
                      <Badge variant={detected ? 'primary' : 'neutral'} className="text-[10px]">
                        {detected ? 'Detected' : 'Not Found'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Frameworks & Tech Stack Card */}
            <Card glass={true} className="border border-white/5">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                  <Layers className="w-5 h-5 text-blue-500" />
                  UI Framework & Stack
                </h3>
                <div className="grid grid-cols-2 gap-3.5">
                  {Object.entries(result.stack).map(([name, detected]) => (
                    <div 
                      key={name}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        detected 
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 font-medium' 
                          : 'bg-white/[0.02] border-white/5 text-neutral-500'
                      }`}
                    >
                      <span className="capitalize">{name.replace('Js', ' JS')}</span>
                      <Badge variant={detected ? 'primary' : 'neutral'} className="text-[10px]">
                        {detected ? 'Detected' : 'Not Found'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Page Stats Card */}
          <Card glass={true} className="border border-white/5">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <BarChart3 className="w-5 h-5 text-violet-500" />
                Statistik Struktur Page DOM
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-neutral-500 font-mono block">TOTAL LINKS</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{result.stats?.totalLinks || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-neutral-500 font-mono block">TOTAL BUTTONS</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{result.stats?.totalButtons || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-neutral-500 font-mono block">TOTAL IMAGES</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{result.stats?.totalImages || 0}</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <span className="text-[10px] text-neutral-500 font-mono block">TOTAL HEADINGS</span>
                  <span className="text-2xl font-bold text-white mt-1 block">{result.stats?.totalHeadings || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  )
}
