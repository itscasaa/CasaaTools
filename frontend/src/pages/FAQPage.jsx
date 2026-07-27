import React, { useState } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { Plus, Minus, HelpCircle, MessageSquare, Search, BookOpen, Settings, ShieldCheck } from 'lucide-react'

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [openIndex, setOpenIndex] = useState(null)

  const categories = [
    { id: 'general', label: 'General Questions', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'technical', label: 'Technical Specs', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Limits', icon: <ShieldCheck className="w-4 h-4" /> }
  ]

  const faqs = {
    general: [
      {
        q: 'What is CasaaTools and how does it differ from a website scraper?',
        a: 'CasaaTools is a specialized dynamic page snapshot and HTML rebuilder. While standard website scrapers download raw static HTML files directly from a server (which misses JavaScript rendering), CasaaTools launches a real headless browser instance, executes all dynamic scripts, captures the final rendered DOM state, and bundles all resources (styles, images, scripts, fonts) into a clean, portable offline package.'
      },
      {
        q: 'Is CasaaTools open source?',
        a: 'Yes! CasaaTools is licensed under open-source developer terms. You can contribute to our rebuilder engine, file issues, or inspect the codebase directly on GitHub.'
      },
      {
        q: 'Can I crawl an entire website with multiple pages?',
        a: 'The current scope of CasaaTools is focused on high-fidelity single public page snapshots. Multi-page crawling and directory mapping are planned features for subsequent phase releases, which will include strict depth controls to prevent server overloading.'
      }
    ],
    technical: [
      {
        q: 'Will JavaScript-based animations (like GSAP or Framer Motion) work in the snapshot?',
        a: 'CasaaTools sniffs network calls during rendering and downloads dynamic animation library scripts (such as GSAP, Framer Motion, AOS, Three.js, Lottie) and references them locally. Animations that depend solely on downloaded assets and DOM components will replay in the sandbox preview. However, animations that request server state, query external databases, or load assets dynamically via remote APIs will not replay.'
      },
      {
        q: 'What folder structure is used in the exported ZIP archive?',
        a: 'The downloaded ZIP package contains: (1) index.html – the rewritten offline page; (2) index.original.html – the raw captured dynamic DOM before paths were rewritten; (3) metadata.json – crawl parameters, timestamps, and job properties; (4) preview-screenshot.png – viewport screenshot; (5) assets/ – subfolders containing downloaded styles (.css), scripts (.js), fonts (WOFF/WOFF2/TTF), and media (images, webp, svg).'
      },
      {
        q: 'How does the Visual Compare regression score work?',
        a: 'To guarantee fidelity, the engine captures a viewport screenshot of the original live site, then runs the compiled offline package inside a secure local sandbox and takes a second screenshot. It compares the two screenshots pixel-by-pixel using a regression engine (looks-same / pixelmatch) and outputs a percentage score (e.g. 98.5% similarity) along with a highlight diff image.'
      }
    ],
    security: [
      {
        q: 'Can CasaaTools bypass Captchas, Login walls, or Paywalls?',
        a: 'No. CasaaTools is designed strictly for public, authorized, or owned web layouts. The engine does not include captcha solvers, credential databases, session hijack bypassers, or subscription evasion logic. Attempting to crawl a protected page will result in capturing the login screen or error page.'
      },
      {
        q: 'How does script sandboxing protect my system when viewing snapshots?',
        a: 'When rebuilding the HTML package, the engine sanitizes stylesheets and identifies external JavaScript files that execute user tracking, cookies, ads, or analytics, commenting them out. It attaches strict sandbox tags to frame structures and sets link protocols, preventing the local offline snapshot from executing malware scripts or creating phishing vectors.'
      },
      {
        q: 'What are the rate-limiting limits for snapshot requests?',
        a: 'By default, the system enforces a limit of 10 snapshot jobs per minute per user account. This prevents concurrent job queues from overloading our container Playwright workers, ensuring stable performance for all developers.'
      }
    ]
  }

  const toggleAccordion = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setOpenIndex(null)
  }

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Background neon glows */}
      <div className="absolute top-0 left-1/4 w-[450px] h-[450px] bg-gradient-to-br from-[#6D5DFB]/10 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-12 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#8B5CF6]/5 to-transparent rounded-full blur-[90px] pointer-events-none z-0" />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Header Title Section */}
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6D5DFB]/10 border border-[#6D5DFB]/20">
              <HelpCircle className="w-3.5 h-3.5 text-[#6D5DFB]" />
              <span className="text-[10px] font-bold text-purple-300 tracking-wider uppercase font-mono">Frequently Asked Questions</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl font-sans">
              Got Questions? We Have<br />
              <span className="text-[#6D5DFB]">Detailed Answers.</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Find technical specifications, capabilities, security parameters, and limits of the rebuilder engine.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-white/5 pb-1 mb-8 gap-2 overflow-x-auto whitespace-nowrap">
            {categories.map((cat) => {
              const isActive = activeTab === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => handleTabChange(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all outline-none border ${
                    isActive 
                      ? 'text-white bg-[#6D5DFB]/10 border-[#6D5DFB]/30' 
                      : 'text-neutral-400 hover:text-white border-transparent hover:bg-white/5'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>

          {/* Accordion Questions */}
          <div className="space-y-4 min-h-[300px]">
            {faqs[activeTab].map((faq, idx) => {
              const isOpen = openIndex === idx
              return (
                <div
                  key={idx}
                  className="bg-[#0f111a]/30 rounded-2xl overflow-hidden border border-white/5 hover:border-[#6D5DFB]/25 hover:shadow-[0_0_20px_rgba(109,93,251,0.03)] transition-all duration-300"
                >
                  <button
                    onClick={() => toggleAccordion(idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left text-xs font-bold text-neutral-200 hover:text-white outline-none focus-visible:text-[#6D5DFB] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="shrink-0 ml-4 p-1.5 rounded-lg bg-black/40 border border-white/5 text-neutral-500">
                      {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6 pt-2 text-xs text-neutral-400 leading-relaxed border-t border-white/5 bg-black/20 animate-slide-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
