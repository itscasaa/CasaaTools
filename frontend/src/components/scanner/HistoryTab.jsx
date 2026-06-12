import React, { useState, useEffect, useCallback } from 'react'
import {
  Gauge, Shield, Trash2, Eye, Clock, CheckCircle,
  AlertTriangle, XCircle, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import { Card, CardContent } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { scanApi } from '../../services/scanApi'

const STATUS_CONFIG = {
  completed: { label: 'Selesai', variant: 'success', icon: CheckCircle },
  failed: { label: 'Gagal', variant: 'error', icon: XCircle },
  timeout: { label: 'Waktu Habis', variant: 'warning', icon: Clock },
  cancelled: { label: 'Dibatalkan', variant: 'neutral', icon: XCircle },
  running: { label: 'Berjalan', variant: 'primary', icon: Loader2 },
  queued: { label: 'Dalam Antrean', variant: 'neutral', icon: Clock },
  stale: { label: 'Terhenti', variant: 'neutral', icon: AlertTriangle }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

export default function HistoryTab() {
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedScan, setExpandedScan] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchScans = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await scanApi.listScans({ limit: 50 })
      const list = result.data?.scans || result.scans || result.data || []
      // Sort newest first
      const sorted = [...list].sort((a, b) =>
        new Date(b.createdAt || b.startedAt || 0) - new Date(a.createdAt || a.startedAt || 0)
      )
      setScans(sorted)
    } catch (err) {
      setError(err.message || 'Gagal mengambil riwayat pemindaian.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchScans()
  }, [fetchScans])

  const handleDelete = useCallback(async (scanId) => {
    setDeleting(scanId)
    try {
      await scanApi.deleteScan(scanId)
      setScans((prev) => prev.filter((s) => s.scanId !== scanId))
      if (expandedScan === scanId) setExpandedScan(null)
    } catch (err) {
      // Show error inline but don't crash
      setError(err.message || 'Gagal menghapus pemindaian.')
    } finally {
      setDeleting(null)
    }
  }, [expandedScan])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <p className="text-sm text-[#A1A1AA]">Memuat riwayat pemindaian...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <p className="text-xs text-rose-400">{error}</p>
          </div>
          <Button onClick={fetchScans} variant="secondary" size="sm">
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (scans.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="w-10 h-10 text-[#A1A1AA] mx-auto mb-3 opacity-40" />
          <p className="text-sm font-semibold text-[#F8FAFC]">Belum ada riwayat pemindaian</p>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Mulai scan pertama Anda dari tab Performance atau Security.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {scans.map((scan) => {
        const isExpanded = expandedScan === scan.scanId
        const statusConfig = STATUS_CONFIG[scan.status] || STATUS_CONFIG.queued
        const StatusIcon = statusConfig.icon
        const isLighthouse = scan.type === 'lighthouse' || scan.scanType === 'lighthouse'
        const TypeIcon = isLighthouse ? Gauge : Shield

        return (
          <Card key={scan.scanId} className="overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-3">
                {/* Type Icon */}
                <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <TypeIcon className={`w-4 h-4 ${isLighthouse ? 'text-amber-400' : 'text-blue-400'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F8FAFC] truncate">
                    {scan.target || scan.url || scan.repoUrl || 'Demo Scan'}
                  </p>
                  <p className="text-xs text-[#A1A1AA] mt-0.5">
                    {formatDate(scan.createdAt || scan.startedAt)}
                  </p>
                </div>

                {/* Status */}
                <Badge variant={statusConfig.variant}>
                  <StatusIcon className={`w-3 h-3 ${scan.status === 'running' ? 'animate-spin' : ''}`} />
                  {statusConfig.label}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedScan(isExpanded ? null : scan.scanId)}
                    className="p-2"
                  >
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(scan.scanId)}
                    disabled={deleting === scan.scanId}
                    className="p-2 text-rose-400 hover:text-rose-300"
                  >
                    {deleting === scan.scanId
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </Button>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Tipe</p>
                      <p className="text-xs text-[#F8FAFC] mt-0.5 capitalize">
                        {scan.type || scan.scanType || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Status</p>
                      <p className="text-xs text-[#F8FAFC] mt-0.5">{statusConfig.label}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Demo</p>
                      <p className="text-xs text-[#F8FAFC] mt-0.5">
                        {scan.isDemo || scan.demo ? 'Ya' : 'Tidak'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">Scan ID</p>
                      <p className="text-xs text-[#F8FAFC] font-mono mt-0.5 truncate">{scan.scanId}</p>
                    </div>
                  </div>

                  {/* Show scores if lighthouse and completed */}
                  {isLighthouse && scan.status === 'completed' && scan.results?.scores && (
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(scan.results.scores).map(([key, val]) => (
                        <div key={key} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                          <p className="text-lg font-bold text-[#F8FAFC]">{val}</p>
                          <p className="text-[10px] text-[#A1A1AA] capitalize">{key}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Show findings count if codeql and completed */}
                  {!isLighthouse && scan.status === 'completed' && (
                    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-xs text-[#A1A1AA]">
                        Total temuan: <span className="text-[#F8FAFC] font-semibold">
                          {scan.results?.summary?.total || scan.results?.findings?.length || 0}
                        </span>
                      </p>
                    </div>
                  )}

                  {scan.error?.message && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                      <p className="text-xs text-rose-400">{scan.error.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
