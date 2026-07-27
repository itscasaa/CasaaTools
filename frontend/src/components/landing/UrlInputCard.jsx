import React, { useState, useRef, useEffect } from 'react'
import { Globe, AlertTriangle, ShieldCheck, Settings } from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { validateUrl } from '../../utils/urlValidator'

export default function UrlInputCard({ onSubmit = () => {}, loading = false, apiError = null, apiErrorCode = null }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const submitLockedRef = useRef(false)
  
  // Rebuild settings options
  const [scrollPage, setScrollPage] = useState(false)
  const [captureAssets, setCaptureAssets] = useState(true)
  const [crawlPages, setCrawlPages] = useState(false)
  const [scrollVelocity, setScrollVelocity] = useState('standard')
  const [aiRefine, setAiRefine] = useState(true)
  
  // Mode selection state (default to null, set on button click)
  const [selectedMode, setSelectedMode] = useState(null)

  let friendlyErrorMessage = error
  if (!error && apiError) {
    const errStr = typeof apiError === 'string' ? apiError : (apiError.message || '')
    
    if (
      apiErrorCode === 'JOB_LIMIT_REACHED' ||
      errStr.includes('JOB_LIMIT_REACHED') ||
      errStr.includes('Another snapshot job') ||
      errStr.includes('A snapshot job is already running')
    ) {
      friendlyErrorMessage = 'A snapshot job is already running. Please wait until it finishes.'
    } else if (
      apiErrorCode === 'RATE_LIMITED' ||
      errStr.includes('RATE_LIMITED') ||
      errStr.includes('Too many requests') ||
      errStr.includes('Too many snapshot submissions') ||
      errStr.includes('Rate limit')
    ) {
      friendlyErrorMessage = 'Too many snapshot submissions. Please wait a moment and try again.'
    } else if (errStr.includes('429') || errStr.includes('request limit')) {
      friendlyErrorMessage = 'A snapshot job is already running or the request limit was reached. Please wait a moment before submitting again.'
    } else {
      friendlyErrorMessage = errStr
    }
  }

  useEffect(() => {
    if (!loading) {
      submitLockedRef.current = false
    }
  }, [loading])

  const handleSubmit = (mode = 'offline-package') => {
    if (loading || submitLockedRef.current) return
    setError('')

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError('Please enter a URL.')
      return
    }

    const validation = validateUrl(trimmedUrl)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    submitLockedRef.current = true
    setSelectedMode(mode)

    let autoScrollStepPx = 600
    let autoScrollDelayMs = 250
    if (scrollVelocity === 'slow') {
      autoScrollStepPx = 300
      autoScrollDelayMs = 400
    } else if (scrollVelocity === 'fast') {
      autoScrollStepPx = 1000
      autoScrollDelayMs = 100
    }

    onSubmit(trimmedUrl, { 
      scrollPage, 
      captureAssets, 
      crawlPages,
      aiRefine,
      mode, 
      autoScrollStepPx, 
      autoScrollDelayMs 
    })
  }

  return (
    <Card id="url-tool-card" className="max-w-3xl mx-auto w-full relative overflow-hidden" glass={true}>
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('offline-package'); }} className="space-y-4">
          
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
            
            {/* Two mode buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => handleSubmit('offline-package')}
                variant="primary"
                loading={loading && selectedMode === 'offline-package'}
                disabled={loading}
                className="flex-1 sm:flex-initial px-4 py-3 text-sm font-semibold shrink-0 h-[48px]"
                title="Download assets and rewrite HTML/CSS paths for offline viewing"
              >
                Generate Bundle ZIP
              </Button>
              
              <Button
                type="button"
                onClick={() => handleSubmit('single-html')}
                variant="outline"
                loading={loading && selectedMode === 'single-html'}
                disabled={loading}
                className="flex-1 sm:flex-initial px-4 py-3 text-sm font-semibold shrink-0 h-[48px]"
                title="Capture rendered DOM with remote asset URLs (no asset download)"
              >
                Generate HTML
              </Button>
            </div>
          </div>
          
          {/* Helper text explaining modes */}
          <div className="text-xs text-muted leading-relaxed space-y-1">
            <p><strong className="text-white">Bundle ZIP:</strong> Downloads assets, rewrites HTML/CSS paths → Fully offline-ready package</p>
            <p><strong className="text-white">Single HTML:</strong> Preserves remote asset URLs → Lightweight, better for animation-heavy sites</p>
          </div>

          {/* Validation or API Warning Alert */}
          {friendlyErrorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs mt-2 text-left">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{friendlyErrorMessage}</span>
            </div>
          )}

          {/* Active Job Alert */}
          {loading && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs mt-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>A snapshot job is already running. Please wait until it finishes.</span>
            </div>
          )}

          {/* Helper Guidelines Text */}
          <div className="flex items-start gap-2 text-xs text-muted leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-500/80 shrink-0 mt-0.5" />
            <p>
              Use only public or authorized pages. Login portals, captchas, paywalls, and anti-bot systems are not supported.
            </p>
          </div>

          {/* Accordion Settings Toggle */}
          <div className="pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors duration-200 outline-none focus-visible:ring-1 focus-visible:ring-primary/40 rounded px-1.5 py-1"
            >
              <Settings className="w-3.5 h-3.5" />
              Advanced Rebuilder Options
            </button>

            {showSettings && (
              <div className="space-y-4 pt-3 text-xs text-gray-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={scrollPage}
                      onChange={(e) => setScrollPage(e.target.checked)}
                      disabled={loading}
                      className="accent-primary rounded border-white/10"
                    />
                    <div>
                      <span className="font-semibold text-white block text-left">Auto-scroll viewport</span>
                      <span className="text-[10px] text-muted text-left block">Triggers lazy-loaded elements</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={captureAssets}
                      onChange={(e) => setCaptureAssets(e.target.checked)}
                      disabled={loading}
                      className="accent-primary rounded border-white/10"
                    />
                    <div>
                      <span className="font-semibold text-white block text-left">Capture assets</span>
                      <span className="text-[10px] text-muted text-left block">Collects CSS/JS/Images locally</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={crawlPages}
                      onChange={(e) => setCrawlPages(e.target.checked)}
                      disabled={loading}
                      className="accent-primary rounded border-white/10"
                    />
                    <div>
                      <span className="font-semibold text-white block text-left">Multi-page crawl</span>
                      <span className="text-[10px] text-muted text-left block">Crawls & links subpages offline</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aiRefine}
                      onChange={(e) => setAiRefine(e.target.checked)}
                      disabled={loading}
                      className="accent-primary rounded border-white/10"
                    />
                    <div>
                      <span className="font-semibold text-white block text-left">AI Layout Enhancer</span>
                      <span className="text-[10px] text-muted text-left block">Refines layout structure via AI</span>
                    </div>
                  </label>
                </div>

                {scrollPage && (
                  <div className="p-3 rounded-lg bg-black/20 border border-white/5 space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-white">Scroll Velocity</span>
                      <span className="text-[10px] text-muted font-mono">
                        {scrollVelocity === 'slow' && '300px/step, 400ms delay'}
                        {scrollVelocity === 'standard' && '600px/step, 250ms delay'}
                        {scrollVelocity === 'fast' && '1000px/step, 100ms delay'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 bg-[#090a0f] p-1 rounded-lg border border-white/5 w-fit">
                      {['slow', 'standard', 'fast'].map((vel) => (
                        <button
                          key={vel}
                          type="button"
                          disabled={loading}
                          onClick={() => setScrollVelocity(vel)}
                          className={`text-[10px] font-medium px-3 py-1.5 rounded-md capitalize transition-all select-none ${
                            scrollVelocity === vel
                              ? 'bg-[#2563eb] text-white shadow font-semibold'
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {vel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  )
}