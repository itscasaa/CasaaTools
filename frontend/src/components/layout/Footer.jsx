import React from 'react'
import { Link } from 'react-router-dom'
import { appConfig } from '../../constants/appConfig'
import { Layers, ArrowUp, Github, ArrowUpRight, ShieldCheck, Heart } from 'lucide-react'

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="border-t border-white/5 bg-[#000000] pt-20 pb-12 mt-auto relative overflow-hidden">
      
      {/* Subtle bottom-right background glow */}
      <div className="absolute -bottom-36 -right-36 w-[400px] h-[400px] bg-gradient-to-br from-[#6D5DFB]/5 to-transparent rounded-full blur-[80px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 sm:px-8 relative z-10">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start pb-16 border-b border-white/5">
          
          {/* Column 1: Branding info & Statuses */}
          <div className="col-span-1 md:col-span-5 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-black border border-white/10 flex items-center justify-center text-white shadow-lg shadow-[#6D5DFB]/5">
                  <Layers className="w-5 h-5 text-[#6D5DFB]" />
                </div>
                <span className="text-base font-bold text-[#F8FAFC] tracking-tight">
                  {appConfig.name}
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
                {appConfig.tagline}. Reconstruct dynamic web structures, download assets, and package standalone offline snapshots with ease.
              </p>
            </div>

            {/* System Status - Premium Badges */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">System Engine Status</h4>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  UI v1.5 Live
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#6D5DFB]/10 border border-[#6D5DFB]/20 text-purple-300">
                  Backend API v1.0
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-violet-300">
                  Rebuild Engine v1.0
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Product Navigation */}
          <div className="col-span-1 sm:col-span-3 md:col-span-2 space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-[#6D5DFB] uppercase tracking-widest">Product</h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-400">
              <li>
                <Link 
                  to="/features" 
                  className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  to="/workflow" 
                  className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block"
                >
                  Workflow
                </Link>
              </li>
              <li>
                <Link 
                  to="/" 
                  className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block"
                >
                  Showcase
                </Link>
              </li>
              <li>
                <Link 
                  to="/faq" 
                  className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources Navigation */}
          <div className="col-span-1 sm:col-span-3 md:col-span-2 space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-[#8B5CF6] uppercase tracking-widest">Resources</h4>
            <ul className="space-y-2 text-xs font-medium text-neutral-400">
              <li>
                <Link 
                  to="/ethical-use" 
                  className="hover:text-white transition-all duration-200 hover:translate-x-1 inline-block"
                >
                  Ethical Use
                </Link>
              </li>
              <li>
                <span className="text-neutral-500 cursor-not-allowed select-none">Project Docs</span>
              </li>
              <li>
                <span className="text-neutral-500 cursor-not-allowed select-none">Security Notes</span>
              </li>
            </ul>
          </div>

          {/* Column 4: GitHub Promo Card */}
          <div className="col-span-1 sm:col-span-6 md:col-span-3">
            <a 
              href="https://github.com/itscasaa/CasaaTools" 
              target="_blank" 
              rel="noreferrer"
              className="group block bg-[#0f111a]/30 border border-white/5 rounded-2xl p-5 hover:border-[#6D5DFB]/30 hover:shadow-[0_0_20px_rgba(109,93,251,0.05)] hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="w-9 h-9 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center text-neutral-400 group-hover:text-white transition-colors duration-300">
                  <Github className="w-4.5 h-4.5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
              </div>
              <div className="mt-4 space-y-1">
                <h5 className="text-xs font-bold text-white font-sans">Star us on GitHub</h5>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  CasaaTools is open source. Contribute or check out our code repository.
                </p>
              </div>
            </a>
          </div>

        </div>

        {/* Bottom copyright notice & Scroll to Top */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider text-center sm:text-left">
            <p>&copy; {new Date().getFullYear()} {appConfig.name}. Open source developer tool.</p>
            <span className="hidden sm:block h-3 w-px bg-white/10" />
            <p className="font-mono">v{appConfig.version} (Alpha)</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={scrollToTop}
              className="w-10 h-10 rounded-xl bg-[#0f111a]/40 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:border-[#6D5DFB]/30 hover:shadow-[0_0_15px_rgba(109,93,251,0.08)] transition-all duration-300 active:scale-95"
              title="Scroll to Top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  )
}