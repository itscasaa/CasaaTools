import { useState, useCallback, useRef } from 'react'
import { usePolling } from './usePolling'
import { scanApi } from '../services/scanApi'

const TERMINAL_STATES = ['completed', 'failed', 'timeout', 'cancelled', 'stale']
const MAX_POLL_DURATION_MS = 300000 // 5 minutes
const MAX_CONSECUTIVE_FAILURES = 3
const POLL_INTERVAL_MS = 1000

export function useScanPolling() {
  const [scanData, setScanData] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState(null)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  const scanIdRef = useRef(null)
  const startTimeRef = useRef(null)

  const pollFn = useCallback(async () => {
    if (!scanIdRef.current) return

    // Check max duration
    if (Date.now() - startTimeRef.current > MAX_POLL_DURATION_MS) {
      setIsPolling(false)
      setError('Polling timeout: pemindaian memakan waktu terlalu lama.')
      return
    }

    // Check consecutive failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      setIsPolling(false)
      setError('Koneksi terputus setelah beberapa percobaan gagal.')
      return
    }

    try {
      const result = await scanApi.getScan(scanIdRef.current)
      const scan = result.data || result.scan || result

      setScanData(scan)
      setConsecutiveFailures(0)
      setError(null)

      // Stop on terminal states
      if (scan.status && TERMINAL_STATES.includes(scan.status)) {
        setIsPolling(false)
      }
    } catch (err) {
      setConsecutiveFailures((prev) => {
        const next = prev + 1
        if (next >= MAX_CONSECUTIVE_FAILURES) {
          setIsPolling(false)
          setError('Koneksi terputus setelah beberapa percobaan gagal.')
        }
        return next
      })
    }
  }, [consecutiveFailures])

  usePolling(pollFn, POLL_INTERVAL_MS, isPolling)

  const startPolling = useCallback((scanId) => {
    scanIdRef.current = scanId
    startTimeRef.current = Date.now()
    setConsecutiveFailures(0)
    setError(null)
    setScanData(null)
    setIsPolling(true)
  }, [])

  const stopPolling = useCallback(() => {
    setIsPolling(false)
  }, [])

  const retryPolling = useCallback(() => {
    if (!scanIdRef.current) return
    setConsecutiveFailures(0)
    setError(null)
    startTimeRef.current = Date.now()
    setIsPolling(true)
  }, [])

  return {
    scanData,
    isPolling,
    error,
    startPolling,
    stopPolling,
    retryPolling
  }
}
