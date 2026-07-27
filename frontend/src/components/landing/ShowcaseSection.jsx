import React, { useState, useEffect } from 'react'
import { Check, Terminal, Play, RotateCcw, FolderOpen, FileCode, ImageIcon, Cpu, Download, Globe } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Progress } from '../ui/Progress'

const DEMO_STEPS = [
  { id: 'validating', label: 'Validating URL', duration: 800 },
  { id: 'browser', label: 'Launching browser', duration: 1000 },
  { id: 'rendering', label: 'Waiting for render', duration: 1200 },
  { id: 'dom', label: 'Capturing DOM', duration: 900 },
  { id: 'assets', label: 'Detecting assets', duration: 1500 },
  { id: 'rewriting', label: 'Rewriting paths', duration: 1000 },
  { id: 'zip', label: 'Building ZIP', duration: 800 },
  { id: 'ready', label: 'Snapshot ready', duration: 500 }
]

const MOCK_FILES = [
  { name: 'index.html', size: '48.2 KB', type: 'code' },
  { name: 'assets/css/main.css', size: '12.4 KB', type: 'code' },
  { name: 'assets/js/app.js', size: '78.5 KB', type: 'code' },
  { name: 'assets/images/hero.jpg', size: '342.1 KB', type: 'image' },
  { name: 'metadata.json', size: '1.2 KB', type: 'code' }
]

