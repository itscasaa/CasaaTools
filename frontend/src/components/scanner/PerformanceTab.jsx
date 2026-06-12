import React, { useState, useCallback } from 'react'
import {
  Play, XCircle, AlertTriangle, Loader2,
  ChevronDown, ChevronUp, Monitor
} from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'
import { scanApi } from '../../services/scanApi'
import { useScanPolling } from '../../hooks/useScanPolling'

const STATUS_LABELS = {
  queued: 'Dalam Antrean',
  validating: 'Memvalidasi Target',
  preparing: 'Menyiapkan Pemindaian',
  running: 'Pemindaian Berjalan',
  analyzing: 'Menganalisis Hasil',
  parsing: 'Membaca Hasil',
  completed: 'Selesai',
  failed: 'Gagal',
  timeout: 'Waktu Habis',
  cancelled: 'Dibatalkan',
  stale: 'Terhenti'
}

const METRIC_LABELS = {
  fcp: 'Konten Pertama Muncul',
  lcp: 'Elemen Terbesar Muncul',
  tbt: 'Waktu Blocking Total',
  cls: 'Pergeseran Layout',
  speedIndex: 'Indeks Kecepatan'
}

const METRIC_THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  tbt: { good: 200, poor: 600 },
  cls: { good: 0.1, poor: 0.25 },
  speedIndex: { good: 3400, poor: 5800 }
}

function getScoreColor(score) {
  if (score >= 90) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Baik' }
  if (score >= 50) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Perlu Ditingkatkan' }
  return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Buruk' }
}

function getMetricColor(key, value) {
  const threshold = METRIC_THRESHOLDS[key]
  if (!threshold) return 'text-[#A1A1AA]'
  if (value <= threshold.good) return 'text-emerald-400'
  if (value <= threshold.poor) return 'text-amber-400'
  return 'text-rose-400'
}

function getMetricDot(key, value) {
  const threshold = METRIC_THRESHOLDS[key]
  if (!threshold) return 'bg-gray-400'
  if (value <= threshold.good) return 'bg-emerald-400'
  if (value <= threshold.poor) return 'bg-amber-400'
  return 'bg-rose-400'
}

