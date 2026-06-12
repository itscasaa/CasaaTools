import path from 'path'
import fs from 'fs/promises'
import { validateUrlSafety } from '../utils/ssrf-validator.js'
import {
  createZapJob,
  getZapJob,
  executeZapScan,
  updateZapStatus
} from '../services/zapScanner.service.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'
import { logger } from '../utils/logger.util.js'

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
 * Strips internal helper fields before returning job to client.
 */
function toPublicJob(job) {
  if (!job) return null
  const { _childProcess, _timeoutTimer, ...publicFields } = job
  return publicFields
}

/**
 * POST /api/zap-scan/start
 * Starts an OWASP ZAP Baseline Scan.
 */
export const startScan = async (req, res, next) => {
  try {
    const { targetUrl } = req.body

    // 1. Basic presence check
    if (!targetUrl || typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Target URL wajib diisi',
          code: 'INVALID_URL'
        }
      })
    }

    // 2. Validate URL safety (SSRF checks, private IPs, localhost, protocols)
    const safetyResult = await validateUrlSafety(targetUrl)
    if (!safetyResult.valid) {
      const statusMap = {
        INVALID_URL: 400,
        URL_TOO_LONG: 400,
        PROTOCOL_NOT_ALLOWED: 400,
        SSRF_BLOCKED: 403,
        LOCALHOST_BLOCKED: 403,
        METADATA_BLOCKED: 403
      }

      const httpCode = statusMap[safetyResult.code] || 400
      const errorMessage = safetyResult.message || 'URL tidak aman atau tidak valid'

      return res.status(httpCode).json({
        success: false,
        error: {
          message: errorMessage,
          code: safetyResult.code
        }
      })
    }

    const safeUrl = safetyResult.safeUrl

    // 3. Create the job in queued state
    const job = createZapJob(safeUrl)

    // 4. Asynchronously execute Docker ZAP Scan
    setImmediate(() => {
      executeZapScan(job.scanId, safeUrl).catch((err) => {
        logger.error(`[ZAP] Background execution failed for scan ${job.scanId}:`, err)
      })
    })

    return res.status(202).json({
      success: true,
      message: 'Pemindaian ZAP berhasil dimulai.',
      data: toPublicJob(job)
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/zap-scan/status/:scanId
 * Returns the state of a ZAP scan.
 */
export const getScanStatus = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = getZapJob(scanId)

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Pemindaian tidak ditemukan',
          code: 'SCAN_NOT_FOUND'
        }
      })
    }

    return res.status(200).json({
      success: true,
      data: toPublicJob(job)
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/zap-scan/download/:scanId/html
 * Downloads the original unmodified ZAP HTML report.
 */
export const downloadHtmlReport = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = getZapJob(scanId)

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Pemindaian tidak ditemukan',
          code: 'SCAN_NOT_FOUND'
        }
      })
    }

    const absoluteScanFolder = path.resolve(process.cwd(), 'scans', 'zap', scanId)
    const htmlPath = path.join(absoluteScanFolder, 'zap-report.html')

    const exists = await fileExists(htmlPath)
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Laporan HTML belum tersedia atau pemindaian gagal',
          code: 'REPORT_NOT_FOUND'
        }
      })
    }

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="zap-report-${scanId}.html"`)

    return res.sendFile(htmlPath)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/zap-scan/download/:scanId/json
 * Downloads the original unmodified ZAP JSON report.
 */
export const downloadJsonReport = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = getZapJob(scanId)

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Pemindaian tidak ditemukan',
          code: 'SCAN_NOT_FOUND'
        }
      })
    }

    const absoluteScanFolder = path.resolve(process.cwd(), 'scans', 'zap', scanId)
    const jsonPath = path.join(absoluteScanFolder, 'zap-report.json')

    const exists = await fileExists(jsonPath)
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Laporan JSON belum tersedia atau pemindaian gagal',
          code: 'REPORT_NOT_FOUND'
        }
      })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="zap-report-${scanId}.json"`)

    return res.sendFile(jsonPath)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/zap-scan/view/:scanId
 * Views the original unmodified ZAP HTML report inline in the browser.
 */
export const viewHtmlReport = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = getZapJob(scanId)

    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Pemindaian tidak ditemukan',
          code: 'SCAN_NOT_FOUND'
        }
      })
    }

    const absoluteScanFolder = path.resolve(process.cwd(), 'scans', 'zap', scanId)
    const htmlPath = path.join(absoluteScanFolder, 'zap-report.html')

    const exists = await fileExists(htmlPath)
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Laporan HTML belum tersedia atau pemindaian gagal',
          code: 'REPORT_NOT_FOUND'
        }
      })
    }

    // Set correct content type but no attachment content-disposition so it renders in the browser
    res.setHeader('Content-Type', 'text/html')
    return res.sendFile(htmlPath)
  } catch (err) {
    next(err)
  }
}
