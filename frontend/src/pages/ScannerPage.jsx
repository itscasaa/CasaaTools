import React, { useState } from 'react'
import { Gauge, Shield, History, ShieldAlert } from 'lucide-react'

import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import PerformanceTab from '../components/scanner/PerformanceTab'
import SecurityTab from '../components/scanner/SecurityTab'
import HistoryTab from '../components/scanner/HistoryTab'
import ZapSecurityScanPanel from '../components/scanner/ZapSecurityScanPanel'

const SCANNER_TABS = [
  { id: 'performance', label: 'Performance Scanner', icon: <Gauge className="w-4 h-4" /> },
  { id: 'security', label: 'Security Scanner (MT)', icon: <Shield className="w-4 h-4" /> },
  { id: 'zap-scan', label: 'OWASP ZAP Scan (MT)', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'history', label: 'Riwayat Scan', icon: <History className="w-4 h-4" /> }
]

export default function ScannerPage() {
  const [activeTab, setActiveTab] = useState('performance')

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center mb-8 select-none">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight">
            Security & Performance Scanner
          </h1>
          <p className="mt-3 text-sm text-[#A1A1AA] max-w-xl mx-auto">
            Cek performa website dan keamanan source code dalam satu tempat.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <Badge variant="primary">Lighthouse</Badge>
            <Badge variant="secondary">CodeQL</Badge>
            <Badge variant="neutral">OWASP ZAP</Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          tabs={SCANNER_TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-6 select-none"
        />

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'zap-scan' && <ZapSecurityScanPanel />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </>
  )
}
