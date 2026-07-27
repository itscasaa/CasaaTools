import path from 'path'
import fs from 'fs-extra'
import { getJobOutputDir, getBaseOutputDir } from '../utils/path.util.js'
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from '../utils/file.util.js'
import { createSnapshotByMode } from './snapshot-router.service.js'
import { logger } from '../utils/logger.util.js'
import { limitsConfig } from '../config/limits.config.js'

// In-memory active jobs map (jobId -> jobState)
const activeJobs = new Map()

/**
 * Sanitizes a raw error object, returning a safe user-facing message and code.
 * Strips stack traces, local absolute paths, and Chromium internal dumps.
 * 
 * @param {Error|object} error - Raw error object
 * @returns {{message: string, code: string}} Safe error object
 */
export const sanitizeJobError = (error) => {
  if (!error) {
    return {
      message: 'The page could not be opened or captured.',
      code: 'CAPTURE_FAILED'
    }
  }

  const message = error.message || ''
  const stack = error.stack || ''
  const combined = `${message} ${stack}`

  // Timeout Errors
  if (combined.includes('TimeoutError') || combined.includes('timeout') || combined.includes('Timeout')) {
    return {
      message: 'The request timed out while opening the page.',
      code: 'CAPTURE_TIMEOUT'
    }
  }

  // DNS / Unreachable Domain Errors
  if (combined.includes('ERR_NAME_NOT_RESOLVED') || combined.includes('ENOTFOUND') || combined.includes('dns') || combined.includes('DNS')) {
    return {
      message: 'The target domain name could not be resolved.',
      code: 'DNS_LOOKUP_FAILED'
    }
  }

  // General Navigation / Connection Errors
  if (combined.includes('navigation') || combined.includes('Navigation') || combined.includes('net::ERR_')) {
    return {
      message: 'The browser failed to navigate to the target URL.',
      code: 'NAVIGATION_FAILED'
    }
  }

  // Asset Downloader Errors
  if (combined.includes('asset') || combined.includes('Asset') || combined.includes('download') || combined.includes('Download')) {
    return {
      message: 'Failed to download one or more website asset files.',
      code: 'ASSET_DOWNLOAD_FAILED'
    }
  }

  // Visual Compare Errors
  if (combined.includes('visual') || combined.includes('compare') || combined.includes('pixelmatch')) {
    return {
      message: 'Failed to execute visual screenshot comparison.',
      code: 'VISUAL_COMPARE_FAILED'
    }
  }

  // Fallback
  return {
    message: 'The page could not be opened or captured.',
    code: 'CAPTURE_FAILED'
  }
}

/**
 * Checks if a running or queued job has become stale and transitions it to failed.
 * 
 * @param {object} job - Job state object
 * @returns {Promise<object>} Current or updated job state object
 */
export const checkAndMarkStale = async (job) => {
  if (!job) return null
  if (job.status !== 'queued' && job.status !== 'running') return job

  const staleMinutes = limitsConfig.JOB_STALE_AFTER_MINUTES || 30
  const staleMs = staleMinutes * 60 * 1000
  const updatedAtTime = new Date(job.updatedAt || job.createdAt).getTime()
  const now = Date.now()

  if (now - updatedAtTime > staleMs) {
    const finishedAt = new Date().toISOString()
    job.status = 'failed'
    job.currentStep = 'Stale'
    job.finishedAt = finishedAt
    job.updatedAt = finishedAt
    job.error = {
      message: 'This job became stale and was stopped.',
      code: 'JOB_STALE'
    }
    job.logs = job.logs || []
    job.logs.push({
      time: finishedAt,
      step: 'Stale',
      message: 'Job failed: This job became stale and was stopped.',
      status: 'failed'
    })

    try {
      const outputDir = getJobOutputDir(job.jobId)
      const jobJsonPath = path.join(outputDir, 'job.json')
      await writeJsonFile(jobJsonPath, job)
    } catch (err) {
      logger.error(`Error saving stale job JSON for ${job.jobId}: ${err.message}`)
    }

    activeJobs.delete(job.jobId)
    logger.warn(`Job ${job.jobId} became stale and was stopped.`)
  }

  return job
}

/**
 * Returns the count of actively running or queued jobs.
 * Runs checkAndMarkStale dynamically to clean up stale jobs.
 * @returns {number} Active jobs count
 */
export const getActiveJobsCount = () => {
  let count = 0
  for (const job of activeJobs.values()) {
    if (job.status === 'running' || job.status === 'queued') {
      count++
    }
  }
  return count
}

/**
 * Creates a new job and saves it to disk.
 * @param {object} params
 * @param {string} params.jobId - Unique Job ID
 * @param {string} params.url - Safe validated target URL
 * @param {string} params.mode - Snapshot mode ('offline-package' or 'single-html')
 * @returns {Promise<object>} The job object
 */