export default function ShowcaseSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(-1)
  const [completedSteps, setCompletedSteps] = useState({})
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!isPlaying) return

    let current = 0
    setCurrentStepIndex(0)
    setCompletedSteps({})
    setProgress(0)

    const runStep = () => {
      if (current >= DEMO_STEPS.length) {
        setIsPlaying(false)
        setProgress(100)
        return
      }

      const step = DEMO_STEPS[current]
      const stepProgress = Math.round(((current + 1) / DEMO_STEPS.length) * 100)
      
      const timer = setTimeout(() => {
        setCompletedSteps(prev => ({ ...prev, [step.id]: true }))
        current++
        setCurrentStepIndex(current)
        setProgress(stepProgress)
        runStep()
      }, step.duration)

      return () => clearTimeout(timer)
    }

    const cleanup = runStep()
    return () => {
      if (cleanup) cleanup()
    }
  }, [isPlaying])

  const startDemo = () => {
    setIsPlaying(true)
  }

  const resetDemo = () => {
    setIsPlaying(false)
    setCurrentStepIndex(-1)
    setCompletedSteps({})
    setProgress(0)
  }

  const isDemoFinished = currentStepIndex === DEMO_STEPS.length

  return (
    <section id="showcase" className="py-20 md:py-28 border-t border-white/[0.06] relative">
      
      {/* Background glowing rings */}
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] purple-glow-orb opacity-40 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
            A Tool Interface Built for Fast Website Snapshots
          </h2>
          <p className="mt-4 text-xs text-[#A1A1AA] leading-relaxed">
            Witness the capture engine rebuild layouts and bundle dependencies in real-time.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            {!isPlaying && !isDemoFinished && (
              <Button onClick={startDemo} className="shadow-xl shadow-[#6D5DFB]/15 bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED] rounded-xl px-6 py-2.5 text-xs font-semibold uppercase tracking-wider">
                <Play className="w-4 h-4 mr-2 fill-current" />
                Run Simulation Demo
              </Button>
            )}
            {(isPlaying || isDemoFinished) && (
              <Button onClick={resetDemo} variant="secondary" className="rounded-xl border border-white/5 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Sandbox
              </Button>
            )}
          </div>
        </div>

        {/* Demo Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
          
          {/* Left panel - process timeline logs */}
          <div className="lg:col-span-5 flex flex-col">
            <Card className="flex-1 flex flex-col h-full" glass={true}>
              <CardHeader className="flex items-center justify-between pb-2 border-b border-white/[0.04] bg-black/10">
                <div>
                  <CardTitle className="text-xs flex items-center gap-2 uppercase tracking-wider text-[#A1A1AA]">
                    <Terminal className="w-4 h-4 text-[#6D5DFB]" />
                    Process Timeline Log
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-6">
                
                {/* Step List */}
                <div className="space-y-2">
                  {DEMO_STEPS.map((step, idx) => {
                    const isCompleted = completedSteps[step.id]
                    const isActive = idx === currentStepIndex
                    const isPending = idx > currentStepIndex

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                          isActive
                            ? 'bg-[#6D5DFB]/5 border-[#6D5DFB]/25 text-white shadow-[0_0_15px_-3px_rgba(109,93,251,0.2)]'
                            : isCompleted
                            ? 'bg-[#8B5CF6]/5 border-[#8B5CF6]/10 text-[#8B5CF6]'
                            : 'bg-transparent border-transparent text-[#71717A]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border text-[9px] font-mono font-bold ${
                              isActive
                                ? 'bg-[#6D5DFB] text-white border-[#6D5DFB] animate-pulse'
                                : isCompleted
                                ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                                : 'bg-transparent border-white/[0.08]'
                            }`}
                          >
                            {isCompleted ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                          </div>
                          <span className="text-[11px] font-semibold">{step.label}</span>
                        </div>
                        
                        <div className="text-[9px] font-mono">
                          {isActive && <span className="text-[#6D5DFB] font-bold animate-pulse uppercase tracking-wider">active</span>}
                          {isCompleted && <span className="text-[#8B5CF6] font-bold uppercase tracking-wider">done</span>}
                          {isPending && <span className="text-[#71717A]">pending</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar container */}
                <div className="pt-4 border-t border-white/[0.04]">
                  <Progress value={progress} showLabel={true} />
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Right panel - preview viewports */}
          <div className="lg:col-span-7 flex flex-col">
            <Card className="flex-1 flex flex-col h-full overflow-hidden" glass={true}>
              <CardHeader className="p-3 border-b border-white/[0.06] bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-1.5 pl-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30" />
                </div>
                <div className="text-[10px] font-mono bg-black/50 border border-white/[0.05] px-4 py-1 rounded-full text-[#A1A1AA] w-2/3 text-center truncate flex items-center justify-center gap-1.5 select-none">
                  <Globe className="w-3 h-3 text-[#71717A]" />
                  {isPlaying ? 'compiling-local-index.html' : isDemoFinished ? 'http://localhost:3000/preview/pm-job-demo' : 'https://demo-site.com'}
                </div>
                <div className="w-4" />
              </CardHeader>
              
              <CardContent className="p-0 flex-1 relative bg-[#04040A] flex flex-col justify-center items-center min-h-[320px]">
                
                {/* Overlay Loader / Static State */}
                {(!isPlaying && !isDemoFinished) && (
                  <div className="text-center p-8 max-w-sm space-y-4">
                    <Cpu className="w-8 h-8 text-[#71717A] mx-auto" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#F8FAFC]">Browser Capture Panel</h4>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Start the simulation demo to watch the layout engine discover and process dependencies.
                    </p>
                  </div>
                )}

                {isPlaying && !completedSteps.dom && (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-8 h-8 border-2 border-[#6D5DFB] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-[#6D5DFB] font-bold uppercase tracking-widest animate-pulse">
                      Initializing browser context...
                    </p>
                  </div>
                )}

                {isPlaying && completedSteps.dom && !completedSteps.zip && (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-[#8B5CF6] font-bold uppercase tracking-widest animate-pulse">
                      Downloading styles, images, and fonts...
                    </p>
                  </div>
                )}

                {/* Final Render Output Mock */}
                {isDemoFinished && (
                  <div className="w-full h-full bg-[#05050A] flex flex-col animate-fade-in p-6 relative">
                    <div className="flex items-center justify-between pb-4 border-b border-white/[0.04] mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#6D5DFB]/20 text-[#6D5DFB] rounded flex items-center justify-center font-bold text-xs font-sans">W</div>
                        <span className="text-xs font-bold text-white">Wikipedia Page Layout</span>
                      </div>
                      <span className="text-[9px] text-[#8B5CF6] font-mono bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-2 py-0.5 rounded-full select-none uppercase tracking-wider font-bold">
                        Local Snapshot
                      </span>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center text-center space-y-4 max-w-md mx-auto">
                      <h3 className="text-xl font-bold text-[#F8FAFC] tracking-tight">Wikipedia, the free encyclopedia</h3>
                      <p className="text-xs text-[#A1A1AA] leading-relaxed">
                        This sandbox renders a local self-contained HTML page snapshot with all links mapping back to offline asset folders.
                      </p>
                      
                      {/* Mock output file list */}
                      <div className="p-3 bg-black/40 border border-white/[0.04] rounded-xl text-[10px] font-mono text-left space-y-1 select-none">
                        <div className="text-[#71717A] uppercase font-bold text-[8px] tracking-wider mb-1.5">Package Files:</div>
                        <div className="text-white flex justify-between"><span>index.html</span><span className="text-[#71717A]">48.2 KB</span></div>
                        <div className="text-[#A1A1AA] flex justify-between"><span>assets/css/main.css</span><span className="text-[#71717A]">12.4 KB</span></div>
                        <div className="text-[#A1A1AA] flex justify-between"><span>assets/js/app.js</span><span className="text-[#71717A]">78.5 KB</span></div>
                      </div>

                      {/* Download Zip Card */}
                      <div className="pt-2">
                        <Button variant="primary" size="sm" className="rounded-xl w-full text-xs font-semibold py-3 shadow-lg shadow-[#6D5DFB]/10">
                          <Download className="w-4 h-4 mr-2" />
                          Download HTML Snapshot (ZIP)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </section>
  )
}