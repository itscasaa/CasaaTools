import React, { useState } from 'react'
import { 
  Globe, AlertTriangle, ShieldCheck, Sparkles, Copy, Check, Terminal, 
  Layers, Cpu, Play, Search, ArrowRight, RotateCcw
} from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { promptGeneratorApi } from '../services/promptGeneratorApi'
import { validateUrl } from '../utils/urlValidator'

export default function PromptGeneratorPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setCopied(false)

    const trimmedUrl = url.trim()
    if (!trimmedUrl) {
      setError('Please enter a target URL first.')
      return
    }

    const validation = validateUrl(trimmedUrl)
    if (!validation.isValid) {
      setError(validation.error)
      return
    }

    setLoading(true)
    setStatusMessage('Launching headless browser to analyze page DOM...')
    
    try {
      // Step simulation for rich feedback
      setTimeout(() => {
        if (loading) setStatusMessage('Scraping headings structure and elements...')
      }, 3000)
      setTimeout(() => {
        if (loading) setStatusMessage('Detecting underlying framework tech stack...')
      }, 6000)
      setTimeout(() => {
        if (loading) setStatusMessage('Querying PromptGenerator model via 9router API...')
      }, 9000)

      const response = await promptGeneratorApi.generatePrompt(trimmedUrl)
      setResult(response)
    } catch (err) {
      setError(err.message || 'Failed to generate website recreation prompt.')
    } finally {
      setLoading(false)
      setStatusMessage('')
    }
  }

  const handleCopy = () => {
    if (!result?.prompt) return
    navigator.clipboard.writeText(result.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setUrl('')
    setResult(null)
    setError('')
    setCopied(false)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="text-center mb-8 select-none animate-fadeIn">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight flex items-center justify-center gap-2.5">
          <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          AI Prompt Rebuilder
        </h1>
        <p className="mt-3 text-sm text-[#A1A1AA] max-w-xl mx-auto">
          Input a website URL to automatically extract its headings, interactive elements, styling, and generate a comprehensive prompt compatible with Claude, v0.dev, or bolt.new.
        </p>
      </div>

      {/* Input / Control Card */}
      {!result && (
        <Card className="w-full relative overflow-hidden" glass={true}>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleGenerate} className="space-y-4">
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
                  className="px-6 py-3 text-sm font-semibold shrink-0 h-[48px] flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? 'Analyzing...' : 'Generate Prompt'}
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
      )}

      {/* Loading Progress State */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-[#0f111a]/40 space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-neutral-900" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-white">Pipeline Active</p>
            <p className="text-xs text-neutral-400 font-mono animate-pulse">{statusMessage || 'Analyzing target page...'}</p>
          </div>
        </div>
      )}

      {/* Results View */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main prompt container */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Generated Rebuild Prompt
              </span>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 border-white/10 hover:border-white/20 text-neutral-300 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>

            <div className="w-full bg-[#08090f] border border-white/5 rounded-xl p-5 shadow-2xl relative">
              <pre className="text-xs sm:text-sm text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed select-all max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {result.prompt}
              </pre>
            </div>
          </div>

          {/* Right sidebar info */}
          <div className="lg:col-span-4 space-y-6">
            <Card glass={true} className="border-white/5">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white border-b border-white/5 pb-2.5 flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" />
                  Target Web Analysis
                </h3>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Title</span>
                    <span className="text-xs text-neutral-200 font-medium leading-relaxed block">{result.meta?.title || 'No Title'}</span>
                  </div>

                  {result.meta?.description && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Description</span>
                      <span className="text-xs text-neutral-400 leading-relaxed block">{result.meta?.description}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Detected Stack</span>
                    {result.meta?.techStack && result.meta.techStack.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.meta.techStack.map((tech, i) => (
                          <Badge key={i} variant="secondary" className="bg-white/5 border border-white/10 text-neutral-300 text-[10px] py-0.5 px-2">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500 italic block">No technologies signature found.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-300 leading-relaxed space-y-2 select-none">
              <p className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                How to Rebuild:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-neutral-400">
                <li>Click <strong>Copy Prompt</strong> above.</li>
                <li>Open <a href="https://v0.dev" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">v0.dev</a>, <a href="https://bolt.new" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">bolt.new</a>, or Claude.</li>
                <li>Paste the prompt and hit generate.</li>
                <li>Refine as needed to perfect the aesthetics!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
