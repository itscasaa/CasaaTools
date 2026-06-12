import React, { useState, useCallback } from 'react'
import {
  Play, XCircle, AlertTriangle, Loader2, Shield,
  ChevronDown, ChevronUp, Upload
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

const SEVERITY_LABELS = {
  critical: 'Kritis',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
  info: 'Informasi'
}

const SEVERITY_VARIANTS = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'neutral',
  info: 'primary'
}

export default function SecurityTab() {
  const [sourceType, setSourceType] = useState('demo')
  const [selectedFile, setSelectedFile] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [expandedFinding, setExpandedFinding] = useState(null)

  const { scanData, isPolling, error: pollError, startPolling, stopPolling, retryPolling } = useScanPolling()

  const isScanning = isPolling || submitting
  const scanCompleted = scanData?.status === 'completed'
  const scanFailed = scanData?.status === 'failed' || scanData?.status === 'timeout'

  const handleStartScan = useCallback(async () => {
    setSubmitError(null)
    setSubmitting(true)

    try {
      let result
      if (sourceType === 'zip') {
        if (!selectedFile) {
          setSubmitError('Pilih file ZIP terlebih dahulu.')
          setSubmitting(false)
          return
        }
        if (selectedFile.size > 100 * 1024 * 1024) {
          setSubmitError('Ukuran file melebihi batas 100MB.')
          setSubmitting(false)
          return
        }
        result = await scanApi.startCodeqlZipScan(selectedFile)
      } else {
        result = await scanApi.startCodeqlScan({ sourceType })
      }

      const scanId = result.data?.scanId || result.scanId
      if (scanId) {
        startPolling(scanId)
      }
    } catch (err) {
      setSubmitError(err.message || 'Gagal memulai pemindaian keamanan.')
    } finally {
      setSubmitting(false)
    }
  }, [sourceType, selectedFile, startPolling])

  const handleCancel = useCallback(async () => {
    if (scanData?.scanId) {
      try {
        await scanApi.cancelScan(scanData.scanId)
      } catch {
        // ignore
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
  const findings = results.findings || []
  const summary = results.summary || {}
  const isDemo = scanData?.isDemo || scanData?.demo
  const progressValue = scanData?.progress || 0

  const severityCounts = summary.bySeverity || {}

  return (
    <div className="space-y-6">
      {/* Input Section */}
      {!isScanning && !scanCompleted && !scanFailed && (
        <Card>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#F8FAFC] mb-2">
                Sumber Kode
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/[0.08] px-4 py-3 rounded-xl text-sm text-[#F8FAFC] outline-none focus:border-[#6D5DFB] focus:ring-4 focus:ring-[#6D5DFB]/20 transition-all duration-300"
              >
                <option value="demo" className="bg-[#0A0A16]">Demo Mode</option>
                <option value="zip" className="bg-[#0A0A16]">Upload ZIP Project</option>
                <option value="github" className="bg-[#0A0A16]" disabled>GitHub Repository (Coming Soon)</option>
                <option value="workspace" className="bg-[#0A0A16]" disabled>Workspace Terdaftar (Coming Soon)</option>
              </select>
            </div>

            {sourceType === 'demo' && (
              <p className="text-xs text-[#A1A1AA]">
                Menjalankan pemindaian keamanan dengan data sampel untuk demonstrasi.
              </p>
            )}

            {sourceType === 'zip' && (
              <div className="space-y-3">
                {/* File input */}
                <div className="relative">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-[#A1A1AA] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border file:border-white/[0.08] file:bg-white/[0.03] file:text-sm file:font-semibold file:text-[#F8FAFC] hover:file:bg-white/[0.06] cursor-pointer"
                  />
                </div>

                {/* Show file info */}
                {selectedFile && (
                  <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                    <span>📦 {selectedFile.name}</span>
                    <span>({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    {selectedFile.size > 100 * 1024 * 1024 && (
                      <Badge variant="error">Melebihi batas 100MB</Badge>
                    )}
                  </div>
                )}

                {/* Security info */}
                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-1.5">
                  <p className="text-xs text-blue-400 font-semibold">ℹ️ Informasi Keamanan</p>
                  <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                    Upload ZIP hanya digunakan untuk project milik sendiri atau yang Anda punya izin untuk audit.
                    Jangan upload project yang berisi file rahasia seperti .env, private key, token API, atau credential.
                    Scanner tidak menjalankan npm install atau script project. File ZIP diproses di sandbox backend.
                  </p>
                </div>
              </div>
            )}

            {sourceType === 'github' && (
              <div className="space-y-2">
                <Input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  disabled
                />
                <Badge variant="neutral">Coming Soon</Badge>
                <p className="text-xs text-[#A1A1AA]">
                  Fitur scan repository GitHub akan segera tersedia.
                </p>
              </div>
            )}

            {sourceType === 'workspace' && (
              <div className="space-y-2">
                <select
                  disabled
                  className="w-full bg-white/[0.02] border border-white/[0.08] px-4 py-3 rounded-xl text-sm text-[#71717A] outline-none opacity-40 cursor-not-allowed"
                >
                  <option>Pilih workspace...</option>
                </select>
                <Badge variant="neutral">Coming Soon</Badge>
                <p className="text-xs text-[#A1A1AA]">
                  Fitur scan workspace akan segera tersedia.
                </p>
              </div>
            )}

            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs text-rose-400">{submitError}</p>
              </div>
            )}

            <Button
              onClick={handleStartScan}
              disabled={sourceType === 'github' || sourceType === 'workspace' || (sourceType === 'zip' && !selectedFile)}
              loading={submitting}
              variant="primary"
              className="w-full sm:w-auto"
            >
              {sourceType === 'zip' ? <Upload className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {sourceType === 'demo' ? 'Jalankan Demo' : sourceType === 'zip' ? 'Upload & Scan ZIP' : 'Mulai Scan'}
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

            <Button onClick={handleCancel} variant="danger" size="sm">
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

      {/* Results */}
      {scanCompleted && (
        <div className="space-y-6">
          {/* Demo Badge */}
          {isDemo && (
            <Badge variant="warning">Mode Demo</Badge>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-white/[0.02]">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold text-[#F8FAFC]">{summary.total || findings.length}</p>
                <p className="text-[10px] text-[#A1A1AA] mt-0.5">Total</p>
              </CardContent>
            </Card>
            {['critical', 'high', 'medium', 'low', 'info'].map((sev) => {
              const count = severityCounts[sev] || 0
              const colors = {
                critical: 'text-rose-400',
                high: 'text-rose-400',
                medium: 'text-amber-400',
                low: 'text-[#A1A1AA]',
                info: 'text-blue-400'
              }
              return (
                <Card key={sev} className="bg-white/[0.02]">
                  <CardContent className="p-3 text-center">
                    <p className={`text-2xl font-bold ${colors[sev]}`}>{count}</p>
                    <p className="text-[10px] text-[#A1A1AA] mt-0.5">{SEVERITY_LABELS[sev]}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Findings */}
          {findings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#F8FAFC]">
                  Tidak ditemukan kerentanan pada kode sumber
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-1 p-4">
                <h4 className="text-sm font-bold text-[#F8FAFC] mb-3">
                  Temuan Keamanan ({findings.length})
                </h4>

                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider border-b border-white/[0.06]">
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-2">Rule</div>
                  <div className="col-span-3">File</div>
                  <div className="col-span-1">Line</div>
                  <div className="col-span-4">Message</div>
                </div>

                {/* Findings List */}
                <div className="space-y-1">
                  {findings.map((finding, idx) => {
                    const isExpanded = expandedFinding === idx
                    return (
                      <div key={idx} className="rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          onClick={() => setExpandedFinding(isExpanded ? null : idx)}
                          className="w-full px-3 py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-left hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="sm:col-span-2">
                            <Badge variant={SEVERITY_VARIANTS[finding.severity] || 'neutral'}>
                              {SEVERITY_LABELS[finding.severity] || finding.severity}
                            </Badge>
                          </div>
                          <div className="sm:col-span-2 text-xs text-[#F8FAFC] font-mono truncate">
                            {finding.ruleId || finding.rule || '-'}
                          </div>
                          <div className="sm:col-span-3 text-xs text-[#A1A1AA] truncate">
                            {finding.filePath || finding.file || '-'}
                          </div>
                          <div className="sm:col-span-1 text-xs text-[#A1A1AA]">
                            {finding.line || '-'}
                          </div>
                          <div className="sm:col-span-4 flex items-center justify-between gap-2">
                            <span className="text-xs text-[#A1A1AA] truncate">
                              {finding.message || '-'}
                            </span>
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                              : <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                            }
                          </div>
                        </button>

                        {/* Expanded Detail */}
                        {isExpanded && (
                          <div className="px-4 py-3 border-t border-white/[0.06] bg-black/20 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Rule ID</p>
                                <p className="text-xs text-[#F8FAFC] font-mono mt-0.5">{finding.ruleId || finding.rule || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Severity</p>
                                <p className="text-xs text-[#F8FAFC] mt-0.5">{SEVERITY_LABELS[finding.severity] || finding.severity}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">File</p>
                                <p className="text-xs text-[#F8FAFC] font-mono mt-0.5">{finding.filePath || finding.file || '-'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Line</p>
                                <p className="text-xs text-[#F8FAFC] mt-0.5">{finding.line || '-'}</p>
                              </div>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Message</p>
                              <p className="text-xs text-[#F8FAFC] mt-0.5">{finding.message || '-'}</p>
                            </div>

                            {finding.recommendation && (
                              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-2">
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-semibold">Rekomendasi</p>
                                {finding.recommendation.description && (
                                  <p className="text-xs text-[#F8FAFC]">{finding.recommendation.description}</p>
                                )}
                                {finding.recommendation.impact && (
                                  <p className="text-xs text-amber-400">Dampak: {finding.recommendation.impact}</p>
                                )}
                                {finding.recommendation.mitigation && (
                                  <p className="text-xs text-emerald-400">Mitigasi: {finding.recommendation.mitigation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Again */}
          <Button
            onClick={() => {
              stopPolling()
              setSubmitError(null)
              setSelectedFile(null)
            }}
            variant="secondary"
            size="sm"
          >
            Scan Lagi
          </Button>
        </div>
      )}
    </div>
  )
}
