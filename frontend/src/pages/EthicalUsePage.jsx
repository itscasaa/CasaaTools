import React from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { ShieldCheck, ShieldAlert, AlertOctagon, HelpCircle, Check, X, Shield, Lock, ExternalLink } from 'lucide-react'

export default function EthicalUsePage() {
  const allowed = [
    {
      title: 'Owned Web Properties',
      desc: 'Creating backup snap shots or static archives of pages you built, own, or operate.'
    },
    {
      title: 'Explicit Client Approvals',
      desc: 'Crawling client directories or pages for web redesign audits where you have signed authorization.'
    },
    {
      title: 'Development & Offline Debugging',
      desc: 'Downloading page HTML assets locally to debug styling, inspect DOM bugs, or test changes offline.'
    },
    {
      title: 'Historical & Reference Archival',
      desc: 'Saving a snapshot of public pages, news articles, or references for personal research documentation.'
    }
  ]

  const prohibited = [
    {
      title: 'Authentication & Session Bypassing',
      desc: 'Attempting to extract DOM layouts inside logged-in sessions, user dashboards, or private portals.'
    },
    {
      title: 'Paywall & Subscription Evasion',
      desc: 'Using the crawl pipeline to bypass news paywalls or download subscription-locked content.'
    },
    {
      title: 'CAPTCHA & Bot Shield Solutions',
      desc: 'Integrating bot-solvers, CAPTCHA bypassers, or proxies to scrape sites that explicitly forbid crawlers.'
    },
    {
      title: 'Mass Data Scraping & Piracy',
      desc: 'Bulk crawling proprietary tables, databases, e-commerce pricing, or copyrighted media for commercial resale.'
    }
  ]

  return (
    <div className="min-h-screen bg-[#000000] text-neutral-200 flex flex-col relative overflow-hidden">
      <Navbar />

      {/* Background neon elements */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-gradient-to-br from-[#6D5DFB]/10 to-transparent rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-12 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-[#8B5CF6]/5 to-transparent rounded-full blur-[90px] pointer-events-none z-0" />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* Header Title Section */}
          <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6D5DFB]/10 border border-[#6D5DFB]/20">
              <Shield className="w-3.5 h-3.5 text-[#6D5DFB]" />
              <span className="text-[10px] font-bold text-purple-300 tracking-wider uppercase font-mono">Ethical Standards & Security</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl font-sans">
              Responsible Web Archival &<br />
              <span className="text-[#6D5DFB]">Sandbox Compliance.</span>
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Guidelines, limitations, and security measures governing the usage of the CasaaTools pipeline.
            </p>
          </div>

          {/* Guidelines Grid (Allowed vs Prohibited) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            
            {/* Allowed Column */}
            <div className="bg-[#0f111a]/20 border border-emerald-500/10 rounded-2xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-sans">Permitted Activities</h2>
                  <p className="text-[11px] text-neutral-500 font-medium">Safe use cases within project limits</p>
                </div>
              </div>

              <div className="space-y-4">
                {allowed.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-black/40 border border-white/5 rounded-xl p-4">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[11px] text-neutral-450 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prohibited Column */}
            <div className="bg-[#0f111a]/20 border border-red-500/10 rounded-2xl p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white font-sans">Prohibited Activities</h2>
                  <p className="text-[11px] text-neutral-500 font-medium">Violations of usage terms</p>
                </div>
              </div>

              <div className="space-y-4">
                {prohibited.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start bg-black/40 border border-white/5 rounded-xl p-4">
                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="text-[11px] text-neutral-450 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Sandbox Security Panel */}
          <div className="bg-[#0f111a]/30 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-[#6D5DFB]/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-5">
              <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center text-[#6D5DFB] shadow-md">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white font-sans">The Security Sandbox & Script Isolation</h2>
                <p className="text-[11px] text-neutral-500 font-medium">How we protect your system during offline preview checks</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">1. Script Disabling</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  During path rebuilding, dynamic script files that process requests, cookie sessions, tracking logs, or login checks are commented out or rewritten. This prevents captured phishing pages from firing requests to steal logins.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">2. Link Target Isolation</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  All active target links {"<a>"} in the rebuilt local HTML package are stripped of dynamic redirection handlers or tagged with `rel="noopener noreferrer"` properties to isolate original contexts and secure host browser threads.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white">3. Offline Content Boundaries</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Rebuilt snapshots run locally on your browser within absolute sandbox constraints. If a script attempts to download remote data payloads, the browser blocks the connection due to sandbox security standards.
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  )
}
