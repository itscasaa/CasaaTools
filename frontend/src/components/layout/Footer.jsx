import React from 'react'
import { appConfig } from '../../constants/appConfig'
import { AlertCircle, Layers } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#05050A] pt-16 pb-12 mt-auto">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start pb-12 border-b border-white/[0.04]">
          
          {/* Column 1: Branding info */}
          <div className="col-span-1 md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6D5DFB] to-[#8B5CF6] flex items-center justify-center text-white">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <span className="text-base font-bold text-[#F8FAFC]">
                {appConfig.name}
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-sm">
              {appConfig.tagline}. Reconstruct raw dynamic web layouts into self-contained offline files.
            </p>
            <div className="text-[10px] text-[#71717A] font-semibold uppercase tracking-wider">
              For public, owned, or authorized pages only.
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="col-span-1 sm:col-span-4 md:col-span-2.5 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs font-medium text-[#71717A]">
              <li><a href="#features" className="hover:text-[#F8FAFC] transition-colors duration-200">Features</a></li>
              <li><a href="#workflow" className="hover:text-[#F8FAFC] transition-colors duration-200">Workflow</a></li>
              <li><a href="#showcase" className="hover:text-[#F8FAFC] transition-colors duration-200">Showcase</a></li>
              <li><a href="#faq" className="hover:text-[#F8FAFC] transition-colors duration-200">FAQ</a></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="col-span-1 sm:col-span-4 md:col-span-2.5 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs font-medium text-[#71717A]">
              <li><a href="#ethical" className="hover:text-[#F8FAFC] transition-colors duration-200">Ethical Use</a></li>
              <li><a href="#docs" className="hover:text-[#F8FAFC] transition-colors duration-200">Project Scope</a></li>
              <li><a href="#security" className="hover:text-[#F8FAFC] transition-colors duration-200">Security Notes</a></li>
            </ul>
          </div>

          {/* Column 4: Status */}
          <div className="col-span-1 sm:col-span-4 md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">System Status</h4>
            <ul className="space-y-2.5 text-xs text-[#71717A] font-mono">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Phase 1 UI: <span className="text-emerald-400 font-bold uppercase text-[9px]">Live</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <span>Backend API: <span className="text-indigo-400 font-bold uppercase text-[9px]">Planned</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span>Rebuild Engine: <span className="text-purple-400 font-bold uppercase text-[9px]">Planned</span></span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-[#71717A] font-semibold uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} {appConfig.name}. Open source developer tool.</p>
          <div className="flex gap-4">
            <span className="font-mono">v{appConfig.version} (Pre-release)</span>
          </div>
        </div>

      </div>
    </footer>
  )
}