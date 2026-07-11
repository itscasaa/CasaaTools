import React from 'react'
import { ArrowRight, Cpu, Layers, Play, Eye, FileCode, CheckCircle2, ChevronRight, FileArchive } from 'lucide-react'
import { Button } from '../ui/Button'
import FeatureBadge from './FeatureBadge'

export default function HeroSection() {
  const badges = [
    'Rendered DOM',
    'Local Assets',
    'HTML Export',
    'ZIP Package',
    'Preview Mode'
  ]

  const handleCTAStart = () => {
    const inputEl = document.getElementById('url-tool-card')
    inputEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleCTAFlow = () => {
    const timelineEl = document.getElementById('workflow')
    timelineEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24 bg-dots">
      
      {/* Cinematic concentric rings behind the title */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full border border-white/[0.02] flex items-center justify-center pointer-events-none z-0">
        <div className="w-[650px] h-[650px] rounded-full border border-white/[0.03] flex items-center justify-center">
          <div className="w-[450px] h-[450px] rounded-full border border-white/[0.04] flex items-center justify-center">
            <div className="w-[250px] h-[250px] rounded-full border border-white/[0.05]" />
          </div>
        </div>
      </div>

      {/* Background glowing orbs */}
      <div className="absolute top-[20%] left-1/3 w-[500px] h-[500px] purple-glow-orb opacity-60 z-0" />
      <div className="absolute top-[25%] right-1/3 w-[450px] h-[450px] blue-glow-orb opacity-55 z-0" />

      <div className="max-w-5xl mx-auto text-center px-6 relative z-10 space-y-8">
        
        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6.5xl font-bold tracking-tight text-[#F8FAFC] leading-[1.12] max-w-4xl mx-auto font-sans">
          Rebuild Web Pages Into<br />
          <span className="bg-gradient-to-r from-[#6D5DFB] via-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
            Static HTML Snapshots
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-[#A1A1AA] max-w-2xl mx-auto leading-relaxed">
          Paste a public or authorized URL, render it like a real browser, capture the final DOM and assets, then export a clean local HTML package.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCTAStart}
            className="w-full sm:w-auto rounded-full font-semibold px-8 shadow-2xl shadow-[#6D5DFB]/20"
          >
            Generate Snapshot
            <ArrowRight className="ml-2 w-4.5 h-4.5" />
          </Button>
          
          <Button
            variant="secondary"
            size="lg"
            onClick={handleCTAFlow}
            className="w-full sm:w-auto rounded-full font-semibold px-8"
          >
            <Play className="mr-2.5 w-4 h-4 fill-white/10 text-gray-300" />
            View Workflow
          </Button>
        </div>

        {/* Badge Pills */}
        <div className="flex flex-wrap gap-2.5 justify-center max-w-2xl mx-auto pt-4">
          {badges.map((badge) => (
            <FeatureBadge key={badge}>{badge}</FeatureBadge>
          ))}
        </div>

        {/* Mock browser/dashboard panel below the hero */}
        <div className="pt-16 max-w-4xl mx-auto relative z-10 animate-fade-in">
          
          {/* Main Mock Dashboard Container */}
          <div className="glass-card rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/80 flex flex-col h-[400px] text-left dashboard-mask">
            
            {/* Window bar */}
            <div className="bg-black/40 px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/30" />
                <span className="w-3 h-3 rounded-full bg-amber-500/30" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/30" />
              </div>
              <span className="text-[10px] font-mono text-[#71717A] bg-black/40 border border-white/5 px-4 py-1.5 rounded-full select-none">
                dashboard.casaatools.com/workspace
              </span>
              <span className="w-6" />
            </div>

            {/* Content area */}
            <div className="flex-grow flex overflow-hidden">
              
              {/* Left sidebar */}
              <div className="hidden md:flex w-48 bg-black/20 border-r border-white/[0.06] p-4 flex-col gap-2 shrink-0 select-none">
                <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest pl-2 mb-2 block">Workspace</span>
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#F8FAFC] bg-white/5 border border-white/5"><Cpu className="w-3.5 h-3.5 text-[#6D5DFB]" />Overview</span>
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"><Layers className="w-3.5 h-3.5" />DOM Capture</span>
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"><FileCode className="w-3.5 h-3.5" />Assets</span>
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"><Eye className="w-3.5 h-3.5" />Preview</span>
                <span className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"><FileArchive className="w-3.5 h-3.5" />Export</span>
              </div>

              {/* Main dashboard view */}
              <div className="flex-grow p-6 flex flex-col gap-6 overflow-y-auto bg-black/10 select-none">
                
                {/* Status Bar */}
                <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.04] p-4 rounded-2xl">
                  <div>
                    <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-widest">Snapshot Status</span>
                    <span className="text-xs font-bold text-[#F8FAFC] block mt-0.5">Simulated Thread Idle</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-[#6D5DFB]/10 border border-[#6D5DFB]/20 text-[#6D5DFB]">
                    <span className="w-1.5 h-1.5 bg-[#6D5DFB] rounded-full animate-ping" />
                    Sandbox Active
                  </span>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Resources', val: '87' },
                    { label: 'Scripts', val: '12' },
                    { label: 'Stylesheets', val: '9' },
                    { label: 'Fonts', val: '4' }
                  ].map((m) => (
                    <div key={m.label} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider">{m.label}</span>
                      <span className="text-lg font-bold text-white block mt-0.5">{m.val}</span>
                    </div>
                  ))}
                </div>

                {/* Simulated timeline mini lists */}
                <div className="space-y-2">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold tracking-wider block">Pipeline Log</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <span className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Validating URL</span>
                    <span className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Launching Browser</span>
                    <span className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Rendering Page</span>
                    <span className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[#71717A]"><ChevronRight className="w-3.5 h-3.5" />Capturing DOM</span>
                  </div>
                </div>

              </div>

              {/* Right outputs panel */}
              <div className="hidden lg:flex w-52 bg-black/20 border-l border-white/[0.06] p-4 flex-col gap-3 shrink-0 select-none">
                <span className="text-[9px] font-bold text-[#71717A] uppercase tracking-widest pl-1">Rebuilt Outputs</span>
                <div className="flex flex-col gap-1.5 text-[11px] font-mono">
                  <span className="px-2.5 py-1.5 rounded-lg text-white bg-white/5 border border-white/5 block">index.html</span>
                  <span className="px-2.5 py-1.5 rounded-lg text-[#A1A1AA] hover:bg-white/5 block">assets/images/</span>
                  <span className="px-2.5 py-1.5 rounded-lg text-[#A1A1AA] hover:bg-white/5 block">assets/css/</span>
                  <span className="px-2.5 py-1.5 rounded-lg text-[#A1A1AA] hover:bg-white/5 block">assets/js/</span>
                  <span className="px-2.5 py-1.5 rounded-lg text-[#A1A1AA] hover:bg-white/5 block">metadata.json</span>
                </div>
              </div>

            </div>

          </div>

          {/* Fade mask glow overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#05050A] to-transparent pointer-events-none z-20" />

        </div>

      </div>
    </section>
  )
}