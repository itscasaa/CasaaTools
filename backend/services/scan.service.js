import { scannerConfig } from '../config/scanner.config.js'
import { generateScanId } from '../utils/scan-id.js'
import { translateStatus } from '../utils/scanner-translations.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'

/**
 * In-memory store for scan jobs.
 * @type {Map<string, object>}
 */
const scanJobs = new Map()

/**
 * Active statuses — jobs counted towards concurrency limit.
 */
const ACTIVE_STATUSES = ['validating', 'preparing', 'running', 'analyzing', 'parsing']

/**
 * Terminal statuses — jobs that cannot be cancelled.
 */
const TERMINAL_STATUSES = ['completed', 'failed', 'timeout', 'cancelled', 'stale']

/**
 * Cancellable statuses — jobs that can be cancelled.
 */
const CANCELLABLE_STATUSES = ['queued', 'validating', 'preparing', 'running', 'analyzing']

/**
 * Returns the number of scan jobs currently in active states.
 * @returns {number}
 */
export function getActiveScansCount() {
  let count = 0
  for (const job of scanJobs.values()) {
    if (ACTIVE_STATUSES.includes(job.status)) {
      count++
    }
  }
  return count
}

/**
 * Creates a new scan job and adds it to the in-memory store.
 * Throws if the concurrency limit has been reached.
 *
 * @param {{ type: 'lighthouse' | 'codeql', params: object }} options
 * @returns {object} The created ScanJob object
 */
export function createScanJob({ type, params = {} }) {
  // Check concurrency limit
  if (getActiveScansCount() >= scannerConfig.MAX_CONCURRENT_SCANS) {
    const error = new Error('Batas pemindaian bersamaan tercapai. Silakan tunggu pemindaian sebelumnya selesai.')
    error.code = 'SCAN_LIMIT_REACHED'
    throw error
  }

  const now = new Date().toISOString()
  const scanId = generateScanId()

  const job = {
    scanId,
    type,
    status: 'queued',
    progress: 0,
    currentStep: translateStatus('queued'),
    url: params.url || null,
    sourceType: params.sourceType || null,
    repoUrl: params.repoUrl || null,
    workspaceId: params.workspaceId || null,
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    result: null,
    error: null,
    isDemo: params.isDemo || false,
    _childProcess: null,
    _timeoutTimer: null
  }

  scanJobs.set(scanId, job)
  return job
}

/**
 * Retrieves a scan job by ID.
 * @param {string} scanId
 * @returns {object | null}
 */
export function getScanJob(scanId) {
  return scanJobs.get(scanId) || null
}

/**
 * Returns a paginated list of scan jobs sorted by createdAt descending.
 * Internal fields (_childProcess, _timeoutTimer) are stripped from the results.
 *
 * @param {{ limit?: number, offset?: number }} options
 * @returns {{ scans: object[], total: number }}
 */
export function getAllScans({ limit = 50, offset = 0 } = {}) {
  // Clamp limit to 1-100
  const clampedLimit = Math.max(1, Math.min(100, limit))
  // Ensure offset is non-negative
  const clampedOffset = Math.max(0, offset)

  // Collect all jobs and sort by createdAt descending
  const allJobs = Array.from(scanJobs.values())
  allJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const total = allJobs.length
  const paged = allJobs.slice(clampedOffset, clampedOffset + clampedLimit)

  // Strip internal fields
  const scans = paged.map(job => {
    const { _childProcess, _timeoutTimer, ...publicFields } = job
    return publicFields
  })

  return { scans, total }
}

/**
 * Cancels a scan job. Validates that the job is in a cancellable state.
 * If a child process is attached, it will be killed.
 *
 * @param {string} scanId
 * @returns {object} The updated job
 * @throws {Error} If job not found or in terminal state
 */
export function cancelScanJob(scanId) {
  const job = scanJobs.get(scanId)

  if (!job) {
    const error = new Error('Pemindaian tidak ditemukan')
    error.code = 'SCAN_NOT_FOUND'
    throw error
  }

  if (TERMINAL_STATUSES.includes(job.status)) {
    const error = new Error('Pemindaian tidak dapat dibatalkan karena sudah dalam status akhir')
    error.code = 'CANCEL_NOT_ALLOWED'
    throw error
  }

  if (!CANCELLABLE_STATUSES.includes(job.status)) {
    const error = new Error('Pemindaian tidak dapat dibatalkan dari status saat ini')
    error.code = 'CANCEL_NOT_ALLOWED'
    throw error
  }

  // Kill child process if attached
  if (job._childProcess && typeof job._childProcess.kill === 'function') {
    try {
      job._childProcess.kill()
    } catch {
      // Process may have already exited
    }
  }

  // Clear timeout timer if attached
  if (job._timeoutTimer) {
    clearTimeout(job._timeoutTimer)
  }

  const now = new Date().toISOString()
  job.status = 'cancelled'
  job.currentStep = translateStatus('cancelled')
  job.finishedAt = now
  job.updatedAt = now
  job._childProcess = null
  job._timeoutTimer = null

  return job
}

