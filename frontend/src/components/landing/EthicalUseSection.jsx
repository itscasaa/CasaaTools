import React from 'react'
import { ShieldCheck, ShieldAlert, CheckCircle2, AlertOctagon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'

export default function EthicalUseSection() {
  const allowed = [
    'Owned websites',
    'Authorized public pages',
    'Static snapshots',
    'Debugging and inspection',
    'Portfolio/demo use'
  ]

  const prohibited = [
    'Login bypass',
    'Paywall bypass',
    'Captcha bypass',
    'Cloudflare bypass',
    'Private dashboard cloning',
    'Unauthorized copying'
  ]

  return (
    <section id="ethical" className="py-20 md:py-28 border-t border-white/[0.06] bg-[#05050A] relative">
      
      {/* Background glowing rings */}
      <div className="absolute top-1/2 right-1/4 w-[350px] h-[350px] purple-glow-orb opacity-35 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-[#F8FAFC] sm:text-4xl">
            Built for Authorized Snapshots Only
          </h2>
          <p className="mt-4 text-xs text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto">
            CasaaTools is designed for owned websites, public pages with permission, and authorized analysis. It does not support login bypass, paywall bypass, captcha bypass, anti-bot bypass, or private dashboard cloning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Allowed Section */}
          <Card className="h-full border-emerald-500/10" glass={true}>
            <CardHeader className="bg-emerald-500/5 pb-4 border-b border-emerald-500/10">
              <CardTitle className="text-xs flex items-center gap-2 text-emerald-400 uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Permitted Use Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-4">
                {allowed.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/80 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Prohibited Section */}
          <Card className="h-full border-red-500/10" glass={true}>
            <CardHeader className="bg-red-500/5 pb-4 border-b border-red-500/10">
              <CardTitle className="text-xs flex items-center gap-2 text-red-400 uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                Strictly Prohibited Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-4">
                {prohibited.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <AlertOctagon className="w-4 h-4 text-red-500/80 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-300 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </div>

      </div>
    </section>
  )
}