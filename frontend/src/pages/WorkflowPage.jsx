import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { CheckCircle2, Search, Cpu, Play, Download, RefreshCw, Archive, Sparkles, Terminal } from 'lucide-react'

export default function WorkflowPage() {
  const steps = [
    {
      num: '01',
      title: 'Intake & Request Validation',
      icon: <Search className="w-5 h-5 text-[#6D5DFB]" />,
      desc: 'When a user submits a target URL, the system performs strict CORS check and structure parsing. It sanitizes the URL, checks limits (e.g. max requests quota), registers the execution job under a unique Job ID in the database, and schedules the task inside our background queue.',
      details: [
        'URL format validation & protocol checks',
        'User quota limit enforcement checks',
        'Database job state initialization',
        'Concurrency-controlled job queue allocation'
      ]
    },
    {
      num: '02',
      title: 'Headless Browser Launch',
      icon: <Cpu className="w-5 h-5 text-[#8B5CF6]" />,
      desc: 'The backend engine spawns an isolated Chromium instance inside a secure sandbox container using Microsoft Playwright. Custom headers, viewport sizes, and request block filters (e.g. to skip unnecessary analytics code) are configured on-the-fly.',
      details: [
        'Isolated browser context creation',
        'Ad/tracker blocking layer registration',
        'Dynamic desktop/mobile viewport emulation',
        'Custom User-Agent configurations'
      ]
    },
    {
      num: '03',
      title: 'Navigation & Dynamic JS Execution',
      icon: <Play className="w-5 h-5 text-[#a78bfa]" />,
      desc: 'Chromium navigates to the target page and waits until all client-side JavaScript finishes executing. The engine triggers full-height viewport scrolling actions to wake up lazy-loaded images, dynamic sliders, and web components, waiting for network connections to go idle.',
      details: [
        'Playwright waitUntil: networkidle lifecycle hook',
        'Simulated scroll actions to force image/iframe source loads',
        'Execution of custom JS hooks for scroll-animations',
        'Dynamic height adjustment script run'
      ]
    },
    {
      num: '04',
      title: 'Dependency Graph Mapping',
      icon: <Terminal className="w-5 h-5 text-[#6D5DFB]" />,
      desc: 'While the browser runs, the engine sniffs all outgoing requests to record stylesheets, scripts, background images, and fonts. It parses stylesheets to find nested `@import` nodes and extracts font URLs, establishing a complete dependency mapping tree.',
      details: [
        'Network interception and response logging',
        'CSS syntax tree parsing for nested resource urls',
        'Inline style scanner and asset link compiler',
        'Mime-type validation for each asset log'
      ]
    },
    {
      num: '05',
      title: 'Asynchronous Resource Harvesting',
      icon: <Download className="w-5 h-5 text-[#8B5CF6]" />,
      desc: 'The engine downloads every tracked asset in parallel. It maps duplicate URLs to single files to save space, downloads font binaries (WOFF, WOFF2), and converts relative asset references to absolute hashes. If a resource fails, the rebuilder assigns a local stub file.',
      details: [
        'Parallel asset downloader with rate-limiting protection',
        'Duplicate checksum matching for shared assets (like frameworks)',
        'Local saving of raw assets, scripts, stylesheets, and fonts',
        'Error boundary stub generators for broken paths'
      ]
    },
    {
      num: '06',
      title: 'HTML & CSS Path Rewriting',
      icon: <RefreshCw className="w-5 h-5 text-[#a78bfa]" />,
      desc: 'Once the DOM and assets are saved, the rebuilder processes the HTML. It replaces all absolute references pointing to CDNs or external servers with local relative paths (e.g. `/assets/logo.png`). It applies the same rewriting to stylesheet url() definitions.',
      details: [
        'Dynamic regex HTML source tag replacements',
        'Nesting-depth directory index relative solver',
        'CSS file path mapping and rewrite resolver',
        'Tracking scripts/metrics cleanup tags'
      ]
    },
    {
      num: '07',
      title: 'ZIP Export & Visual Verification',
      icon: <Archive className="w-5 h-5 text-[#6D5DFB]" />,
      desc: 'Finally, the engine packages the rewritten html, stylesheet directories, script assets, and metadata reports into a zip archive. Before saving, it compares the original screenshot with the rebuilt preview using a pixel-diff check to confirm snapshot accuracy.',
      details: [
        'Zip file structure compilation and metadata.json export',
        'Pixel-diff visual regression check run',
        'Similarity matching score output',
        'Downloadable assets availability updates'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Background neon elements */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-gradient-to-br from-[#6D5DFB]/10 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-12 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#8B5CF6]/5 to-transparent rounded-full blur-[90px] pointer-events-none z-0" />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Header Title Section */}
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
              <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-pulse" />
              <span className="text-[10px] font-bold text-purple-300 tracking-wider uppercase font-mono">Pipeline Walkthrough</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl font-sans">
              The Rebuild Pipeline<br />
              <span className="text-[#8B5CF6]">Step by Step.</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Understand the pipeline sequence CasaaTools executes behind the scenes for every page snapshot.
            </p>
          </div>

          {/* Timeline Steps */}
          <div className="relative border-l border-white/5 ml-4 md:ml-6 pl-8 md:pl-10 space-y-16">
            
            {steps.map((step, idx) => (
              <div key={idx} className="relative group">
                
                {/* Timeline dot */}
                <div className="absolute -left-[53px] md:-left-[61px] top-0 w-11 h-11 rounded-xl bg-black border border-white/10 flex items-center justify-center text-white shadow-lg group-hover:border-[#6D5DFB]/30 group-hover:shadow-[0_0_15px_rgba(109,93,251,0.15)] transition-all duration-300 z-10">
                  {step.icon}
                </div>

                {/* Step Content */}
                <div className="bg-[#0f111a]/30 border border-white/5 rounded-2xl p-6 md:p-8 hover:border-[#6D5DFB]/20 transition-all duration-300 space-y-6">
                  
                  {/* Title & Number */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#6D5DFB] uppercase">STEP {step.num}</span>
                      <h2 className="text-lg font-bold text-white mt-1 font-sans">{step.title}</h2>
                    </div>
                    <span className="text-3xl font-bold font-mono text-neutral-800 tracking-tight leading-none group-hover:text-[#6D5DFB]/20 transition-colors">
                      {step.num}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {step.desc}
                  </p>

                  {/* Tasks inside this step */}
                  <div className="border-t border-white/5 pt-5 space-y-3">
                    <h3 className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Subtasks executed</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {step.details.map((detail, dIdx) => (
                        <div key={dIdx} className="flex items-center gap-2 text-[11px] text-neutral-400">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            ))}

          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