export const createJob = async ({ jobId, url, mode = 'offline-package', userId = null, options = {} }) => {
  const now = new Date().toISOString()
  const job = {
    jobId,
    url,
    mode,
    userId,
    options,
    status: 'queued',
    progress: 0,
    currentStep: 'Queued',
    logs: [
      {
        time: now,
        step: 'Queued',
        message: 'Job received and queued.'
      }
    ],
    createdAt: now,
    startedAt: null,
    updatedAt: now,
    finishedAt: null,
    error: null,
    metadata: null
  }

  // Add to active jobs map
  activeJobs.set(jobId, job)

  // Ensure output directory exists and write initial job.json
  const outputDir = getJobOutputDir(jobId)
  await ensureDirectoryExists(outputDir)
  const jobJsonPath = path.join(outputDir, 'job.json')
  await writeJsonFile(jobJsonPath, job)

  logger.info(`Job ${jobId} initialized and queued (mode: ${mode}, user: ${userId}).`)
  return job
}

/**
 * Retrieves a job status from active map or disk.
 * Supports metadata.json fallback for older completed jobs.
 * @param {string} jobId - The Job ID
 * @returns {Promise<object|null>} The job object or null
 */
export const getJob = async (jobId) => {
  let job = null

  // Check in-memory map first
  if (activeJobs.has(jobId)) {
    job = activeJobs.get(jobId)
  } else {
    const outputDir = getJobOutputDir(jobId)
    const jobJsonPath = path.join(outputDir, 'job.json')

    // Try job.json
    if (await fs.pathExists(jobJsonPath)) {
      try {
        job = await readJsonFile(jobJsonPath)
      } catch (err) {
        logger.error(`Error reading job.json for ${jobId}: ${err.message}`)
      }
    } else {
      // Fallback to metadata.json for old completed jobs
      const metadataPath = path.join(outputDir, 'metadata.json')
      if (await fs.pathExists(metadataPath)) {
        try {
          const metadata = await readJsonFile(metadataPath)
          job = {
            jobId: metadata.jobId,
            url: metadata.url,
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            logs: [],
            createdAt: metadata.createdAt,
            finishedAt: metadata.finishedAt,
            updatedAt: metadata.finishedAt || metadata.createdAt,
            metadata
          }
        } catch (err) {
          logger.error(`Error reading metadata.json for ${jobId}: ${err.message}`)
        }
      }
    }
  }

  if (job) {
    // Run stale job checks
    job = await checkAndMarkStale(job)
  }

  return job
}

/**
 * Updates a job with patch properties and persists to disk.
 * Automatically increments updatedAt timestamp.
 * @param {string} jobId - The Job ID
 * @param {object} patch - Properties to update
 */
export const updateJob = async (jobId, patch) => {
  const job = await getJob(jobId)
  if (!job) return

  Object.assign(job, patch, { updatedAt: new Date().toISOString() })

  if (activeJobs.has(jobId)) {
    activeJobs.set(jobId, job)
  }

  const outputDir = getJobOutputDir(jobId)
  const jobJsonPath = path.join(outputDir, 'job.json')
  await writeJsonFile(jobJsonPath, job)
}

/**
 * Appends a log item to the job and persists to disk.
 * @param {string} jobId - The Job ID
 * @param {object} log - Log item without timestamp
 * @param {string} log.step - Step ID or label
 * @param {string} log.message - Log detail message
 * @param {string} [log.status] - Status (done, active, failed)
 */
export const appendJobLog = async (jobId, { step, message, status }) => {
  const job = await getJob(jobId)
  if (!job) return

  const logItem = {
    time: new Date().toISOString(),
    step,
    message,
    ...(status ? { status } : {})
  }

  job.logs = job.logs || []
  job.logs.push(logItem)

  if (activeJobs.has(jobId)) {
    activeJobs.set(jobId, job)
  }

  const outputDir = getJobOutputDir(jobId)
  const jobJsonPath = path.join(outputDir, 'job.json')
  await writeJsonFile(jobJsonPath, job)
}

/**
 * Marks job status as running.
 * @param {string} jobId - The Job ID
 */
export const markJobRunning = async (jobId) => {
  await updateJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString()
  })
}

/**
 * Marks job status as completed.
 * @param {string} jobId - The Job ID
 * @param {object} metadata - The final completed snapshot metadata
 */
export const markJobCompleted = async (jobId, metadata) => {
  await updateJob(jobId, {
    status: 'completed',
    progress: 100,
    currentStep: 'Completed',
    finishedAt: new Date().toISOString(),
    metadata
  })
  // Remove from active list
  activeJobs.delete(jobId)
}

