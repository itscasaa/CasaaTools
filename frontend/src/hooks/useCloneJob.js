import { useState, useCallback, useRef } from 'react'
import { cloneApi } from '../services/cloneApi'
import { jobApi } from '../services/jobApi'
import { usePolling } from './usePolling'

/**
 * Custom React hook to manage submitting a URL for cloning,
 * polling the status of the job, and storing the real-time job progress.
 */
export function useCloneJob() {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [errorCode, setErrorCode] = useState(null)
  const [activeJobId, setActiveJobId] = useState(null)
  const submitLocked = useRef(false)

  const pollCallback = useCallback(async () => {
    if (!activeJobId) return

    try {
      const jobData = await jobApi.getJob(activeJobId)
      
      const isDone = jobData.status === 'completed' || jobData.status === 'done'
      
      setJob({
        jobId: jobData.jobId,
        status: isDone ? 'completed' : jobData.status,
        url: jobData.url,
        mode: jobData.mode || 'offline-package',
        title: jobData.title,
        progress: jobData.progress || 0,
        currentStep: jobData.currentStep || 'Queued',
        logs: jobData.logs || [],
        error: jobData.error,
        metadata: isDone ? {
          title: jobData.title,
          mode: jobData.mode || 'offline-package',
          totalSize: jobData.assetSummary?.totalSizeBytes || 0,
          assetCount: jobData.assetSummary?.total || 0,
          screenshotPath: jobApi.getScreenshotUrl(jobData.jobId),
          assetSummary: jobData.assetSummary,
          rewrite: jobData.rewrite,
          intelligence: jobData.intelligence,
          visualCompare: jobData.visualCompare,
          files: jobData.files
        } : null
      })

      if (isDone) {
        setActiveJobId(null)
        setLoading(false)
        submitLocked.current = false
      } else if (jobData.status === 'failed') {
        setError(jobData.error?.message || 'Rebuild job failed.')
        setErrorCode(jobData.error?.code || null)
        setActiveJobId(null)
        setLoading(false)
        submitLocked.current = false
      }
    } catch (e) {
      setError(e.message || 'Error polling job status.')
      setErrorCode(e.code || null)
      setActiveJobId(null)
      setLoading(false)
      submitLocked.current = false
    }
  }, [activeJobId])

  // Hook to handle recurring polling interval (2000ms delay instead of 1000ms)
  usePolling(pollCallback, 2000, !!activeJobId)

  const startClone = useCallback(async (url, options = {}) => {
    if (submitLocked.current) return
    submitLocked.current = true
    setLoading(true)
    setError(null)
    setJob(null)
    setActiveJobId(null)
    
    try {
      const response = await cloneApi.submitCloneJob(url, options)
      
      if (response.success && response.data) {
        const data = response.data
        
        const initialJob = {
          jobId: data.jobId,
          status: data.status || 'queued',
          url: data.url,
          mode: data.mode || 'offline-package',
          title: null,
          progress: data.progress || 0,
          currentStep: data.currentStep || 'Queued',
          logs: [],
          metadata: null
        }
        
        setJob(initialJob)
        setActiveJobId(data.jobId)
      } else {
        setError(response.message || 'Failed to submit URL for rebuilding.')
        setErrorCode(response.error?.code || response.code || null)
        setLoading(false)
        submitLocked.current = false
      }
    } catch (e) {
      setError(e.message || 'An unexpected error occurred.')
      setErrorCode(e.code || null)
      setLoading(false)
      submitLocked.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setJob(null)
    setError(null)
    setErrorCode(null)
    setLoading(false)
    setActiveJobId(null)
    submitLocked.current = false
  }, [])

  return {
    job,
    loading,
    error,
    errorCode,
    startClone,
    reset
  }
}
