import { generateJobId } from '../utils/job.util.js'
import { createJob, getActiveJobsCount, runSnapshotJob } from '../services/job.service.js'
import { limitsConfig } from '../config/limits.config.js'

// Valid snapshot modes
const VALID_MODES = ['offline-package', 'single-html']
const DEFAULT_MODE = 'offline-package'

/**
 * Controller to handle target cloning submission.
 * Validates concurrent limits, mode selection, creates an asynchronous job record,
 * returns a 202 Accepted status immediately, and triggers Playwright pipeline in the background.
 */
export const submitClone = async (req, res, next) => {
  try {
    const safeUrl = req.safeUrl
    const { mode = DEFAULT_MODE, options = {} } = req.body
    
    // Validate snapshot mode
    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid snapshot mode.',
          code: 'INVALID_SNAPSHOT_MODE',
          details: {
            provided: mode,
            valid: VALID_MODES
          }
        }
      })
    }
    
    // Check concurrency limit
    const maxConcurrent = limitsConfig.MAX_CONCURRENT_JOBS || 2
    if (getActiveJobsCount() >= maxConcurrent) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'A snapshot job is already running. Please wait until it finishes.',
          code: 'JOB_LIMIT_REACHED'
        }
      })
    }
    
    const jobId = generateJobId()
    
    // Initialize job status model immediately
    const job = await createJob({ jobId, url: safeUrl, mode, userId: req.user?.email, options })
    
    // Execute Playwright browser capture and rebuilder pipeline asynchronously
    setImmediate(() => {
      runSnapshotJob({ jobId, url: safeUrl, mode, options })
    })
    
    res.status(202).json({
      success: true,
      message: 'Snapshot job created.',
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        url: job.url,
        mode: job.mode
      }
    })
  } catch (err) {
    next(err)
  }
}


