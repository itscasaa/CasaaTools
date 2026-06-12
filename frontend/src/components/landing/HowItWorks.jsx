import React from 'react'
import { Link2, Chrome, FileCode, Archive } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Paste URL',
      description: 'Enter a public or authorized page URL.',
      icon: <Link2 className="w-5 h-5 text-indigo-400" />
    },
    {
      number: '02',
      title: 'Render Page',
      description: 'The system opens the page like a real browser.',
      icon: <Chrome className="w-5 h-5 text-violet-400" />
    },
    {
      number: '03',
      title: 'Capture Snapshot',
      description: 'DOM, assets, screenshots, and metadata are collected.',
      icon: <FileCode className="w-5 h-5 text-[#8B5CF6]" />
    },
    {
      number: '04',
      title: 'Export Package',
      description: 'Download a local HTML snapshot as a ZIP file.',
      icon: <Archive className="w-5 h-5 text-[#38BDF8]" />
    }
  ]

  return (
    <section id="workflow" className="py-20 md:py-28 border-t border-white/[0.06] bg-black/15">
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
            Get Set Up in Minutes, Start Mirroring Fast
          </h2>
          <p className="mt-4 text-xs text-[#A1A1AA] leading-relaxed">
            A secure, automated 4-stage pipeline built to capture modern web architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          
          {/* Glowing neon wave line (Desktop Only) */}
          <div className="hidden md:block absolute top-[28px] left-[12%] right-[12%] h-[1px] wave-connector bg-gradient-to-r from-[#6D5DFB] via-[#8B5CF6] to-[#3B82F6] rounded-full z-0" />

          {steps.map((step) => (
            <div key={step.number} className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left group">
              
              {/* Icon Circle */}
              <div className="w-14 h-14 rounded-2xl bg-[#080816] border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-[#6D5DFB]/40 group-hover:shadow-[0_0_20px_rgba(109,93,251,0.25)] transition-all duration-300 shadow-xl relative z-10">
                {step.icon}
              </div>

              {/* Step number label */}
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#6D5DFB] mb-2 block">
                Step {step.number}
              </span>

              {/* Title */}
              <h3 className="text-sm font-bold text-[#F8FAFC] mb-2 group-hover:text-[#6D5DFB] transition-colors duration-200">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-xs">
                {step.description}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  )
}