import React from 'react'
import {
  ShieldAlert, Clock, Cpu, AlertTriangle, Hammer, Lock,
  Info, CheckCircle2, ArrowRight, ShieldCheck
} from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export default function ZapSecurityScanPanel() {
  return (
    <div className="space-y-6">
      {/* Maintenance Card */}
      <Card>
        <CardContent className="space-y-6 p-8">
          {/* Icon */}
          <div className="flex items-center justify-center py-6">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Hammer className="w-12 h-12 text-amber-400" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-[#F8FAFC]">
              OWASP ZAP Scanner
            </h3>
            <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
              Fitur pemindaian OWASP ZAP (Zed Attack Proxy) sedang dalam
              masa pemeliharaan dan perbaikan untuk memperbarui konfigurasi scan engine.
            </p>
          </div>

          {/* Info Sections */}
          <div className="space-y-4">
            {/* Available Alternatives */}
            <div className="p-4 rounded-xl bg-[#6D5DFB]/5 border border-[#6D5DFB]/10">
              <div className="flex items-center gap-3 mb-3">
                <Info className="w-5 h-5 text-[#6D5DFB]" />
                <h4 className="text-sm font-semibold text-[#F8FAFC]">
                  Fitur Tersedia
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-[#A1A1AA]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#F8FAFC]">Performance Scanner:</strong>{' '}
                    Cek performa website (Lighthouse) via Google PageSpeed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#F8FAFC]">Security Scanner (CodeQL):</strong>{' '}
                    Pindai keamanan source code Anda
                  </span>
                </li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-5 h-5 text-[#A1A1AA]" />
                <h4 className="text-sm font-semibold text-[#F8FAFC]">
                  Estimasi Waktu & Status Update
                </h4>
              </div>
              <p className="text-xs text-[#A1A1AA] leading-relaxed">
                Kami sedang melakukan pemeliharaan pada environment container Docker
                yang menjalankan OWASP ZAP Baseline Scan untuk meningkatkan kecepatan
                pemindaian dan keakuratan pelaporan hasil scan.
              </p>
            </div>

            {/* Security Note */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="text-xs text-[#A1A1AA] leading-relaxed">
                  <p className="font-semibold text-red-400 mb-1">
                    Docker Container Maintenance
                  </p>
                  <p>
                    Layanan scanner ini memerlukan container daemon Docker yang stabil.
                    Selama masa maintenance ini, API `/api/zap-scan` untuk memulai scan
                    dinonaktifkan sementara untuk mencegah beban server yang berlebih.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/[0.06]">
            <p className="text-[11px] text-[#71717A] text-center leading-relaxed">
              📌 Fitur ini akan diaktifkan kembali setelah Docker engine update selesai dilakukan.
              Terima kasih atas kesabaran Anda.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Available Tools Section */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-semibold text-[#F8FAFC] mb-3">
              Tools Alternatif
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Security Tab */}
              <div
                onClick={() => window.location.href = '/scanner/security'}
                className="p-4 rounded-xl bg-[#6D5DFB]/5 border border-[#6D5DFB]/10 hover:border-[#6D5DFB]/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6D5DFB] transition-colors">
                      Security Scanner
                    </h4>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Analisis kerentanan static code analysis (SAST) menggunakan CodeQL
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6D5DFB] hover:text-[#8B5CF6] mt-2 font-medium group-hover:underline">
                      Gunakan
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Scanner */}
              <div
                onClick={() => window.location.href = '/scanner/performance'}
                className="p-4 rounded-xl bg-[#6D5DFB]/5 border border-[#6D5DFB]/10 hover:border-[#6D5DFB]/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6D5DFB] transition-colors">
                      Performance Scanner
                    </h4>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Cek performa website via Google PageSpeed
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#6D5DFB] hover:text-[#8B5CF6] mt-2 font-medium group-hover:underline">
                      Gunakan
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}