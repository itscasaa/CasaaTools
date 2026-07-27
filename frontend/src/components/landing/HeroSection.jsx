import React, { useState } from 'react'
import { ArrowRight, Cpu, Layers, Play, Eye, FileCode, CheckCircle2, ChevronRight, FileArchive, Globe, ArrowRightLeft, Star, Shield, Terminal, Archive } from 'lucide-react'
import { Button } from '../ui/Button'
import { Code, CodeHeader, CodeBlock } from '../ui/CodeTerminal'

export default function HeroSection() {
  const [restartTrigger, setRestartTrigger] = useState(0)
  
  const codeSnippet = `$ casaa-rebuilder https://example.com/page --output snapshot.zip

[08:43:01] INFO  SSRF security check passed.
[08:43:02] INFO  Initializing headless browser instance...
[08:43:03] INFO  Navigating and rendering DOM structure...
[08:43:04] INFO  Extracting DOM node tree (284 tags found).
[08:43:05] INFO  Downloading stylesheets & script files:
           → main.css (24.1KB) .................. OK
           → vendor.js (104.2KB) ................ OK
[08:43:07] INFO  Rewriting local relative asset links.
[08:43:08] INFO  Creating standalone ZIP package...
[08:43:09] SUCCESS Rebuilt completed! snapshot.zip generated.`

  const handleCTAStart = () => {
    const inputEl = document.getElementById('url-tool-card')
    inputEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleCTAFlow = () => {
    const timelineEl = document.getElementById('workflow')
    timelineEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative overflow-hidden min-h-[100dvh] flex flex-col justify-between pt-24 pb-8 border-b border-white/5 bg-[#000000] z-10">
      
      {/* Neon purple curved glow arc behind content */}
      <div className="hero-arc-glow" />
      <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none z-0" />
      
      <div className="max-w-6xl mx-auto px-6 w-full relative z-10 flex-grow flex flex-col justify-between pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
          
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#6D5DFB]/10 border border-[#6D5DFB]/20">
              <span className="w-1 h-1 rounded-full bg-[#6D5DFB] animate-pulse" />
              <span className="text-[10px] font-semibold text-purple-300 tracking-wider uppercase font-mono">v0.1.0 Beta</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-5.5xl font-bold tracking-tight text-white leading-[1.1] font-sans">
              Rebuild Web Pages Into<br />
              <span className="text-[#6D5DFB]">Static HTML.</span>
            </h1>

            <p className="text-sm md:text-base text-neutral-400 max-w-[50ch] leading-relaxed font-sans">
              Enter any URL to capture its fully-rendered DOM, download all styles and assets locally, and export a standalone ZIP package.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleCTAStart}
                className="w-full sm:w-auto rounded-xl font-semibold px-6 bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] shadow-xl shadow-[#6D5DFB]/15 text-white flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>Mulai Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleCTAFlow}
                className="w-full sm:w-auto rounded-xl font-semibold px-6 border border-white/5 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] text-[#F8FAFC] flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-current text-neutral-400" />
                <span>Cara Kerja</span>
              </Button>
            </div>

          </div>

          {/* Right Column: Sleek Interactive code visualization - Anti-slop */}
          <div className="lg:col-span-6 w-full relative">
            <Code 
              className="w-full h-[340px] border-white/5 shadow-2xl shadow-black/80"
              code={codeSnippet}
            >
              <CodeHeader 
                icon={FileCode} 
                copyButton={true}
                onRestart={() => setRestartTrigger(prev => prev + 1)}
              >
                rebuild-pipeline.sh
              </CodeHeader>
              <CodeBlock 
                writing={true}
                duration={4500}
                delay={500}
                cursor={true}
                restartTrigger={restartTrigger}
              />
            </Code>
          </div>

        </div>

        {/* Trust Badges Strip - Centered below split columns */}
        <div className="mt-8 pt-6 pb-2 border-t border-white/5 w-full z-10">
          <div className="bg-[#0f111a]/40 backdrop-blur-xl border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="flex text-amber-400">
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white font-sans leading-none">Precision 5.0</div>
                <div className="text-[10px] text-neutral-500 font-medium font-sans mt-1">DOM rebuild score</div>
              </div>
            </div>
            
            <div className="hidden md:block h-6 w-px bg-white/10" />
            
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6D5DFB]" />
              <span className="text-[11px] font-semibold text-neutral-300 font-sans">100% Safe Local Sandbox</span>
            </div>
            
            <div className="hidden md:block h-6 w-px bg-white/10" />
            
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-[11px] font-semibold text-neutral-300 font-sans">Active Scan Logger</span>
            </div>
            
            <div className="hidden md:block h-6 w-px bg-white/10" />
            
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-semibold text-neutral-300 font-sans">ZIP Compilation Package</span>
            </div>
          </div>
        </div>

      </div>

    </section>
  )
}