/**
 * Marks job status as failed, sanitizing error details.
 * Logs technical traceback details in backend logs.
 * @param {string} jobId - The Job ID
 * @param {Error} error - Raw error object
 */
export const markJobFailed = async (jobId, error) => {
  // Safe user-facing error response mapping
  const sanitized = sanitizeJobError(error)
  const now = new Date().toISOString()
  
  // Internal logging of absolute technical info
  logger.error(`Snapshot job ${jobId} failed internally:`, error)

  const currentJob = await getJob(jobId)
  const failedStep = currentJob?.currentStep || 'Failed'

  await updateJob(jobId, {
    status: 'failed',
    finishedAt: now,
    error: sanitized
  })

  // Append safe failure report to log timelines
  await appendJobLog(jobId, {
    step: failedStep,
    message: `Failed: ${sanitized.message} (${sanitized.code})`,
    status: 'failed'
  })

  // Remove from active list
  activeJobs.delete(jobId)
}

/**
 * Runs the snapshot job in the background.
 * @param {object} params
 * @param {string} params.jobId - Unique Job ID
 * @param {string} params.url - Target URL
 * @param {string} params.mode - Snapshot mode ('offline-package' or 'single-html')
 */
export const runSnapshotJob = async ({ jobId, url, mode = 'offline-package', options = {} }) => {
  try {
    await markJobRunning(jobId)
    await appendJobLog(jobId, { step: 'Starting snapshot', message: 'Starting snapshot rebuilder pipeline' })

    const metadata = await createSnapshotByMode({
      url,
      jobId,
      mode,
      options,
      onProgress: async (progress, currentStep, message) => {
        await updateJob(jobId, { progress, currentStep })
        await appendJobLog(jobId, { step: currentStep, message })
      }
    })

    await markJobCompleted(jobId, metadata)
    logger.info(`Job ${jobId} completed successfully (mode: ${mode}).`)
  } catch (error) {
    logger.error(`Job ${jobId} failed during execution: ${error.message}`)
    await markJobFailed(jobId, error)
  }
}

/**
 * Scans output folders and recovers queued/running jobs interrupted by a restart.
 */
export const recoverInterruptedJobs = async () => {
  try {
    const baseDir = getBaseOutputDir()
    if (!(await fs.pathExists(baseDir))) return

    const items = await fs.readdir(baseDir)
    const now = new Date().toISOString()

    for (const item of items) {
      const itemPath = path.join(baseDir, item)
      const stat = await fs.stat(itemPath)
      
      if (stat.isDirectory()) {
        const jobJsonPath = path.join(itemPath, 'job.json')
        if (await fs.pathExists(jobJsonPath)) {
          try {
            const job = await readJsonFile(jobJsonPath)
            if (job.status === 'queued' || job.status === 'running') {
              job.status = 'failed'
              job.currentStep = 'Interrupted'
              job.finishedAt = now
              job.updatedAt = now
              job.error = {
                message: 'This job was interrupted because the server restarted.',
                code: 'JOB_INTERRUPTED'
              }
              job.logs = job.logs || []
              job.logs.push({
                time: now,
                step: 'Interrupted',
                message: 'Job failed: This job was interrupted because the server restarted.',
                status: 'failed'
              })
              await writeJsonFile(jobJsonPath, job)
              logger.info(`Recovered interrupted job: ${job.jobId}`)
            }
          } catch (err) {
            logger.error(`Error recovering job in ${item}: ${err.message}`)
          }
        }
      }
    }
  } catch (err) {
    logger.error(`Failed to scan and recover interrupted jobs: ${err.message}`)
  }
}

/**
 * Scans and marks stale running/queued jobs as failed.
 */
export const recoverStaleJobs = async () => {
  try {
    const baseDir = getBaseOutputDir()
    if (!(await fs.pathExists(baseDir))) return

    const items = await fs.readdir(baseDir)
    for (const item of items) {
      const itemPath = path.join(baseDir, item)
      const stat = await fs.stat(itemPath)
      
      if (stat.isDirectory()) {
        const jobJsonPath = path.join(itemPath, 'job.json')
        if (await fs.pathExists(jobJsonPath)) {
          try {
            const job = await readJsonFile(jobJsonPath)
            await checkAndMarkStale(job)
          } catch (err) {
            // ignore
          }
        }
      }
    }
  } catch (err) {
    // ignore
  }
}

// -------------------------------------------------------------
// Startup triggers (non-blocking module initialization)
// -------------------------------------------------------------
setImmediate(() => {
  recoverInterruptedJobs()
})

// Periodically check for stale jobs in the background every 5 minutes
setInterval(() => {
  recoverStaleJobs()
}, 5 * 60 * 1000)
