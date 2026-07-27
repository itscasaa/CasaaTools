import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Chrome, FileCode, Layers, RefreshCw, Archive, Eye, Play, Sparkles, Plus, Minus, ArrowUpRight 
} from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import HeroSection from '../components/landing/HeroSection'
import HowItWorks from '../components/landing/HowItWorks'
import ShowcaseSection from '../components/landing/ShowcaseSection'
import EthicalUseSection from '../components/landing/EthicalUseSection'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const handleStartClick = () => {
    if (user) {
      navigate('/dashboard')
    } else {
      navigate('/login')
    }
  }

  // Features list for the Benefits Section
  const features = [
    {
      title: 'Browser-Based Rendering',
      description: 'Open pages using a real browser engine for more accurate rendered output.',
      icon: <Chrome className="w-5 h-5 text-[#6D5DFB]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Final DOM Capture',
      description: 'Capture the page after JavaScript rendering, similar to what you see in DevTools.',
      icon: <FileCode className="w-5 h-5 text-[#8B5CF6]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Asset Collection',
      description: 'Detect images, stylesheets, scripts, fonts, and media files used by the page.',
      icon: <Layers className="w-5 h-5 text-[#a78bfa]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'Local HTML Rebuild',
      description: 'Rewrite paths and rebuild the page into a portable local HTML snapshot.',
      icon: <RefreshCw className="w-5 h-5 text-[#6D5DFB]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'ZIP Export',
      description: 'Package the result into a clean downloadable archive.',
      icon: <Archive className="w-5 h-5 text-[#8B5CF6]" />,
      colSpan: 'md:col-span-4'
    },
    {
      title: 'Preview Mode',
      description: 'Review the generated snapshot before exporting.',
      icon: <Eye className="w-5 h-5 text-[#6D5DFB]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Animation-Aware Capture',
      description: 'Designed to preserve JavaScript-based animations when assets and scripts are available.',
      icon: <Play className="w-5 h-5 text-[#a78bfa]" />,
      colSpan: 'md:col-span-6'
    },
    {
      title: 'Visual Compare',
      description: 'Pixel-level screenshot comparison between the original live page and the rebuilt local preview. Generates a similarity score and diff overlay.',
      icon: <Sparkles className="w-5 h-5 text-[#6D5DFB]" />,
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
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* 1. Hero Section - Sticky to allow Showcase to slide over it */}
        <div className="sticky top-0 z-10 bg-[#000000]">
          <HeroSection />
        </div>

        {/* 2. Showcase Simulation Section - Slides over Hero, then scrolls normally */}
        <div className="relative z-20 bg-[#000000] border-t border-white/5 shadow-[0_-30px_60px_rgba(0,0,0,0.95)]">
          <ShowcaseSection />
        </div>

        {/* 3. Think Less Features Grid Section - Standard scroll */}
        <div className="relative z-20 bg-[#000000] border-t border-white/5">
          <section id="features" className="py-20 md:py-28 relative">
            {/* Background glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] purple-glow-orb opacity-20 pointer-events-none" />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
              <div className="text-center max-w-3xl mx-auto mb-20">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Think Less About the Capture.<br />
                  <span className="text-[#6D5DFB]">Focus on the Snapshot.</span>
                </h2>
                <p className="mt-4 text-sm text-neutral-400 leading-relaxed max-w-xl mx-auto">
                  CasaaTools handles browser rendering, DOM capture, asset mapping, and local export so developers can inspect and archive public pages faster.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {features.map((f, idx) => {
                  const isHighlighted = idx === 1 // "Final DOM Capture"
                  const icon = React.cloneElement(f.icon, {
                    className: `w-5 h-5 ${isHighlighted ? 'text-white' : 'text-[#6D5DFB]'}`
                  })

                  return (
                    <div 
                      key={idx} 
                      className={`col-span-12 ${f.colSpan} group rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                        isHighlighted 
                          ? 'bg-gradient-to-br from-[#6D5DFB] to-[#8B5CF6] border-[#8B5CF6]/30 text-white shadow-xl shadow-[#6D5DFB]/15'
                          : 'bg-[#0f111a]/30 border-white/5 hover:border-[#6D5DFB]/30 hover:shadow-[0_0_20px_-3px_rgba(109,93,251,0.06)]'
                      }`}
                    >
                      <div className="p-6 md:p-8 flex flex-col justify-between h-full space-y-4">
                        <div className="flex justify-between items-start">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isHighlighted ? 'bg-white/15 border border-white/10' : 'bg-black/40 border border-white/5'
                          }`}>
                            {icon}
                          </div>
                          <ArrowUpRight className={`w-4 h-4 ${
                            isHighlighted ? 'text-white/80' : 'text-neutral-500 group-hover:text-white transition-colors duration-250'
                          }`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{f.title}</h3>
                          <p className={`text-xs mt-2 leading-relaxed ${
                            isHighlighted ? 'text-purple-100' : 'text-neutral-400'
                          }`}>{f.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* 4. How It Works timelines - Standard scroll */}
        <div id="workflow" className="relative z-20 bg-[#000000] border-t border-white/5">
          <HowItWorks />
        </div>

        {/* 5. Ethical Boundaries section - Standard scroll */}
        <div className="relative z-20 bg-[#000000] border-t border-white/5">
          <EthicalUseSection />
        </div>

        {/* 6. Accordion FAQ Section - Standard scroll */}
        <div className="relative z-20 bg-[#000000] border-t border-white/5">
          <section id="faq" className="py-20 md:py-28 bg-black/10">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-3xl font-bold tracking-tight text-white">
                  Frequently Asked Questions
                </h2>
                <p className="mt-4 text-sm text-neutral-400">
                  Answers to common questions about snapshotting and limits.
                </p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx
                  return (
                    <div
                      key={idx}
                      className="bg-[#0f111a]/40 rounded-xl overflow-hidden transition-all duration-300 border border-white/5 hover:border-[#6D5DFB]/20 hover:shadow-[0_0_15px_-3px_rgba(109,93,251,0.03)]"
                    >
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left text-xs font-bold text-neutral-200 hover:text-white outline-none focus-visible:text-[#6D5DFB] transition-colors duration-200"
                      >
                        <span>{faq.q}</span>
                        <span className="shrink-0 ml-4 p-1 rounded-lg bg-black/40 border border-white/5 text-neutral-500">
                          {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 pb-6 pt-1 text-xs text-neutral-400 leading-relaxed border-t border-white/5 bg-black/20 animate-slide-in">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* 7. Final CTA Section - Standard scroll */}
        <div className="relative z-20 bg-[#000000] border-t border-white/5 bg-dots">
          <section className="py-20 md:py-28 relative">
            <div className="max-w-4xl mx-auto px-6 relative z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] purple-glow-orb opacity-20 pointer-events-none" />

              <Card className="relative overflow-hidden border border-white/5 bg-[#0f111a]/40 py-12 md:py-16 px-8 md:px-12 text-center" glass={false}>
                <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />
                <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Ready to Build Your First Snapshot?
                  </h2>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Start with a public or authorized page and generate a clean local HTML package.
                  </p>
                  <div className="pt-4 flex justify-center">
                    <Button
                      onClick={handleStartClick}
                      variant="primary"
                      size="lg"
                      className="rounded-xl font-bold px-8 shadow-xl shadow-[#6D5DFB]/15 bg-gradient-to-r from-[#6D5DFB] to-[#8B5CF6] hover:from-[#5B4CE2] hover:to-[#7C3AED]"
                    >
                      Launch CasaaTools
                      <ArrowUpRight className="ml-2 w-4.5 h-4.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* 8. Footer - Standard relative footer */}
      <Footer />
    </div>
  )
}
