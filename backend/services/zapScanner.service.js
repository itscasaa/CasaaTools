import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { generateScanId } from '../utils/scan-id.js'
import { logger } from '../utils/logger.util.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'

/**
 * In-memory store for OWASP ZAP scan jobs.
 * @type {Map<string, object>}
 */
const zapJobs = new Map()

const TERMINAL_STATUSES = ['completed', 'failed', 'timeout', 'cancelled']
const ZAP_TIMEOUT_MS = parseInt(process.env.SCANNER_ZAP_TIMEOUT_MS || '600000', 10) // 10 minutes default

/**
 * Checks if a file exists.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Helper: Parses the ZAP JSON report to extract risk classifications.
 * Risk codes:
 * 3: High
 * 2: Medium
 * 1: Low
 * 0: Informational
 * @param {string} jsonPath
 * @returns {Promise<{high: number, medium: number, low: number, informational: number}>}
 */
export async function parseZapJson(jsonPath) {
  const summary = { high: 0, medium: 0, low: 0, informational: 0 }
  try {
    const exists = await fileExists(jsonPath)
    if (!exists) return summary

    const content = await fs.readFile(jsonPath, 'utf-8')
    const data = JSON.parse(content)

    if (!data.site || !Array.isArray(data.site)) {
      return summary
    }

    for (const site of data.site) {
      if (!site.alerts || !Array.isArray(site.alerts)) {
        continue
      }
      for (const alert of site.alerts) {
        const riskcode = parseInt(alert.riskcode, 10)
        if (riskcode === 3) {
          summary.high++
        } else if (riskcode === 2) {
          summary.medium++
        } else if (riskcode === 1) {
          summary.low++
        } else if (riskcode === 0) {
          summary.informational++
        }
      }
    }
  } catch (err) {
    logger.warn(`Failed to parse ZAP JSON report: ${err.message}`)
  }
  return summary
}

/**
 * Create a new ZAP scan job.
 * @param {string} targetUrl
 * @returns {object} The created job object
 */
export function createZapJob(targetUrl) {
  const scanId = generateScanId()
  const now = new Date().toISOString()

  const job = {
    scanId,
    targetUrl,
    status: 'queued',
    startedAt: now,
    finishedAt: null,
    summary: {
      high: 0,
      medium: 0,
      low: 0,
      informational: 0
    },
    downloads: {
      html: `/api/zap-scan/download/${scanId}/html`,
      json: `/api/zap-scan/download/${scanId}/json`
    },
    error: null,
    _childProcess: null,
    _timeoutTimer: null
  }

  zapJobs.set(scanId, job)
  return job
}

/**
 * Retrieves a ZAP job by ID.
 * @param {string} scanId
 * @returns {object|null}
 */
export function getZapJob(scanId) {
  return zapJobs.get(scanId) || null
}

/**
 * Clean up job's process/timers and set state.
 */
export function updateZapStatus(scanId, updates) {
  const job = zapJobs.get(scanId)
  if (!job) return

  const now = new Date().toISOString()
  Object.assign(job, updates)

  if (updates.status && TERMINAL_STATUSES.includes(updates.status)) {
    job.finishedAt = now
    
    // Clear timers
    if (job._timeoutTimer) {
      clearTimeout(job._timeoutTimer)
      job._timeoutTimer = null
    }
    job._childProcess = null
  }
}

/**
 * Cancels a running ZAP scan.
 * @param {string} scanId
 */
export function cancelZapJob(scanId) {
  const job = zapJobs.get(scanId)
  if (!job) return

  if (TERMINAL_STATUSES.includes(job.status)) {
    return job
  }

  if (job._childProcess && typeof job._childProcess.kill === 'function') {
    try {
      job._childProcess.kill()
    } catch {
      // ignore
    }
  }

  updateZapStatus(scanId, {
    status: 'cancelled',
    error: {
      message: 'Pemindaian dibatalkan oleh pengguna',
      code: 'SCAN_CANCELLED'
    }
  })

  return job
}

/**
 * Deletes a ZAP job from the store.
 */
