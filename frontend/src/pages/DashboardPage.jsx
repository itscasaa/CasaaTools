import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Plus, Trash2, Download, TrendingUp } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { jobApi } from '../services/jobApi'

export default function DashboardPage() {
  // Local history state
  const [recentJobs, setRecentJobs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Fetch user specific jobs on mount
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      const list = await jobApi.getJobs()
      // Sort newest first
      const sorted = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setRecentJobs(sorted)
    } catch (err) {
      console.error('Gagal mengambil riwayat:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleDeleteJob = async (jobId, e) => {
    e.stopPropagation()
    if (!window.confirm('Apakah Anda yakin ingin menghapus snapshot ini?')) return
    try {
      await jobApi.deleteJob(jobId)
      fetchHistory()
    } catch (err) {
      console.error(err.message || 'Gagal menghapus snapshot.')
    }
  }

  // Stats calculation
  const totalSnapshots = recentJobs.length
  const completedJobs = recentJobs.filter(j => j.status === 'completed')
  const successfulClones = completedJobs.length
  const failedJobs = recentJobs.filter(j => j.status === 'failed').length
  const successRate = totalSnapshots > 0 ? Math.round((successfulClones / totalSnapshots) * 100) : 100
  const storageUsed = completedJobs.length > 0
    ? `${(completedJobs.length * 1.45).toFixed(1)} MB`
    : '0.0 MB'

  return (
    <>
      {/* Bento Grid Dashboard Overview */}
      <div className="space-y-6">
        
        {/* Section title & quick action button */}
        <div className="flex justify-between items-center select-none">
          <h1 className="text-xl font-bold text-white tracking-tight font-sans">
            Overview
          </h1>
          <div className="flex items-center gap-3">
            <Link to="/rebuild">
              <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs h-[36px] px-4 shadow-lg shadow-blue-500/10 transition-all select-none">
                <Plus className="w-3.5 h-3.5" />
                New Snapshot
              </Button>
            </Link>
            <div className="text-xs bg-[#12131e]/50 border border-white/5 rounded-xl px-3 py-1.5 font-semibold text-neutral-400">
              Today
            </div>
          </div>
        </div>

        {/* TOP METRIC CARDS (4 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Total Snapshots */}
          <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 space-y-1.5 relative">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans select-none">
              Total Snapshots
            </div>
            <div className="text-3xl font-semibold text-white font-sans tracking-tight">
              {totalSnapshots}
            </div>
            <div className="text-[10px] text-neutral-500 font-sans select-none">
              Recorded in local repository
            </div>
          </div>

          {/* Card 2: Success Rate */}
          <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 space-y-1.5 relative">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans select-none">
              Scan Success Rate
            </div>
            <div className="text-3xl font-semibold text-emerald-400 font-sans tracking-tight">
              {successRate}%
            </div>
            <div className="text-[10px] text-neutral-500 font-sans select-none">
              Target baseline: 95.0%
            </div>
          </div>

          {/* Card 3: Failed Snapshots */}
          <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 space-y-1.5 relative">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans select-none">
              Failed Snapshots
            </div>
            <div className="text-3xl font-semibold text-red-400 font-sans tracking-tight">
              {failedJobs}
            </div>
            <div className="text-[10px] text-neutral-500 font-sans select-none">
              Requires target inspection
            </div>
          </div>

          {/* Card 4: Sandbox Storage */}
          <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 space-y-1.5 relative">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-sans select-none">
              Sandbox Storage
            </div>
            <div className="text-3xl font-semibold text-white font-sans tracking-tight font-mono">
              {storageUsed}
            </div>
            <div className="text-[10px] text-neutral-500 font-sans select-none">
              Cached offline packages
            </div>
          </div>

        </div>

        {/* MAIN BENTO ROW (Split 8 / 4 Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left 8-col Area */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* Bento Card: Recent Snapshots list */}
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 relative">
              <div className="flex justify-between items-center mb-4 select-none">
                <div className="text-xs font-bold text-white tracking-wide font-sans uppercase">
                  Recent Snapshots
                </div>
                <Link to="/history" className="text-[10px] font-semibold text-blue-400 hover:underline">
                  View all history →
                </Link>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-xs font-mono text-neutral-500">
                  Memuat data snapshot...
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="p-8 border border-dashed border-white/5 rounded-xl text-center space-y-1">
                  <p className="text-xs text-neutral-500">Belum ada snapshot yang tersimpan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs select-none">
                    <thead>
                      <tr className="border-b border-white/[0.04] text-neutral-500 font-sans font-bold">
                        <th className="pb-2.5 font-bold uppercase tracking-wider text-[10px]">Title & URL</th>
                        <th className="pb-2.5 font-bold uppercase tracking-wider text-[10px] text-center">Status</th>
                        <th className="pb-2.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {recentJobs.slice(0, 5).map((j) => (
                        <tr key={j.jobId} className="group hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 pr-2 min-w-0 max-w-[200px] sm:max-w-xs md:max-w-md">
                            <div className="font-semibold text-white truncate">{j.title || 'Tanpa Judul'}</div>
                            <div className="text-[10px] text-neutral-500 font-mono truncate">{j.url}</div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold inline-block ${
                              j.status === 'completed' 
                                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                                : j.status === 'failed' 
                                ? 'bg-red-950/20 text-red-400 border border-red-900/30' 
                                : 'bg-blue-950/20 text-blue-400 border border-blue-900/30'
                            }`}>
                              {j.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Link 
                                to={`/result/${j.jobId}`}
                                className="p-1 text-[#6D5DFB] hover:text-[#8B5CF6] transition-colors"
                                title="View Result"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              {j.status === 'completed' && (
                                <a 
                                  href={jobApi.getDownloadUrl(j.jobId)}
                                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                                  title="Download ZIP"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button 
                                onClick={(e) => handleDeleteJob(j.jobId, e)}
                                className="p-1 text-neutral-600 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right 4-col Area */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* Bento Card 3: System Environment Status */}
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 relative space-y-4">
              <div className="text-[10px] font-bold text-neutral-400 tracking-wide font-sans uppercase select-none">
                System Environment
              </div>
              
              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                  <span className="text-neutral-500 font-medium">Browser Engine</span>
                  <span className="text-white font-mono text-[11px] font-medium bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                    Playwright Headless
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                  <span className="text-neutral-500 font-medium">Security Scanner</span>
                  <span className="text-white font-mono text-[11px] font-medium bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                    CodeQL v2.17.5
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                  <span className="text-neutral-500 font-medium">DAST Engine</span>
                  <span className="text-white font-mono text-[11px] font-medium bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                    OWASP ZAP
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-neutral-500 font-medium">System Status</span>
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active / Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Bento Card 4: Sandbox Quotas */}
            <div className="bg-[#0f111a] border border-white/5 rounded-xl p-5 relative space-y-4">
              <div className="text-[10px] font-bold text-neutral-400 tracking-wide font-sans uppercase select-none">
                Sandbox Quota
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-neutral-500">
                    <span>Sandbox Usage</span>
                    <span className="text-white font-semibold font-mono">{storageUsed} / 50.0 MB</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-white/[0.03] rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (completedJobs.length * 1.45 / 50) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-white/[0.03] text-[11px]">
                  <span className="text-neutral-500">Auto Cleanup</span>
                  <span className="text-white font-medium">Enabled (Hourly)</span>
                </div>

                <div className="flex items-center justify-between py-1 text-[11px]">
                  <span className="text-neutral-500">Retention Policy</span>
                  <span className="text-white font-medium">24 Hours max</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </>
  )
}
