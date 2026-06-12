import path from 'path'
import fs from 'fs-extra'
import { getJobOutputDir, getBaseOutputDir } from '../utils/path.util.js'
import { readJsonFile, fileExists, checkDownloadReadiness } from '../utils/file.util.js'
import { logger } from '../utils/logger.util.js'
import { createJobZipStream } from '../services/zip.service.js'
import { getJob, checkAndMarkStale } from '../services/job.service.js'

/**
 * Returns a list of existing jobs from backend/output/.
 * Sorts them newest first based on createdAt timestamp.
 */
export const getJobsList = async (req, res, next) => {
  try {
    const baseDir = getBaseOutputDir()
    
    if (!(await fs.pathExists(baseDir))) {
      return res.status(200).json({
        success: true,
        data: {
          jobs: []
        }
      })
    }

    const items = await fs.readdir(baseDir)
    const jobs = []

    for (const item of items) {
      const itemPath = path.join(baseDir, item)
      const stat = await fs.stat(itemPath)
      
      if (stat.isDirectory()) {
        const jobJsonPath = path.join(itemPath, 'job.json')
        const metadataPath = path.join(itemPath, 'metadata.json')
        
        // Get job data to check mode
        let jobMode = 'offline-package'
        if (await fileExists(jobJsonPath)) {
          try {
            const jobData = await readJsonFile(jobJsonPath)
            jobMode = jobData.mode || 'offline-package'
          } catch (err) {
            // Ignore read errors, use default mode
          }
        }
        
        // Check download readiness for all jobs
        const downloadStatus = await checkDownloadReadiness(itemPath, jobMode)
        
        if (await fileExists(jobJsonPath)) {
          try {
            let job = await readJsonFile(jobJsonPath)
            // Refresh and check stale state
            job = await checkAndMarkStale(job)
            
            jobs.push({
              jobId: job.jobId,
              url: job.url,
              mode: job.mode || 'offline-package',
              status: job.status === 'done' ? 'completed' : job.status,
              progress: job.progress,
              currentStep: job.currentStep,
              title: job.metadata?.title || job.title || null,
              score: job.metadata?.visualCompare?.score || null,
              assetSummary: job.metadata?.assetSummary || null,
              createdAt: job.createdAt,
              finishedAt: job.finishedAt,
              updatedAt: job.updatedAt,
              error: job.error || null,
              download: downloadStatus,
              links: {
                screenshot: `/api/jobs/${job.jobId}/screenshot`,
                previewScreenshot: `/api/jobs/${job.jobId}/preview-screenshot`,
                visualDiff: `/api/jobs/${job.jobId}/visual-diff`,
                preview: `/preview/${job.jobId}`,
                download: `/api/jobs/${job.jobId}/download`,
                manifest: `/api/jobs/${job.jobId}/manifest`
              }
            })
          } catch (readErr) {
            logger.warn(`Failed to read job.json for job ${item}: ${readErr.message}`)
          }
        } else if (await fileExists(metadataPath)) {
          try {
            const metadata = await readJsonFile(metadataPath)
            jobs.push({
              jobId: metadata.jobId,
              url: metadata.url,
              mode: metadata.mode || 'offline-package',
              status: metadata.status === 'done' ? 'completed' : metadata.status,
              progress: 100,
              currentStep: 'Completed',
              createdAt: metadata.createdAt,
              finishedAt: metadata.finishedAt,
              updatedAt: metadata.finishedAt || metadata.createdAt,
              title: metadata.title,
              score: metadata.visualCompare?.score || null,
              assetSummary: metadata.assetSummary || null,
              error: null,
              download: downloadStatus,
              links: {
                screenshot: `/api/jobs/${metadata.jobId}/screenshot`,
                previewScreenshot: `/api/jobs/${metadata.jobId}/preview-screenshot`,
                visualDiff: `/api/jobs/${metadata.jobId}/visual-diff`,
                preview: `/preview/${metadata.jobId}`,
                download: `/api/jobs/${metadata.jobId}/download`,
                manifest: `/api/jobs/${metadata.jobId}/manifest`
              }
            })
          } catch (readErr) {
            logger.warn(`Failed to read metadata for job ${item}: ${readErr.message}`)
          }
        }
      }
    }

    // Sort newest first
    jobs.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    res.status(200).json({
      success: true,
      data: {
        jobs
      }
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Returns job detail metadata.
 */
export const getJobDetail = async (req, res, next) => {
  try {
    const { jobId } = req.params
    
    // Validate Job ID format/safety
    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    const job = await getJob(jobId)
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found.',
          code: 'JOB_NOT_FOUND'
        }
      })
    }

    // Check download readiness
    const jobMode = job.mode || job.metadata?.mode || 'offline-package'
    const downloadStatus = await checkDownloadReadiness(outputDir, jobMode)

    const status = job.status === 'done' ? 'completed' : job.status

    if (status === 'completed') {
      const metadata = job.metadata || {}
      res.status(200).json({
        success: true,
        data: {
          jobId: job.jobId,
          url: job.url,
          mode: job.mode || metadata.mode || 'offline-package',
          title: metadata.title || job.title || null,
          status: 'completed',
          progress: 100,
          currentStep: 'Completed',
          logs: job.logs || [],
          phase: metadata.phase,
          createdAt: job.createdAt || metadata.createdAt,
          finishedAt: job.finishedAt || metadata.finishedAt,
          updatedAt: job.updatedAt || job.finishedAt || metadata.createdAt,
          durationMs: metadata.durationMs,
          files: metadata.files,
          assetSummary: metadata.assetSummary,
          rewrite: metadata.rewrite,
          intelligence: metadata.intelligence,
          visualCompare: metadata.visualCompare,
          download: downloadStatus,
          links: {
            screenshot: `/api/jobs/${job.jobId}/screenshot`,
            previewScreenshot: `/api/jobs/${job.jobId}/preview-screenshot`,
            visualDiff: `/api/jobs/${job.jobId}/visual-diff`,
            preview: `/preview/${job.jobId}`,
            download: `/api/jobs/${job.jobId}/download`,
            manifest: `/api/jobs/${job.jobId}/manifest`
          }
        }
      })
    } else if (status === 'failed') {
      res.status(200).json({
        success: true,
        data: {
          jobId: job.jobId,
          url: job.url,
          mode: job.mode || 'offline-package',
          status: 'failed',
          progress: job.progress || 0,
          currentStep: job.currentStep || 'Failed',
          logs: job.logs || [],
          createdAt: job.createdAt,
          finishedAt: job.finishedAt,
          updatedAt: job.updatedAt || job.finishedAt || job.createdAt,
          error: job.error || { message: 'Snapshot job failed.', code: 'JOB_FAILED' },
          download: { 
            ready: false, 
            mode: 'unavailable',
            missingFiles: [], 
            optionalMissingFiles: [],
            warnings: [],
            coreFiles: { html: false, metadata: false },
            preferredFiles: { screenshot: false },
            optionalFiles: { manifest: false, originalHtml: false, previewScreenshot: false, visualDiff: false, assets: false }
          },
          links: {}
        }
      })
    } else {
      // queued or running
      res.status(200).json({
        success: true,
        data: {
          jobId: job.jobId,
          url: job.url,
          mode: job.mode || 'offline-package',
          status: status,
          progress: job.progress || 0,
          currentStep: job.currentStep || 'Queued',
          logs: job.logs || [],
          createdAt: job.createdAt,
          finishedAt: job.finishedAt,
          updatedAt: job.updatedAt || job.createdAt,
          metadata: null,
          download: { 
            ready: false, 
            mode: 'unavailable',
            missingFiles: [], 
            optionalMissingFiles: [],
            warnings: [],
            coreFiles: { html: false, metadata: false },
            preferredFiles: { screenshot: false },
            optionalFiles: { manifest: false, originalHtml: false, previewScreenshot: false, visualDiff: false, assets: false }
          },
          links: {}
        }
      })
    }
  } catch (err) {
    next(err)
  }
}