export function deleteZapJob(scanId) {
  cancelZapJob(scanId)
  zapJobs.delete(scanId)
}

/**
 * Runs the OWASP ZAP Baseline Scan using Docker.
 * @param {string} scanId
 * @param {string} targetUrl
 */
export async function executeZapScan(scanId, targetUrl) {
  const absoluteScanFolder = path.resolve(process.cwd(), 'scans', 'zap', scanId)
  const htmlPath = path.join(absoluteScanFolder, 'zap-report.html')
  const jsonPath = path.join(absoluteScanFolder, 'zap-report.json')

  try {
    // 1. Create target folder
    await fs.mkdir(absoluteScanFolder, { recursive: true })

    updateZapStatus(scanId, { status: 'running' })

    const args = [
      'run',
      '-t',
      '--user', 'root',
      '-v', `${absoluteScanFolder}:/zap/wrk:rw`,
      'ghcr.io/zaproxy/zaproxy:stable',
      'zap-baseline.py',
      '-t', targetUrl,
      '-r', 'zap-report.html',
      '-J', 'zap-report.json'
    ]

    logger.info(`[ZAP] Starting Docker baseline scan for scanId: ${scanId}, target: ${targetUrl}`)

    const child = spawn('docker', args, { shell: false })
    const job = getZapJob(scanId)
    if (job) {
      job._childProcess = child
    }

    // Set timeout timer
    const timeoutTimer = setTimeout(() => {
      logger.warn(`[ZAP] Scan ${scanId} timed out after ${ZAP_TIMEOUT_MS}ms`)
      if (child && typeof child.kill === 'function') {
        try {
          child.kill()
        } catch {
          // ignore
        }
      }
      updateZapStatus(scanId, {
        status: 'timeout',
        error: {
          message: 'Batas waktu pemindaian keamanan terlampaui.',
          code: 'SCAN_TIMEOUT'
        }
      })
    }, ZAP_TIMEOUT_MS)

    if (job) {
      job._timeoutTimer = timeoutTimer
    }

    return new Promise((resolve, reject) => {
      let stderr = ''
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', async (code) => {
        // Clear timeout timer
        clearTimeout(timeoutTimer)

        // Check if report files exist. 
        // Note: zap-baseline.py exits with:
        // 0 if no warning/error.
        // 1 if warnings found.
        // 2 if errors found.
        // So 0, 1, 2 are valid success states if the files are generated successfully.
        const htmlExists = await fileExists(htmlPath)
        const jsonExists = await fileExists(jsonPath)

        if (htmlExists && jsonExists) {
          logger.info(`[ZAP] Scan ${scanId} finished successfully with exit code ${code}`)
          const summary = await parseZapJson(jsonPath)
          updateZapStatus(scanId, {
            status: 'completed',
            summary
          })
          resolve()
        } else {
          logger.error(`[ZAP] Scan ${scanId} failed. Exit code ${code}. Stderr: ${stderr}`)
          updateZapStatus(scanId, {
            status: 'failed',
            error: {
              message: sanitizeErrorMessage(stderr || `Pemindaian gagal dengan exit code ${code}`),
              code: 'SCAN_FAILED'
            }
          })
          reject(new Error(`Pemindaian gagal dengan kode ${code}`))
        }
      })

      child.on('error', (err) => {
        clearTimeout(timeoutTimer)
        logger.error(`[ZAP] Spawn error for scan ${scanId}:`, err)
        updateZapStatus(scanId, {
          status: 'failed',
          error: {
            message: sanitizeErrorMessage(err.message || 'Gagal menjalankan container Docker'),
            code: 'DOCKER_SPAWN_ERROR'
          }
        })
        reject(err)
      })
    })
  } catch (err) {
    logger.error(`[ZAP] Setup error for scan ${scanId}:`, err)
    updateZapStatus(scanId, {
      status: 'failed',
      error: {
        message: sanitizeErrorMessage(err.message || 'Gagal menyiapkan direktori pemindaian'),
        code: 'SCAN_SETUP_ERROR'
      }
    })
  }
}
