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
    onSubmit(trimmedUrl, { scrollPage, captureAssets, mode })
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
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors duration-200 outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/40 rounded px-1.5 py-1"
            >
              <Settings className="w-3.5 h-3.5" />
              Advanced Rebuilder Options
            </button>

            {showSettings && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs text-gray-300">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={scrollPage}
                    onChange={(e) => setScrollPage(e.target.checked)}
                    disabled={loading}
                    className="accent-[#6D5DFB] rounded border-border"
                  />
                  <div>
                    <span className="font-semibold text-white block">Auto-scroll viewport</span>
                    <span className="text-[10px] text-muted">Triggers lazy-loaded images & elements</span>
                  </div>
                </label>
                
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-black/20 hover:bg-black/30 border border-border/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={captureAssets}
                    onChange={(e) => setCaptureAssets(e.target.checked)}
                    disabled={loading}
                    className="accent-[#6D5DFB] rounded border-border"
                  />
                  <div>
                    <span className="font-semibold text-white block">Capture asset references</span>
                    <span className="text-[10px] text-muted">Collects CSS/JS/Images locally</span>
                  </div>
                </label>
              </div>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  )
}