/**
 * Deletes a scan job from the in-memory store.
 * Filesystem cleanup of output/workspace directories will be added later.
 *
 * @param {string} scanId
 * @throws {Error} If job not found
 */
export function deleteScanJob(scanId) {
  const job = scanJobs.get(scanId)

  if (!job) {
    const error = new Error('Pemindaian tidak ditemukan')
    error.code = 'SCAN_NOT_FOUND'
    throw error
  }

  // Kill child process if still running
  if (job._childProcess && typeof job._childProcess.kill === 'function') {
    try {
      job._childProcess.kill()
    } catch {
      // Process may have already exited
    }
  }

  // Clear timeout timer if attached
  if (job._timeoutTimer) {
    clearTimeout(job._timeoutTimer)
  }

  scanJobs.delete(scanId)
}

/**
 * Updates the status, progress, and/or currentStep of a scan job.
 * Automatically updates `updatedAt`. If the new status is terminal, sets `finishedAt`.
 *
 * @param {string} scanId
 * @param {{ status?: string, progress?: number, currentStep?: string }} updates
 */
export function updateScanStatus(scanId, { status, progress, currentStep } = {}) {
  const job = scanJobs.get(scanId)
  if (!job) return

  const now = new Date().toISOString()

  if (status !== undefined) {
    job.status = status
    // Auto-translate currentStep if not explicitly provided
    if (currentStep === undefined) {
      job.currentStep = translateStatus(status)
    }
    // Set finishedAt on terminal states
    if (TERMINAL_STATUSES.includes(status) && !job.finishedAt) {
      job.finishedAt = now
    }
  }

  if (progress !== undefined) {
    job.progress = progress
  }

  if (currentStep !== undefined) {
    job.currentStep = currentStep
  }

  job.updatedAt = now
}

/**
 * Marks jobs that have been in `queued` or `running` status for longer than
 * the configured stale threshold as `stale`.
 */
export function markStaleJobs() {
  const staleMs = scannerConfig.SCAN_STALE_AFTER_MINUTES * 60 * 1000
  const now = Date.now()

  for (const job of scanJobs.values()) {
    if (job.status === 'queued' || job.status === 'running') {
      const updatedAtTime = new Date(job.updatedAt).getTime()
      if (now - updatedAtTime > staleMs) {
        const isoNow = new Date().toISOString()
        job.status = 'stale'
        job.currentStep = translateStatus('stale')
        job.finishedAt = isoNow
        job.updatedAt = isoNow
        job.error = {
          message: 'Pemindaian terhenti karena tidak merespon',
          code: 'SCAN_STALE'
        }

        // Clean up resources
        if (job._childProcess && typeof job._childProcess.kill === 'function') {
          try {
            job._childProcess.kill()
          } catch {
            // ignore
          }
        }
        if (job._timeoutTimer) {
          clearTimeout(job._timeoutTimer)
        }
        job._childProcess = null
        job._timeoutTimer = null
      }
    }
  }
}

/**
 * Marks all jobs in non-terminal active states as `failed` on server startup.
 * Called once when the server boots to clean up jobs interrupted by a restart.
 */
export function markInterruptedJobs() {
  const interruptibleStatuses = ['queued', 'validating', 'preparing', 'running', 'analyzing', 'parsing']
  const now = new Date().toISOString()

  for (const job of scanJobs.values()) {
    if (interruptibleStatuses.includes(job.status)) {
      job.status = 'failed'
      job.currentStep = translateStatus('failed')
      job.finishedAt = now
      job.updatedAt = now
      job.error = {
        message: 'Pemindaian terinterupsi karena server dimulai ulang',
        code: 'SCAN_INTERRUPTED'
      }

      // Clean up resources
      if (job._childProcess && typeof job._childProcess.kill === 'function') {
        try {
          job._childProcess.kill()
        } catch {
          // ignore
        }
      }
      if (job._timeoutTimer) {
        clearTimeout(job._timeoutTimer)
      }
      job._childProcess = null
      job._timeoutTimer = null
    }
  }
}

/**
 * Exposes the internal scan jobs map for testing purposes only.
 * @returns {Map<string, object>}
 */
export function _getStore() {
  return scanJobs
}
