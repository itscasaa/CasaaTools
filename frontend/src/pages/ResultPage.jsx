import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Cpu } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ToolShell from '../components/tool/ToolShell'
import CloneProgress from '../components/tool/CloneProgress'
import ProcessTimeline from '../components/tool/ProcessTimeline'
import DownloadCard from '../components/result/DownloadCard'
import ResultPanel from '../components/result/ResultPanel'
import { jobApi } from '../services/jobApi'
import { Button } from '../components/ui/Button'
import { usePolling } from '../hooks/usePolling'

export default function ResultPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(true)

  const fetchStatus = async () => {
    try {
      const data = await jobApi.getJobStatus(jobId)
      setJob(data)
      if (data.status === 'completed' || data.status === 'failed') {
        setPolling(false)
      }
    } catch (e) {
      setError(e.message || 'Failed to locate job.')
      setPolling(false)
    }
  }

  useEffect(() => {
    if (jobId) {
      fetchStatus()
    }
  }, [jobId])

  usePolling(fetchStatus, 1500, polling && !!jobId)

  return (
    <div className="min-h-screen bg-radial-grid flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>

        {error && (
          <div className="p-6 text-center max-w-md mx-auto bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl space-y-4">
            <h3 className="font-bold">Rebuild Job Not Found</h3>
            <p className="text-xs text-gray-400">The requested job reference '{jobId}' does not exist or has expired.</p>
            <Link to="/dashboard">
              <Button size="sm" variant="outline">Return Dashboard</Button>
            </Link>
          </div>
        )}

        {job && (
          <ToolShell title="Snapshot Details View" description={`Job Reference: ${job.jobId}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                <CloneProgress progress={job.progress} currentStep={job.currentStep} />
                <ProcessTimeline logs={job.logs} currentStep={job.currentStep} />
              </div>
              <div className="lg:col-span-8 space-y-6">
                {job.status === 'completed' ? (
                  <>
                    <DownloadCard job={job} />
                    <ResultPanel job={job} />
                  </>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-black/20">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <h3 className="text-base font-bold text-white">Compiling Static Files</h3>
                    <p className="text-xs text-muted max-w-xs mt-2">Please stand by...</p>
                  </div>
                )}
              </div>
            </div>
          </ToolShell>
        )}
      </main>

      <Footer />
    </div>
  )
}