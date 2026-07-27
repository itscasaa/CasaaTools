import React, { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Link2, Chrome, FileCode, Archive } from 'lucide-react'

export default function HowItWorks() {
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: containerRef
  })

  // Horizontal translation for the steps row (desktop only)
  // We scroll from 0% (first card left-aligned with header) to -42% (last card fully visible)
  const x = useTransform(scrollYProgress, [0, 1], ['0%', '-42%'])

  const steps = [
    {
      number: '01',
      title: 'Paste Target URL',
      description: 'Masukkan URL halaman publik atau halaman yang diizinkan untuk direkonstruksi.',
      icon: <Link2 className="w-6 h-6 text-[#a78bfa]" />
    },
    {
      number: '02',
      title: 'Real-time Browser Rendering',
      description: 'Mesin peramban Playwright kami memuat halaman untuk mengeksekusi seluruh skrip runtime.',
      icon: <Chrome className="w-6 h-6 text-[#6D5DFB]" />
    },
    {
      number: '03',
      title: 'Deep Asset Capture',
      description: 'Mengumpulkan seluruh berkas CSS, JS, gambar, font, DOM dinamis, serta data metadata lainnya.',
      icon: <FileCode className="w-6 h-6 text-[#8B5CF6]" />
    },
    {
      number: '04',
      title: 'Export Standalone Bundle',
      description: 'Mengunduh hasil snapshot lokal yang siap pakai dalam format berkas ZIP portabel.',
      icon: <Archive className="w-6 h-6 text-[#5B4CE2]" />
    }
  ]

  return (
    <div ref={containerRef} className="relative lg:h-[220vh] bg-gradient-to-b from-[#120a21] via-[#090514] to-[#000000] border-y border-white/5">
      {/* Sticky container that stays in the viewport */}
      <div className="lg:sticky lg:top-0 lg:h-screen w-full flex flex-col justify-center overflow-x-hidden lg:overflow-hidden z-20 py-16 lg:py-0">

        {/* Background Dot Grid */}
        <div className="absolute inset-0 bg-dots opacity-20 pointer-events-none" />

        {/* Unified Layout Grid Container */}
        <div className="max-w-6xl mx-auto px-6 sm:px-8 w-full relative z-10 flex flex-col space-y-12">

          {/* Header */}
          <div className="max-w-2xl text-left space-y-3">
            <span className="text-[10px] font-bold text-[#6D5DFB] tracking-wider uppercase font-mono px-2.5 py-0.5 rounded bg-[#6D5DFB]/10 border border-[#6D5DFB]/20 w-fit block">
              Pipeline Snapshot
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#F8FAFC]">
              Get Set Up in Minutes, Start Mirroring Fast
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed max-w-xl">
              Alur kerja otomatis 4 tahap yang dirancang khusus untuk merekonstruksi dan mengunduh arsitektur web modern.
            </p>
          </div>

          {/* Mobile & Tablet (< lg): Vertical grid layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-[#0f111a]/40 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[240px] sm:min-h-[260px] transition-all hover:border-[#6D5DFB]/25 group relative shadow-2xl"
              >
                <div className="absolute inset-0 bg-dots opacity-[0.02] rounded-2xl pointer-events-none" />

                <div className="flex justify-between items-start relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:border-[#6D5DFB]/20 transition-all duration-300">
                    {step.icon}
                  </div>
                  <span className="text-3xl sm:text-4xl font-bold font-sans text-white/5 group-hover:text-[#6D5DFB]/10 transition-colors">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-2 relative z-10">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6D5DFB]">
                    Tahap {step.number}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#F8FAFC]">
                    {step.title}
                  </h3>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop (>= lg): Horizontal scroll track aligned with header */}
          <div className="hidden lg:block relative w-full overflow-visible select-none">
            <motion.div
              style={{ x }}
              className="flex gap-8 w-max"
            >
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="w-[360px] shrink-0 bg-[#0f111a]/40 border border-white/5 rounded-2xl p-8 flex flex-col justify-between h-[300px] transition-all hover:border-[#6D5DFB]/25 group relative shadow-2xl"
                >
                  <div className="absolute inset-0 bg-dots opacity-[0.02] rounded-2xl pointer-events-none" />

                  <div className="flex justify-between items-start relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-105 group-hover:border-[#6D5DFB]/20 transition-all duration-300">
                      {step.icon}
                    </div>
                    <span className="text-4xl font-bold font-sans text-white/5 group-hover:text-[#6D5DFB]/10 transition-colors">
                      {step.number}
                    </span>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#6D5DFB]">
                      Tahap {step.number}
                    </span>
                    <h3 className="text-lg font-bold text-[#F8FAFC]">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  )
}
