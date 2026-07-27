import React, { useState, useEffect } from 'react'
import { Settings, Cpu, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { appConfig } from '../constants/appConfig'

export default function SettingsPage() {
  const { getAuthHeader } = useAuth()

  // Active Tab state (System Engine, Scanner Configs, Maintenance)
  const [activeTab, setActiveTab] = useState('engine')

  // Configurations state
  const [performanceProvider, setPerformanceProvider] = useState('pagespeed')
  const [pageSpeedApiKey, setPageSpeedApiKey] = useState('')
  const [pageSpeedStrategy, setPageSpeedStrategy] = useState('mobile')
  const [maxConcurrentScans, setMaxConcurrentScans] = useState(2)
  const [scanStaleAfterMinutes, setScanStaleAfterMinutes] = useState(30)
  const [maxRepoSizeMb, setMaxRepoSizeMb] = useState(200)
  const [scanOutputMaxAgeDays, setScanOutputMaxAgeDays] = useState(7)
  const [allowedOrigins, setAllowedOrigins] = useState('')

  // UI status
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('success')
  const [showToast, setShowToast] = useState(false)

  const showFeedback = (message, type = 'success') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  // Load Settings on mount
  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/settings`, {
        headers: getAuthHeader()
      })
      const data = await response.json()
      if (response.ok && data.success) {
        const config = data.data
        setPerformanceProvider(config.performanceProvider || 'pagespeed')
        setPageSpeedApiKey(config.pageSpeedApiKey || '')
        setPageSpeedStrategy(config.pageSpeedStrategy || 'mobile')
        setMaxConcurrentScans(config.maxConcurrentScans || 2)
        setScanStaleAfterMinutes(config.scanStaleAfterMinutes || 30)
        setMaxRepoSizeMb(config.maxRepoSizeMb || 200)
        setScanOutputMaxAgeDays(config.scanOutputMaxAgeDays || 7)
        setAllowedOrigins(config.allowedOrigins || '')
      } else {
        throw new Error(data.error?.message || 'Gagal memuat konfigurasi.')
      }
    } catch (err) {
      console.error(err)
      showFeedback('Gagal memuat pengaturan sistem.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          performanceProvider,
          pageSpeedApiKey,
          pageSpeedStrategy,
          maxConcurrentScans: parseInt(maxConcurrentScans, 10),
          scanStaleAfterMinutes: parseInt(scanStaleAfterMinutes, 10),
          maxRepoSizeMb: parseInt(maxRepoSizeMb, 10),
          scanOutputMaxAgeDays: parseInt(scanOutputMaxAgeDays, 10),
          allowedOrigins
        })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Gagal menyimpan pengaturan.')
      }

      showFeedback('Pengaturan sistem berhasil disimpan.')
    } catch (err) {
      showFeedback(err.message, 'error')
    } finally {
      setSaveLoading(false)
    }
  }

  // Clear Storage Snapshots & Workspaces (Maintenance Zone)
  const handleStorageCleanup = async () => {
    const confirmed = window.confirm(
      'PERINGATAN: Tindakan ini akan menghapus seluruh data scan, snapshot website yang diunduh, file ZIP, serta log di dalam sandbox. Tindakan ini tidak dapat dibatalkan. Lanjutkan?'
    )
    if (!confirmed) return

    setCleanupLoading(true)
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/settings/cleanup`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Gagal melakukan pembersihan.')
      }

      showFeedback(data.message || 'Penyimpanan sandbox berhasil dibersihkan.')
    } catch (err) {
      showFeedback(err.message, 'error')
    } finally {
      setCleanupLoading(false)
    }
  }

  const tabs = [
    { id: 'engine', label: 'System Engine', icon: Cpu },
    { id: 'scanner', label: 'Scanner Configs', icon: Settings },
    { id: 'maintenance', label: 'Maintenance', icon: HardDrive }
  ]

  return (
    <>
      <div className="space-y-6">
        
        {/* Page Header */}
        <div className="select-none flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight font-sans">
              System Settings
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Configure system parameters, performance API keys, storage bounds, and runtime limits.
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
            className="text-neutral-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-white/5 gap-6 select-none">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
                  active 
                    ? 'border-blue-500 text-white font-bold' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content Box */}
        {loading ? (
          <div className="py-20 text-center text-xs font-mono text-neutral-500 bg-[#0f111a] border border-white/5 rounded-xl">
            Memuat konfigurasi sistem...
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {/* Tab: System Engine */}
            {activeTab === 'engine' && (
              <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 space-y-5">
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans border-b border-white/5 pb-3">
                  Core Runtime Configurations
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="concurrent" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Max Concurrent Scans
                    </label>
                    <input
                      id="concurrent"
                      type="number"
                      value={maxConcurrentScans}
                      onChange={(e) => setMaxConcurrentScans(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      min="1"
                      max="10"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Jumlah maksimum pindaian keamanan (Lighthouse/CodeQL) yang dapat berjalan bersamaan di latar belakang.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="origins" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      CORS Allowed Origins
                    </label>
                    <input
                      id="origins"
                      type="text"
                      value={allowedOrigins}
                      onChange={(e) => setAllowedOrigins(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      placeholder="e.g. http://localhost:5173, https://casaatools.my.id"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Daftar origin CORS yang diizinkan untuk mengakses backend server ini (pisahkan dengan koma).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="staletime" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Scan Stale Timeout (Minutes)
                    </label>
                    <input
                      id="staletime"
                      type="number"
                      value={scanStaleAfterMinutes}
                      onChange={(e) => setScanStaleAfterMinutes(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      min="5"
                      max="120"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Batas waktu menit sebelum status scan yang menggantung (hang) dipaksa gagal secara otomatis.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="reposize" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Max Scan Repository Size (MB)
                    </label>
                    <input
                      id="reposize"
                      type="number"
                      value={maxRepoSizeMb}
                      onChange={(e) => setMaxRepoSizeMb(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      min="10"
                      max="1000"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Ukuran zip repositori maksimum yang diizinkan untuk diunggah dan dianalisis oleh CodeQL.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Scanner Configs */}
            {activeTab === 'scanner' && (
              <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 space-y-5">
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans border-b border-white/5 pb-3">
                  Google PageSpeed Insights & Performance Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="provider" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Performance Scanner Engine
                    </label>
                    <select
                      id="provider"
                      value={performanceProvider}
                      onChange={(e) => setPerformanceProvider(e.target.value)}
                      className="w-full bg-[#12131e] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="pagespeed">Google PageSpeed Insights API (Cloud)</option>
                      <option value="lighthouse">Local Headless Lighthouse Engine (Server)</option>
                    </select>
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Metode yang digunakan untuk mengambil metrik Core Web Vitals (PSI disarankan untuk efisiensi RAM).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="strategy" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      PageSpeed Scan Strategy
                    </label>
                    <select
                      id="strategy"
                      value={pageSpeedStrategy}
                      onChange={(e) => setPageSpeedStrategy(e.target.value)}
                      className="w-full bg-[#12131e] border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    >
                      <option value="mobile">Mobile (Simulate average mobile connection)</option>
                      <option value="desktop">Desktop (Simulate broadband connection)</option>
                    </select>
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Emulator device yang digunakan untuk menjalankan audit rendering kecepatan.
                    </p>
                  </div>
                </div>

                {performanceProvider === 'pagespeed' && (
                  <div className="space-y-1.5 pt-2">
                    <label htmlFor="psikey" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      PageSpeed API Key
                    </label>
                    <input
                      id="psikey"
                      type="password"
                      value={pageSpeedApiKey}
                      onChange={(e) => setPageSpeedApiKey(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      placeholder={pageSpeedApiKey ? '••••••••••••••••••••' : 'Enter your PageSpeed Google Cloud Key'}
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Kunci API dari Google Developer Console untuk menghindari limitasi batasan pemanggilan kuota PSI.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Maintenance & File Cleanups */}
            {activeTab === 'maintenance' && (
              <div className="bg-[#0f111a] border border-white/5 rounded-xl p-6 space-y-6">
                
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans border-b border-white/5 pb-3">
                    Retention & Cleanup Policies
                  </h3>

                  <div className="space-y-1.5 max-w-md">
                    <label htmlFor="maxdays" className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                      Log Retention Policy (Days)
                    </label>
                    <input
                      id="maxdays"
                      type="number"
                      value={scanOutputMaxAgeDays}
                      onChange={(e) => setScanOutputMaxAgeDays(e.target.value)}
                      className="w-full bg-[#12131e]/50 border border-white/5 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                      min="1"
                      max="30"
                    />
                    <p className="text-[10px] text-neutral-500 leading-normal font-sans">
                      Batas waktu dalam hari sebelum data snapshot website dan log scanner dihapus otomatis oleh pembersih berkala.
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-6 space-y-4">
                  <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 select-none">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide font-sans">
                        Danger Zone: Reset Sandbox Cache
                      </h4>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                        Tindakan di bawah ini akan segera menghapus seluruh folder snapshot yang diunduh (`./output/job_*`) dan menghapus seluruh repositori kerja CodeQL. Tautan preview pada hasil scan sebelumnya akan rusak.
                      </p>
                      
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="danger"
                          loading={cleanupLoading}
                          onClick={handleStorageCleanup}
                          className="bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900 hover:text-white rounded-xl px-4 py-2 text-xs font-semibold"
                        >
                          Clear All Snapshots & Logs
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Action buttons (only show if not on maintenance) */}
            {activeTab !== 'maintenance' && (
              <div className="flex justify-end select-none">
                <Button
                  type="submit"
                  loading={saveLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-semibold shadow-lg shadow-blue-500/10"
                >
                  Save Configurations
                </Button>
              </div>
            )}

          </form>
        )}

      </div>

      {/* Toast notifications */}
      <Toast
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  )
}