function getImpactBadge(impact) {
  if (impact === 'high') return <Badge variant="error">Dampak Tinggi</Badge>
  if (impact === 'medium') return <Badge variant="warning">Dampak Sedang</Badge>
  return <Badge variant="neutral">Dampak Rendah</Badge>
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function ScoreGauge({ score, size = 80, strokeWidth = 6, label }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  const strokeColor = score >= 90 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color.text}`}>{score}</span>
        </div>
      </div>
      {label && <span className="text-xs text-[#A1A1AA] font-medium">{label}</span>}
    </div>
  )
}

export default function PerformanceTab() {
  const [url, setUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [expandedOpportunities, setExpandedOpportunities] = useState(false)
  const [expandedDiagnostics, setExpandedDiagnostics] = useState(false)
  const [expandedOpportunityItems, setExpandedOpportunityItems] = useState({})
  const [expandedDiagnosticItems, setExpandedDiagnosticItems] = useState({})

  const { scanData, isPolling, error: pollError, startPolling, stopPolling, retryPolling } = useScanPolling()

  const urlValid = isValidUrl(url)
  const isScanning = isPolling || submitting
  const scanCompleted = scanData?.status === 'completed'
  const scanFailed = scanData?.status === 'failed' || scanData?.status === 'timeout'

  const handleStartScan = useCallback(async () => {
    if (!urlValid) return
    setSubmitError(null)
    setSubmitting(true)

    try {
      const result = await scanApi.startLighthouseScan({ url })
      const scanId = result.data?.scanId || result.scanId
      if (scanId) {
        startPolling(scanId)
      }
    } catch (err) {
      setSubmitError(err.message || 'Gagal memulai pemindaian.')
    } finally {
      setSubmitting(false)
    }
  }, [url, urlValid, startPolling])

  const handleCancel = useCallback(async () => {
    if (scanData?.scanId) {
      try {
        await scanApi.cancelScan(scanData.scanId)
      } catch {
        // ignore cancel errors
      }
    }
    stopPolling()
  }, [scanData, stopPolling])

  const handleRetry = useCallback(() => {
    setSubmitError(null)
    if (scanData?.scanId) {
      retryPolling()
    } else {
      handleStartScan()
    }
  }, [scanData, retryPolling, handleStartScan])

  // Extract results
  const results = scanData?.results || scanData?.result || {}
  const scores = results.scores || {}
  const coreWebVitals = results.coreWebVitals || {}
  const opportunities = results.opportunities || []
  const diagnostics = results.diagnostics || []
  const recommendations = results.recommendations || []
  const screenshot = results.screenshot || null
  const stability = results.stability || null
  const settings = results.settings || {}
  const scannedUrl = scanData?.params?.url || url

  const progressValue = scanData?.progress || 0

  const toggleOpportunityItem = (idx) => {
    setExpandedOpportunityItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  const toggleDiagnosticItem = (idx) => {
    setExpandedDiagnosticItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!isScanning && !scanCompleted && !scanFailed && (
        <Card>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
                URL Target
              </label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                maxLength={2048}
                error={url.length > 0 && !urlValid}
              />
              {url.length > 0 && !urlValid && (
                <p className="text-xs text-rose-400 mt-1.5">
                  Masukkan URL valid yang dimulai dengan http:// atau https://
                </p>
              )}
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs text-rose-400">{submitError}</p>
              </div>
            )}

            <Button
              onClick={handleStartScan}
              disabled={!urlValid}
              loading={submitting}
              variant="primary"
              className="w-full sm:w-auto"
            >
              <Play className="w-4 h-4 mr-2" />
              Mulai Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Scanning Progress */}
      {isScanning && !scanCompleted && !scanFailed && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  {STATUS_LABELS[scanData?.status] || 'Memulai Pemindaian...'}
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  {scanData?.currentStep || 'Menginisialisasi...'}
                </p>
              </div>
            </div>

            <Progress value={progressValue} showLabel />

            <Button
              onClick={handleCancel}
              variant="danger"
              size="sm"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Batalkan Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {(scanFailed || pollError) && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-400">Pemindaian Gagal</p>
                <p className="text-xs text-[#A1A1AA]">
                  {pollError || scanData?.error?.message || 'Terjadi kesalahan saat memindai.'}
                </p>
              </div>
            </div>
            <Button onClick={handleRetry} variant="secondary" size="sm">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results — Lighthouse-Inspired Layout */}
      {scanCompleted && (
        <div className="space-y-6">
          {/* 1. Top Category Score Circles */}
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                {[
                  { key: 'performance', label: 'Performa' },
                  { key: 'accessibility', label: 'Aksesibilitas' },
                  { key: 'bestPractices', label: 'Praktik Terbaik' },
                  { key: 'seo', label: 'SEO' }
                ].map(({ key, label }) => (
                  <ScoreGauge
                    key={key}
                    score={scores[key] ?? 0}
                    size={80}
                    strokeWidth={6}
                    label={label}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2. Main Performance Section — 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Large performance gauge */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                <ScoreGauge
                  score={scores.performance ?? 0}
                  size={120}
                  strokeWidth={8}
                  label="Performa"
                />
                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-[#A1A1AA] mt-2">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    90-100 Baik
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    50-89 Perlu Ditingkatkan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
                    0-49 Buruk
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Right: Website preview */}
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
                {screenshot ? (
                  <div className="w-full max-w-sm rounded-xl border border-white/[0.08] overflow-hidden shadow-lg">
                    <img
                      src={typeof screenshot === 'string' && screenshot.startsWith('data:') ? screenshot : screenshot}
                      alt="Screenshot halaman"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-sm h-40 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col items-center justify-center gap-2">
                    <Monitor className="w-8 h-8 text-[#A1A1AA]" />
                    <span className="text-xs text-[#A1A1AA]">Preview tidak tersedia</span>
                  </div>
                )}
                {scannedUrl && (
                  <p className="text-xs text-[#A1A1AA] text-center truncate max-w-full px-4">
                    {scannedUrl}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. Provider & Strategy Info */}
          {(stability || settings?.provider) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-xs text-[#A1A1AA] flex-wrap">
                  <Badge variant="primary">
                    {stability?.provider || settings?.provider === 'pagespeed' ? 'Google PageSpeed Insights' : 'Lighthouse'}
                  </Badge>
                  <span>Strategy: {settings?.strategy || 'Mobile'}</span>
                </div>
                <p className="text-[10px] text-[#71717A] mt-2">
                  {stability?.note || 'Hasil performa diambil dari Google PageSpeed Insights API agar lebih konsisten dengan PageSpeed Insights.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* 4. Core Web Vitals Section */}
          <Card>
            <CardContent className="space-y-4">
              <h4 className="text-sm font-bold text-[#F8FAFC]">Core Web Vitals</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {Object.entries(METRIC_LABELS).map(([key, label]) => {
                  const value = coreWebVitals[key]
                  if (value === undefined || value === null) return null
                  const numValue = typeof value === 'number' ? value : 0
                  const displayValue = key === 'cls' ? numValue.toFixed(3) : `${numValue} ms`
                  const dotColor = getMetricDot(key, numValue)
                  const valueColor = getMetricColor(key, numValue)

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                        <p className="text-xs text-[#A1A1AA] leading-tight">{label}</p>
                      </div>
                      <p className={`text-xl font-bold ${valueColor}`}>
                        {displayValue}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 5. Opportunities Section — Collapsible Accordion with Detail Tables */}
          {opportunities.length > 0 && (
            <Card>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setExpandedOpportunities(!expandedOpportunities)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#F8FAFC]">Peluang Peningkatan</h4>
                    <Badge variant="neutral">{opportunities.length}</Badge>
                  </div>
                  {expandedOpportunities
                    ? <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
                    : <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                  }
                </button>
                {expandedOpportunities && (
                  <div className="space-y-2 pt-2">
                    {opportunities.map((item, idx) => (
                      <div key={idx} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                        <button
                          onClick={() => toggleOpportunityItem(idx)}
                          className="flex items-center justify-between w-full p-3 text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                              {item.title || item.id}
                            </p>
                            {item.estimatedSavingsMs && (
                              <Badge variant="success" className="shrink-0">
                                {item.estimatedSavingsMs >= 1000
                                  ? `${(item.estimatedSavingsMs / 1000).toFixed(1)} s`
                                  : `${item.estimatedSavingsMs} ms`
                                }
                              </Badge>
                            )}
                          </div>
                          {expandedOpportunityItems[idx]
                            ? <ChevronUp className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0 ml-2" />
                            : <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0 ml-2" />
                          }
                        </button>
                        {expandedOpportunityItems[idx] && (
                          <div className="px-3 pb-3 border-t border-white/[0.04]">
                            {item.description && (
                              <p className="text-xs text-[#A1A1AA] mt-2 mb-3 leading-relaxed">{item.description}</p>
                            )}

                            {/* Metric badges */}
                            {item.badges && item.badges.length > 0 && (
                              <div className="flex gap-1.5 mb-3">
                                {item.badges.map(badge => (
                                  <Badge key={badge} variant="primary" className="text-[9px]">{badge}</Badge>
                                ))}
                              </div>
                            )}

                            {/* Resource table */}
                            {item.table && item.table.items && item.table.items.length > 0 && (
                              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                {/* Table header */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-semibold text-[#71717A] uppercase tracking-wider bg-white/[0.01] border-b border-white/[0.04]">
                                  {item.table.headings.slice(0, 3).map((h, hIdx) => (
                                    <div key={h.key} className={hIdx === 0 ? 'col-span-6' : 'col-span-3'}>
                                      {h.label}
                                    </div>
                                  ))}
                                </div>
                                {/* Table rows */}
                                <div className="divide-y divide-white/[0.04]">
                                  {item.table.items.slice(0, 10).map((row, rIdx) => (
                                    <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 py-2 text-xs hover:bg-white/[0.02]">
                                      <div className="sm:col-span-6 min-w-0">
                                        {row.origin && (
                                          <span className="text-[#71717A] mr-1">{row.origin}</span>
                                        )}
                                        <span className="text-[#A1A1AA] truncate block" title={row.url || ''}>
                                          {row.displayUrl || row.url || row.statistic || row[item.table.headings?.[0]?.key] || '-'}
                                        </span>
                                      </div>
                                      {item.table.headings.slice(1, 3).map((h) => (
                                        <div key={h.key} className="sm:col-span-3 text-[#A1A1AA]">
                                          {row[h.key + 'Formatted'] || row[h.key] || '-'}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                  {item.table.items.length > 10 && (
                                    <div className="px-3 py-2 text-[10px] text-[#71717A] text-center">
                                      +{item.table.items.length - 10} item lainnya
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 6. Diagnostics Section — Collapsible Accordion with Detail Tables */}
          {diagnostics.length > 0 && (
            <Card>
              <CardContent className="space-y-3">
                <button
                  onClick={() => setExpandedDiagnostics(!expandedDiagnostics)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#F8FAFC]">Diagnostik</h4>
                    <Badge variant="neutral">{diagnostics.length}</Badge>
                  </div>
                  {expandedDiagnostics
                    ? <ChevronUp className="w-4 h-4 text-[#A1A1AA]" />
                    : <ChevronDown className="w-4 h-4 text-[#A1A1AA]" />
                  }
                </button>
                {expandedDiagnostics && (
                  <div className="space-y-2 pt-2">
                    {diagnostics.map((item, idx) => (
                      <div key={idx} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                        <button
                          onClick={() => toggleDiagnosticItem(idx)}
                          className="flex items-center justify-between w-full p-3 text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-semibold text-[#F8FAFC] truncate">
                              {item.title || item.id}
                            </p>
                            {item.details && (
                              <Badge variant="neutral" className="shrink-0">
                                {item.details}
                              </Badge>
                            )}
                          </div>
                          {expandedDiagnosticItems[idx]
                            ? <ChevronUp className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0 ml-2" />
                            : <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0 ml-2" />
                          }
                        </button>
                        {expandedDiagnosticItems[idx] && (
                          <div className="px-3 pb-3 border-t border-white/[0.04]">
                            {item.description && (
                              <p className="text-xs text-[#A1A1AA] mt-2 mb-3 leading-relaxed">{item.description}</p>
                            )}

                            {/* Metric badges */}
                            {item.badges && item.badges.length > 0 && (
                              <div className="flex gap-1.5 mb-3">
                                {item.badges.map(badge => (
                                  <Badge key={badge} variant="primary" className="text-[9px]">{badge}</Badge>
                                ))}
                              </div>
                            )}

                            {/* Resource table */}
                            {item.table && item.table.items && item.table.items.length > 0 && (
                              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                                {/* Table header */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-semibold text-[#71717A] uppercase tracking-wider bg-white/[0.01] border-b border-white/[0.04]">
                                  {item.table.headings.slice(0, 3).map((h, hIdx) => (
                                    <div key={h.key} className={hIdx === 0 ? 'col-span-6' : 'col-span-3'}>
                                      {h.label}
                                    </div>
                                  ))}
                                </div>
                                {/* Table rows */}
                                <div className="divide-y divide-white/[0.04]">
                                  {item.table.items.slice(0, 10).map((row, rIdx) => (
                                    <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-3 py-2 text-xs hover:bg-white/[0.02]">
                                      <div className="sm:col-span-6 min-w-0">
                                        {row.origin && (
                                          <span className="text-[#71717A] mr-1">{row.origin}</span>
                                        )}
                                        <span className="text-[#A1A1AA] truncate block" title={row.url || ''}>
                                          {row.displayUrl || row.url || row.statistic || row[item.table.headings?.[0]?.key] || '-'}
                                        </span>
                                      </div>
                                      {item.table.headings.slice(1, 3).map((h) => (
                                        <div key={h.key} className="sm:col-span-3 text-[#A1A1AA]">
                                          {row[h.key + 'Formatted'] || row[h.key] || '-'}
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                  {item.table.items.length > 10 && (
                                    <div className="px-3 py-2 text-[10px] text-[#71717A] text-center">
                                      +{item.table.items.length - 10} item lainnya
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 7. Recommendations Section */}
          {recommendations.length > 0 && (
            <Card>
              <CardContent className="space-y-4">
                <h4 className="text-sm font-bold text-[#F8FAFC]">Rekomendasi</h4>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#F8FAFC]">{rec.title || rec.id}</p>
                        {getImpactBadge(rec.impact)}
                      </div>
                      {rec.description && (
                        <p className="text-xs text-[#A1A1AA] leading-relaxed">{rec.description}</p>
                      )}
                      {rec.steps && rec.steps.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          {rec.steps.map((step, sIdx) => (
                            <li key={sIdx} className="text-xs text-[#A1A1AA] leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 8. Scan Another URL Button */}
          <Button
            onClick={() => {
              stopPolling()
              setSubmitError(null)
              setExpandedOpportunities(false)
              setExpandedDiagnostics(false)
              setExpandedOpportunityItems({})
              setExpandedDiagnosticItems({})
            }}
            variant="secondary"
            size="sm"
          >
            Scan URL Lain
          </Button>
        </div>
      )}
    </div>
  )
}
