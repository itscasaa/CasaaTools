import React, { useRef, useState } from 'react'
import { 
  RotateCcw, AlertTriangle, ArrowLeft, Chrome, FileCode, Layers, 
  RefreshCw, Archive, Eye, Play, Sparkles, Plus, Minus, HelpCircle, Cpu, ArrowUpRight
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import HeroSection from '../components/landing/HeroSection'
import CloneForm from '../components/tool/CloneForm'
import ToolShell from '../components/tool/ToolShell'
import CloneProgress from '../components/tool/CloneProgress'
import ProcessTimeline from '../components/tool/ProcessTimeline'
import DownloadCard from '../components/result/DownloadCard'
import ResultPanel from '../components/result/ResultPanel'
import HowItWorks from '../components/landing/HowItWorks'
import ShowcaseSection from '../components/landing/ShowcaseSection'
import EthicalUseSection from '../components/landing/EthicalUseSection'
import { useCloneJob } from '../hooks/useCloneJob'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Card, CardContent } from '../components/ui/Card'

export default function HomePage() {
  const { job, loading, error, errorCode, startClone, reset } = useCloneJob()
  const formRef = useRef(null)

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null)
  
  // Toast error trigger state
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const stepMap = {
    'Queued': {
      title: 'Queued for Snapshot',
      description: 'Your URL has been accepted and is waiting for processing.'
    },
    'Starting snapshot': {
      title: 'Starting Snapshot',
      description: 'Preparing the browser capture pipeline.'
    },
    'Launching browser': {
      title: 'Launching Browser',
      description: 'Starting a safe headless Chromium session.'
    },
    'Opening page': {
      title: 'Opening Page',
      description: 'Navigating to the target URL and waiting for the page to load.'
    },
    'Cooldown delay': {
      title: 'Cooldown Delay',
      description: 'Waiting for website assets to render completely.'
    },
    'Triggering lazy-loaded content': {
      title: 'Triggering Lazy-Loaded Content',
      description: 'Scrolling viewport gradually to trigger lazy-loaded sections.'
    },
    'Capturing rendered DOM': {
      title: 'Capturing Rendered DOM',
      description: 'Saving the final browser-rendered HTML.'
    },
    'Capturing screenshot': {
      title: 'Capturing Screenshot',
      description: 'Creating the original full-page screenshot.'
    },
    'Discovering assets': {
      title: 'Discovering Assets',
      description: 'Scanning HTML and network resources.'
    },
    'Downloading assets': {
      title: 'Downloading Assets',
      description: 'Saving discovered CSS, JS, images, fonts, and media locally.'
    },
    'Rewriting HTML paths': {
      title: 'Rewriting HTML Paths',
      description: 'Pointing HTML references to downloaded local assets.'
    },
    'Rewriting CSS URLs': {
      title: 'Rewriting CSS URLs',
      description: 'Updating stylesheet URL references where local assets exist.'
    },
    'Detecting libraries': {
      title: 'Detecting Libraries',
      description: 'Analyzing runtime libraries and animation frameworks.'
    },
    'Running visual compare': {
      title: 'Running Visual Compare',
      description: 'Comparing the original screenshot with the local preview.'
    },
    'Writing metadata': {
      title: 'Writing Metadata',
      description: 'Saving final manifest, metrics, and snapshot details.'
    },
    'Completed': {
      title: 'Snapshot Ready',
      description: 'Your rebuilt preview and ZIP package are ready.'
    },
    'Failed': {
      title: 'Snapshot Failed',
      description: job?.error?.message || 'The page could not be opened or captured.'
    }
  }

  const currentStepDetails = job ? (stepMap[job.currentStep] || {
    title: job.currentStep || 'Processing Snapshot',
    description: 'Please stand by while Playwright crawls nodes, extracts media, and builds local references.'
  }) : null

  const handleFormSubmit = async (url, options) => {
    try {
      await startClone(url, options)
    } catch (e) {
      setToastMessage(e.message || 'Failed to submit URL.')
      setShowToast(true)
    }
  }

  const isRebuilding = !!job

  // Features list for the Benefits Section
  const features = [
    {
      title: 'Browser-Based Rendering',
      description: 'Open pages using a real browser engine for more accurate rendered output.',
      icon: <Chrome className="w-5 h-5 text-[#2563eb]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Final DOM Capture',
      description: 'Capture the page after JavaScript rendering, similar to what you see in DevTools.',
      icon: <FileCode className="w-5 h-5 text-[#3b82f6]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Asset Collection',
      description: 'Detect images, stylesheets, scripts, fonts, and media files used by the page.',
      icon: <Layers className="w-5 h-5 text-[#60a5fa]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'Local HTML Rebuild',
      description: 'Rewrite paths and rebuild the page into a portable local HTML snapshot.',
      icon: <RefreshCw className="w-5 h-5 text-[#2563eb]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'ZIP Export',
      description: 'Package the result into a clean downloadable archive.',
      icon: <Archive className="w-5 h-5 text-[#3b82f6]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'Preview Mode',
      description: 'Review the generated snapshot before exporting.',
      icon: <Eye className="w-5 h-5 text-[#2563eb]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Animation-Aware Capture',
      description: 'Designed to preserve JavaScript-based animations when assets and scripts are available.',
      icon: <Play className="w-5 h-5 text-[#60a5fa]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Visual Compare',
      description: 'Pixel-level screenshot comparison between the original live page and the rebuilt local preview. Generates a similarity score and diff overlay.',
      icon: <Sparkles className="w-5 h-5 text-[#2563eb]" />,
      colSpan: 'col-span-12'
    }
  ]

  // FAQs list
  const faqs = [
    {
      q: 'Does CasaaTools clone entire websites?',
      a: 'The MVP focuses on single public page snapshots. Multi-page crawling is planned for later phases with strict limits.'
    },
    {
      q: 'Will animations like GSAP work?',
      a: 'CasaaTools detects animation libraries (GSAP, Framer Motion, AOS, Three.js, Lottie, and more) and downloads all referenced scripts. Animations that depend only on local assets may work in the snapshot. Animations requiring external APIs, live data, or server state will not replay.'
    },
    {
      q: 'Can it bypass login or captcha?',
      a: 'No. CasaaTools is not designed to bypass login, captcha, paywalls, anti-bot protection, or private content.'
    },
    {
      q: 'What does the exported ZIP contain?',
      a: 'The ZIP includes index.html (with rewritten local asset paths), index.original.html (original captured DOM), screenshot.png, metadata.json, manifest.json, the downloaded assets folder, preview-screenshot.png, and visual-diff.png where available.'
    },
    {
      q: 'Is this for copying websites?',
      a: 'No. It is intended for authorized snapshots, inspection, debugging, archiving, and development use.'
    }
  ]

  const toggleFaq = (index) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-radial-grid flex flex-col">
      <Navbar />

      <main className="flex-grow pt-16">
        {!isRebuilding ? (
          /* Normal Landing View */
          <>
            <HeroSection />
            
            {/* Tool URL Input Section */}
            <div ref={formRef} className="max-w-5xl mx-auto px-6 py-10">
              <CloneForm onSubmit={handleFormSubmit} loading={loading} error={error} errorCode={errorCode} />
            </div>

            {/* Showcase Simulation Section */}
            <ShowcaseSection />

            {/* Think Less Features Grid Section */}
            <section id="features" className="py-20 md:py-28 border-t border-white/[0.06] relative">
              
              {/* Background glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] purple-glow-orb opacity-30 pointer-events-none" />

              <div className="max-w-5xl mx-auto px-6 relative z-10">
                
                <div className="text-center max-w-3xl mx-auto mb-20">
                  <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
                    Think Less About the Capture.<br />Focus on the Snapshot.
                  </h2>
                  <p className="mt-4 text-xs text-[#A1A1AA] leading-relaxed max-w-xl mx-auto">
                    CasaaTools handles browser rendering, DOM capture, asset mapping, and local export so developers can inspect and archive public pages faster.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {features.map((f, idx) => (
                    <Card key={idx} className={`col-span-12 ${f.colSpan}`} glass={true}>
                      <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full space-y-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shadow-lg">
                          {f.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#F8FAFC]">{f.title}</h3>
                          <p className="text-xs text-[#A1A1AA] mt-2 leading-relaxed">{f.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

              </div>
            </section>

            {/* How It Works timelines */}
            <HowItWorks />

            {/* Ethical Boundaries section */}
            <EthicalUseSection />

            {/* Accordion FAQ Section */}
            <section id="faq" className="py-20 md:py-28 border-t border-white/[0.06] bg-black/10">
              <div className="max-w-4xl mx-auto px-6">
                
                <div className="text-center max-w-2xl mx-auto mb-16">
                  <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC]">
                    Frequently Asked Questions
                  </h2>
                  <p className="mt-4 text-xs text-[#A1A1AA]">
                    Answers to common questions about snapshotting and limits.
                  </p>
                </div>

                <div className="space-y-4">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx
                    return (
                      <div
                        key={idx}
                        className="glass-card rounded-2xl overflow-hidden transition-all duration-300 border border-white/[0.08] hover:border-white/[0.15]"
                      >
                        <button
                          onClick={() => toggleFaq(idx)}
                          className="w-full px-6 py-5 flex items-center justify-between text-left text-xs font-bold text-[#F8FAFC] hover:text-white outline-none focus-visible:text-[#2563eb] transition-colors duration-200"
                        >
                          <span>{faq.q}</span>
                          <span className="shrink-0 ml-4 p-1 rounded-lg bg-white/5 border border-white/5 text-[#71717A]">
                            {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-6 pt-1 text-xs text-[#A1A1AA] leading-relaxed border-t border-white/[0.04] bg-black/10 animate-slide-in">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-20 md:py-28 border-t border-white/[0.06] bg-dots relative">
              <div className="max-w-4xl mx-auto px-6 relative z-10">
                
                {/* Glowing orb background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] purple-glow-orb opacity-40 pointer-events-none" />

                <Card className="relative overflow-hidden border border-white/[0.08] bg-gradient-to-br from-[#080816]/90 to-[#0B0B18]/90 py-12 md:py-16 px-8 md:px-12 text-center" glass={false}>
                  <div className="absolute inset-0 bg-dots opacity-40 pointer-events-none" />
                  <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Ready to Build Your First Snapshot?
                    </h2>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      Start with a public or authorized page and generate a clean local HTML package.
                    </p>
                    <div className="pt-4 flex justify-center">
                      <Button
                        onClick={() => {
                          const formEl = document.getElementById('url-tool-card')
                          formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                        variant="primary"
                        size="lg"
                        className="rounded-lg font-bold px-8 shadow-2xl shadow-[#2563eb]/10"
                      >
                        Launch CasaaTools
                        <ArrowUpRight className="ml-2 w-4.5 h-4.5" />
                      </Button>
                    </div>
                  </div>
                </Card>

              </div>
            </section>
          </>
        ) : (
          /* Active Rebuilder Workspace View */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
            
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="flex items-center gap-1.5 text-[#A1A1AA] hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Landing
              </Button>
              
              <span className="text-xs font-mono bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg text-[#A1A1AA]">
                Job ID: <span className="text-[#2563eb] font-bold">{job.jobId}</span>
              </span>
            </div>

            <ToolShell
              title={job.status === 'completed' ? 'Snapshot Completed Successfully' : 'Rebuilder Pipeline Active'}
              description={`Processing target URL: ${job.url}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Progress timeline column */}
                <div className="lg:col-span-4 space-y-6">
                  <CloneProgress progress={job.progress} currentStep={job.currentStep} />
                  <ProcessTimeline logs={job.logs} currentStep={job.currentStep} />
                  
                  {job.status === 'completed' && (
                    <Button
                      variant="outline"
                      size="md"
                      onClick={reset}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Rebuild Another URL
                    </Button>
                  )}
                </div>

                {/* Right Result contents panel */}
                <div className="lg:col-span-8 space-y-6">
                  {job.status === 'completed' || job.status === 'failed' ? (
                    <>
                      {job.status === 'completed' && <DownloadCard job={job} />}
                      <ResultPanel job={job} onRetry={() => startClone(job.url)} isAnyJobRunning={loading} />
                    </>
                  ) : (
                    <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/[0.08] rounded-3xl bg-black/20 space-y-6">
                      {/* Animated circular progress or large spinner */}
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-4 border-white/[0.03]" />
                        <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500 animate-spin" />
                        <span className="text-xl font-bold font-mono text-white">{job.progress || 0}%</span>
                      </div>
                      
                      <div className="space-y-2 max-w-md">
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {currentStepDetails.title}
                        </h3>
                        <p className="text-xs text-[#A1A1AA] leading-relaxed">
                          {currentStepDetails.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/[0.04] w-full max-w-sm">
                        <p className="text-[10px] text-gray-500 leading-normal">
                          CasaaTools is processing this snapshot in the background. Results will appear automatically when the job completes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </ToolShell>

          </div>
        )}
      </main>

      <Footer />

      {/* Client-side toast updates */}
      <Toast
        message={toastMessage || error}
        type="error"
        show={showToast || (!!error && 
          errorCode !== 'JOB_LIMIT_REACHED' &&
          errorCode !== 'RATE_LIMITED' &&
          !error.includes('Too many requests') && 
          !error.includes('Too many snapshot submissions') && 
          !error.includes('Another snapshot job') && 
          !error.includes('A snapshot job is already running') && 
          !error.includes('JOB_LIMIT_REACHED') && 
          !error.includes('RATE_LIMITED') && 
          !error.includes('request limit')
        )}
        onClose={() => setShowToast(false)}
      />
    </div>
  )
}