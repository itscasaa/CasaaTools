import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, XCircle, AlertTriangle, Loader2, Shield,
  Download, ExternalLink, ShieldAlert, CheckCircle, ShieldCheck
} from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'
import { scanApi } from '../../services/scanApi'
import { appConfig } from '../../constants/appConfig'

const STATUS_LABELS = {
  queued: 'Dalam Antrean',
  running: 'Pemindaian Berjalan',
  completed: 'Selesai',
  failed: 'Gagal',
  timeout: 'Waktu Habis',
  cancelled: 'Dibatalkan'
}

export default function ZapSecurityScanPanel() {
  const [targetUrl, setTargetUrl] = useState('')
  const [permissionChecked, setPermissionChecked] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [scanData, setScanData] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  
  const scanIdRef = useRef(null)
  const pollTimerRef = useRef(null)

  // Polling logic
  const pollStatus = useCallback(async () => {
    if (!scanIdRef.current) return

    try {
      const response = await scanApi.getZapScan(scanIdRef.current)
      const data = response.data || response

      setScanData(data)

      if (['completed', 'failed', 'timeout', 'cancelled'].includes(data.status)) {
        setIsPolling(false)
      }
    } catch (err) {
      console.error('Polling error:', err)
      // We don't fail the scan immediately on single network failure, let it try again
    }
  }, [])

  useEffect(() => {
    if (isPolling) {
      pollTimerRef.current = setInterval(pollStatus, 1000)
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
      }
    }
  }, [isPolling, pollStatus])

  const handleStartScan = async (e) => {
    e.preventDefault()
    if (!permissionChecked) {
      setSubmitError('Anda harus menyetujui konfirmasi izin pemindaian.')
      return
    }

    setSubmitError(null)
    setSubmitting(true)
    setScanData(null)

    try {
      const response = await scanApi.startZapScan(targetUrl)
      const data = response.data || response
      
      setScanData(data)
      if (data.scanId) {
        scanIdRef.current = data.scanId
        setIsPolling(true)
      }
    } catch (err) {
      setSubmitError(err.message || 'Gagal memulai pemindaian keamanan.')
    } finally {
      setSubmitting(false)
    }
  };

  const handleCancelScan = async () => {
    if (!scanIdRef.current) return
    try {
      await fetch(`${appConfig.apiBaseUrl}/api/zap-scan/status/${scanIdRef.current}/cancel`, {
        method: 'POST'
      })
    } catch {
      // ignore
    }
    setIsPolling(false)
    setScanData(prev => prev ? { ...prev, status: 'cancelled' } : null)
  }

  const handleReset = () => {
    setScanData(null)
    scanIdRef.current = null
    setIsPolling(false)
    setPermissionChecked(false)
    setTargetUrl('')
    setSubmitError(null)
  }

  const isScanning = isPolling || submitting
  const scanCompleted = scanData?.status === 'completed'
  const scanFailed = scanData?.status === 'failed' || scanData?.status === 'timeout' || scanData?.status === 'cancelled'

  // Construct urls
  const scanId = scanData?.scanId
  const downloadHtmlUrl = `${appConfig.apiBaseUrl}/api/zap-scan/download/${scanId}/html`
  const downloadJsonUrl = `${appConfig.apiBaseUrl}/api/zap-scan/download/${scanId}/json`
  const viewHtmlUrl = `${appConfig.apiBaseUrl}/api/zap-scan/view/${scanId}`

  const summary = scanData?.summary || { high: 0, medium: 0, low: 0, informational: 0 }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!isScanning && !scanCompleted && !scanFailed && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
              <div className="p-2 rounded-lg bg-[#6D5DFB]/10 border border-[#6D5DFB]/20">
                <Shield className="w-5 h-5 text-[#6D5DFB]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F8FAFC]">ZAP Baseline Scanner</h3>
                <p className="text-xs text-[#A1A1AA]">
                  Pindai kerentanan keamanan website secara otomatis menggunakan OWASP ZAP.
                </p>
              </div>
            </div>

            <form onSubmit={handleStartScan} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#F8FAFC]">
                  URL Website Target
                </label>
                <Input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="text"
                  required
                  className="w-full bg-white/[0.02] border border-white/[0.08] px-4 py-3 rounded-xl text-sm text-[#F8FAFC] outline-none focus:border-[#6D5DFB] focus:ring-4 focus:ring-[#6D5DFB]/20 transition-all duration-300"
                />
              </div>

              {/* Security checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <input
                  id="permission-checkbox"
                  type="checkbox"
                  checked={permissionChecked}
                  onChange={(e) => setPermissionChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/[0.08] text-[#6D5DFB] bg-white/[0.02] focus:ring-[#6D5DFB]/20 focus:ring-offset-0 transition-colors"
                />
                <label htmlFor="permission-checkbox" className="text-xs text-[#A1A1AA] leading-relaxed cursor-pointer select-none">
                  <span className="font-semibold text-[#F8FAFC] block mb-1">Pernyataan Izin Pemindaian</span>
                  Saya mengonfirmasi bahwa saya memiliki atau memiliki izin tertulis untuk memindai website target ini. Pemindaian ilegal atau tanpa izin melanggar hukum.
                </label>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-xs text-rose-400">{submitError}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={!permissionChecked || !targetUrl}
                loading={submitting}
                variant="primary"
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Mulai ZAP Scan
              </Button>
            </form>

            <div className="text-[11px] text-[#71717A] leading-relaxed space-y-1">
              <p>⚡ <strong>Informasi Scanner:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Fitur ini menggunakan mesin pemindaian resmi <strong>OWASP ZAP Baseline Scan</strong>.</li>
                <li>Hanya lakukan pemindaian pada website publik yang diizinkan untuk diuji.</li>
                <li>Laporan asli (HTML/JSON) yang diunduh diproduksi langsung oleh OWASP ZAP tanpa modifikasi.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanning Progress */}
      {isScanning && !scanCompleted && (
        <Card>
          <CardContent className="space-y-5 p-6 text-center">
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Loader2 className="w-12 h-12 text-[#6D5DFB] animate-spin" />
              <div className="space-y-1">
                <Badge variant="primary" className="animate-pulse">
                  {STATUS_LABELS[scanData?.status] || 'Menyiapkan...'}
                </Badge>
                <h3 className="text-base font-bold text-[#F8FAFC]">Memindai {targetUrl}</h3>
                <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
                  OWASP ZAP sedang menjalankan Baseline Scan via Docker. Proses ini dapat memakan waktu 1-3 menit.
                </p>
              </div>
            </div>

            {scanData?.status === 'running' && (
              <div className="space-y-2">
                <Progress value={50} className="w-full" />
                <span className="text-[10px] text-[#71717A]">Menjalankan analisis baseline...</span>
              </div>
            )}

            <Button onClick={handleCancelScan} variant="danger" size="sm" className="mx-auto block">
              <XCircle className="w-4 h-4 mr-1.5 inline" />
              Batalkan Pemindaian
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error & Cancel State */}
      {scanFailed && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">Pemindaian Gagal</h3>
                <p className="text-xs text-[#A1A1AA] mt-1 max-w-md mx-auto">
                  {scanData?.error?.message || 'Terjadi kesalahan saat menjalankan OWASP ZAP.'}
                </p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Button onClick={handleReset} variant="secondary" size="sm">
                Coba URL Lain
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {scanCompleted && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Header Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F8FAFC]">Laporan Keamanan ZAP Selesai</h3>
                    <p className="text-xs text-[#A1A1AA] truncate max-w-sm sm:max-w-md">
                      Target: {targetUrl}
                    </p>
                  </div>
                </div>
                <Badge variant="success">Selesai</Badge>
              </div>

              {/* Alert Summary Cards */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#A1A1AA]">Ringkasan Temuan Kerentanan</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-center">
                    <p className="text-2xl font-bold text-rose-400">{summary.high}</p>
                    <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider mt-1 font-semibold">Tinggi (High)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center">
                    <p className="text-2xl font-bold text-amber-400">{summary.medium}</p>
                    <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider mt-1 font-semibold">Sedang (Medium)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{summary.low}</p>
                    <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider mt-1 font-semibold">Rendah (Low)</p>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-center">
                    <p className="text-2xl font-bold text-blue-400">{summary.informational}</p>
                    <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider mt-1 font-semibold">Informasi</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={viewHtmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#6D5DFB] hover:bg-[#5C4EE3] text-sm font-semibold text-[#F8FAFC] shadow-lg shadow-[#6D5DFB]/10 hover:shadow-[#6D5DFB]/20 transition-all duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Laporan HTML Asli
                </a>
                
                <a
                  href={downloadHtmlUrl}
                  download={`zap-report-${scanId}.html`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-semibold text-[#F8FAFC] transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  Unduh Laporan HTML ZAP
                </a>

                <a
                  href={downloadJsonUrl}
                  download={`zap-report-${scanId}.json`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm font-semibold text-[#F8FAFC] transition-all duration-300"
                >
                  <Download className="w-4 h-4" />
                  Unduh Laporan JSON ZAP
                </a>
              </div>

              {/* Info text */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-[#A1A1AA] leading-relaxed">
                📢 <strong>Catatan Penting:</strong> Laporan HTML dan JSON di atas diproduksi langsung oleh mesin pemindai keamanan <strong>OWASP ZAP</strong>. Kami tidak mengubah konten laporan, styling, maupun tingkat keparahan yang diidentifikasi oleh ZAP.
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleReset} variant="secondary" className="w-full sm:w-auto">
            Lakukan Pemindaian Baru
          </Button>
        </div>
      )}
    </div>
  )
}