/**
 * Safely deletes a job's output directory.
 */
export const deleteJob = async (req, res, next) => {
  try {
    const { jobId } = req.params

    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    if (!(await fs.pathExists(outputDir))) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found.',
          code: 'JOB_NOT_FOUND'
        }
      })
    }

    // Delete output directory recursively
    await fs.remove(outputDir)
    logger.info(`Safely removed output folder for job: ${jobId}`)

    res.status(200).json({
      success: true,
      message: 'Job sandbox folder deleted successfully.'
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Serves the captured screenshot.png safely.
 */
export const getJobScreenshot = async (req, res, next) => {
  try {
    const { jobId } = req.params

    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    const screenshotPath = path.join(outputDir, 'screenshot.png')
    
    if (!(await fileExists(screenshotPath))) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Screenshot not found.',
          code: 'SCREENSHOT_NOT_FOUND'
        }
      })
    }

    res.setHeader('Content-Type', 'image/png')
    res.sendFile(screenshotPath)
  } catch (err) {
    next(err)
  }
}

/**
 * Serves the generated manifest.json safely.
 */
export const getJobManifest = async (req, res, next) => {
  try {
    const { jobId } = req.params

    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    const manifestPath = path.join(outputDir, 'manifest.json')
    
    if (!(await fileExists(manifestPath))) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Manifest not found.',
          code: 'MANIFEST_NOT_FOUND'
        }
      })
    }

    const manifest = await readJsonFile(manifestPath)
    
    res.status(200).json({
      success: true,
      data: manifest
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Generates and streams the ZIP archive containing the job output files.
 * Supports full and partial downloads based on available files.
 */
export const downloadJobZip = async (req, res, next) => {
  try {
    const { jobId } = req.params
    
    // Get job output directory
    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }
    
    // Get job mode
    const job = await getJob(jobId)
    const mode = job?.mode || job?.metadata?.mode || 'offline-package'
    
    // Check download readiness
    const downloadStatus = await checkDownloadReadiness(outputDir, mode)
    
    // If unavailable (missing core files), reject
    if (downloadStatus.mode === 'unavailable') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'This snapshot cannot be downloaded because core output files are missing.',
          code: 'SNAPSHOT_UNAVAILABLE',
          details: {
            missingFiles: downloadStatus.missingFiles
          }
        }
      })
    }
    
    // Initialize zip stream (will include available files only)
    const archive = await createJobZipStream(jobId, downloadStatus, mode)
    
    // Set headers for ZIP attachment
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="pagemirror-${jobId}.zip"`)
    
    archive.on('end', () => {
      logger.info(`Successfully streamed ZIP archive for job ${jobId} (mode: ${downloadStatus.mode})`)
    })
    
    // Pipe zip stream to client response
    archive.pipe(res)
    
    // Finalize archiving
    await archive.finalize()
  } catch (err) {
    if (res.headersSent) {
      return next(err)
    }
    
    const status = err.statusCode || 500
    
    res.status(status).json({
      success: false,
      error: {
        message: err.message || 'ZIP export failed.',
        code: err.code || 'ZIP_EXPORT_FAILED'
      }
    })
  }
}

/**
 * Serves the captured preview-screenshot.png safely.
 */
export const getJobPreviewScreenshot = async (req, res, next) => {
  try {
    const { jobId } = req.params

    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    const screenshotPath = path.join(outputDir, 'preview-screenshot.png')
    
    if (!(await fileExists(screenshotPath))) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Preview screenshot not found.',
          code: 'PREVIEW_SCREENSHOT_NOT_FOUND'
        }
      })
    }

    res.setHeader('Content-Type', 'image/png')
    res.sendFile(screenshotPath)
  } catch (err) {
    next(err)
  }
}

/**
 * Serves the generated visual-diff.png safely.
 */
export const getJobVisualDiff = async (req, res, next) => {
  try {
    const { jobId } = req.params

    let outputDir
    try {
      outputDir = getJobOutputDir(jobId)
    } catch (pathErr) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid Job ID format.',
          code: 'INVALID_JOB_ID'
        }
      })
    }

    const diffPath = path.join(outputDir, 'visual-diff.png')
    
    if (!(await fileExists(diffPath))) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Visual diff image not found.',
          code: 'VISUAL_DIFF_NOT_FOUND'
        }
      })
    }

    res.setHeader('Content-Type', 'image/png')
    res.sendFile(diffPath)
  } catch (err) {
    next(err)
  }
}
