import path from 'path'
import fs from 'fs/promises'
import {
  createScanJob,
  getScanJob,
  getAllScans,
  cancelScanJob,
  deleteScanJob,
  updateScanStatus
} from '../services/scan.service.js'
import { generateLighthouseDemo, generateCodeqlDemo } from '../services/demo.service.js'
import { generateLighthouseRecommendations, generateCodeqlRecommendations } from '../services/recommendation.service.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'
import { runPageSpeedInsights } from '../services/pagespeed.service.js'
import { validateRedirects } from '../utils/redirect-validator.js'
import { scannerConfig } from '../config/scanner.config.js'
import { logger } from '../utils/logger.util.js'
import { isZipFile, safeExtractZip, detectJsProject } from '../utils/zip-extractor.js'
import { detectCodeql, createDatabase, analyzeDatabase, parseSarif } from '../services/codeql.service.js'

/**
 * Valid CodeQL source types.
 */
const VALID_SOURCE_TYPES = ['github', 'workspace', 'demo', 'zip']

/**
 * Regex for valid GitHub repository URL.
 */
const REPO_URL_REGEX = /^https:\/\/github\.com\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+\/?$/

/**
 * Regex for valid workspace ID.
 */
const WORKSPACE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/

/**
 * Helper: delay for a given number of milliseconds.
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Checks if a string value looks like a filesystem path.
 * Rejects values containing `..`, starting with `/`, `\\`, or drive letter.
 */
function looksLikePath(value) {
  if (typeof value !== 'string') return false
  if (value.includes('..')) return true
  if (value.startsWith('/')) return true
  if (value.startsWith('\\')) return true
  if (/^[A-Za-z]:[/\\]/.test(value)) return true
  return false
}

/**
 * Checks all string values in the request body for path-like patterns.
 * Returns true if any string value looks like a filesystem path.
 */
function bodyContainsPathLikeFields(body) {
  if (!body || typeof body !== 'object') return false
  for (const key of Object.keys(body)) {
    const value = body[key]
    if (typeof value === 'string' && looksLikePath(value)) {
      return true
    }
  }
  return false
}


/**
 * Strips internal fields from a scan job object before sending to client.
 */
function stripInternalFields(job) {
  if (!job) return job
  const { _childProcess, _timeoutTimer, ...publicFields } = job
  return publicFields
}

/**
 * Internal helper: Executes a demo scan with realistic status transitions.
 * Not exported — used only by submitLighthouseScan and submitCodeqlScan.
 */
async function executeDemoScan(scanId, type) {
  const steps = ['validating', 'preparing', 'running', 'analyzing', 'parsing']
  const progressPerStep = [10, 25, 50, 75, 90]

  for (let i = 0; i < steps.length; i++) {
    await delay(200)
    updateScanStatus(scanId, { status: steps[i], progress: progressPerStep[i] })
  }

  // Generate demo result
  const result = type === 'lighthouse' ? generateLighthouseDemo() : generateCodeqlDemo()

  // Enrich with recommendations
  if (type === 'lighthouse') {
    result.recommendations = generateLighthouseRecommendations(result.opportunities)
  } else {
    result.findings = generateCodeqlRecommendations(result.findings)
  }

  // Attach result and mark complete
  const job = getScanJob(scanId)
  if (job) {
    job.result = result
    updateScanStatus(scanId, { status: 'completed', progress: 100 })
  }
}

/**
 * Internal helper: Executes a real performance scan via PageSpeed Insights API.
 * Not exported — used only by submitLighthouseScan for non-demo mode.
 */
async function executeLighthouseScan(scanId, url) {
  try {
    updateScanStatus(scanId, { status: 'validating', progress: 10, currentStep: 'Memvalidasi URL...' })

    // Preflight redirect validation
    const redirectResult = await validateRedirects(url)
    if (!redirectResult.safe) {
      const job = getScanJob(scanId)
      if (job) {
        job.error = { message: redirectResult.message, code: redirectResult.code }
        updateScanStatus(scanId, { status: 'failed', progress: 0 })
      }
      return
    }
    const finalUrl = redirectResult.finalUrl || url

    updateScanStatus(scanId, { status: 'running', progress: 30, currentStep: 'Menjalankan analisis performa via PageSpeed Insights...' })

    // Use PageSpeed Insights API
    const result = await runPageSpeedInsights({ url: finalUrl, scanId })

    updateScanStatus(scanId, { status: 'analyzing', progress: 70, currentStep: 'Memproses hasil...' })

    // Enrich with recommendations
    result.recommendations = generateLighthouseRecommendations(result.opportunities)

    updateScanStatus(scanId, { status: 'parsing', progress: 90, currentStep: 'Menyiapkan laporan...' })

    // Save output
    const outputDir = path.resolve(scannerConfig.SCAN_OUTPUT_DIR, scanId)
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(result, null, 2),
      'utf-8'
    )

    // Attach result
    const job = getScanJob(scanId)
    if (job) {
      job.result = result
      updateScanStatus(scanId, { status: 'completed', progress: 100 })
    }
  } catch (err) {
    logger.error(`[${scanId}] Performance scan failed`, err)
    const job = getScanJob(scanId)
    if (job) {
      const isTimeout = err.message?.includes('batas waktu') || err.message?.includes('timeout')
      job.error = {
        message: sanitizeErrorMessage(err.message || 'Pemindaian gagal'),
        code: isTimeout ? 'SCAN_TIMEOUT' : 'SCAN_FAILED'
      }
      updateScanStatus(scanId, { status: isTimeout ? 'timeout' : 'failed', progress: 0 })
    }
  }
}

/**
 * POST /api/scans/lighthouse
 * Submits a Lighthouse scan job.
 */
export const submitLighthouseScan = async (req, res, next) => {
  try {
    const { url, demo } = req.body

    // Validate url is present and non-empty
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Field "url" wajib diisi',
          code: 'INVALID_URL'
        }
      })
    }

    // Validate url length
    if (url.length > 2048) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'URL melebihi batas 2048 karakter',
          code: 'URL_TOO_LONG'
        }
      })
    }

    const safeUrl = req.safeUrl || url

    if (demo === true) {
      // Demo mode: create job and execute demo asynchronously
      const job = createScanJob({ type: 'lighthouse', params: { url: safeUrl, isDemo: true } })

      setImmediate(() => {
        executeDemoScan(job.scanId, 'lighthouse')
      })

      return res.status(202).json({
        success: true,
        message: 'Pemindaian Lighthouse demo berhasil dimulai.',
        data: {
          scanId: job.scanId,
          type: job.type,
          status: job.status,
          progress: job.progress,
          currentStep: job.currentStep,
          isDemo: true,
          createdAt: job.createdAt
        }
      })
    }

    // Real mode: create job and execute Lighthouse scan asynchronously
    const job = createScanJob({ type: 'lighthouse', params: { url: safeUrl, isDemo: false } })

    setImmediate(() => {
      executeLighthouseScan(job.scanId, safeUrl)
    })

    return res.status(202).json({
      success: true,
      message: 'Pemindaian Lighthouse berhasil dimulai.',
      data: {
        scanId: job.scanId,
        type: job.type,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        isDemo: false,
        createdAt: job.createdAt
      }
    })
  } catch (err) {
    if (err.code === 'SCAN_LIMIT_REACHED') {
      return res.status(429).json({
        success: false,
        error: {
          message: sanitizeErrorMessage(err.message),
          code: err.code
        }
      })
    }
    next(err)
  }
}

/**
 * POST /api/scans/codeql
 * Submits a CodeQL scan job.
 * Handles both JSON body (sourceType: github|workspace|demo) and
 * multipart/form-data (sourceType: zip with projectZip file).
 */
export const submitCodeqlScan = async (req, res, next) => {
  try {
    const { sourceType, repoUrl, workspaceId } = req.body || {}

    // Validate sourceType is present and valid
    if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Field "sourceType" tidak valid. Nilai yang diizinkan: github, workspace, demo, zip',
          code: 'INVALID_SOURCE_TYPE'
        }
      })
    }

    // Reject body fields that look like filesystem paths (except for zip uploads where file comes from multer)
    if (sourceType !== 'zip' && bodyContainsPathLikeFields(req.body)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Input mengandung pola path filesystem yang tidak diizinkan',
          code: 'PATH_TRAVERSAL'
        }
      })
    }

    if (sourceType === 'demo') {
      // Demo mode
      const job = createScanJob({ type: 'codeql', params: { sourceType: 'demo', isDemo: true } })

      setImmediate(() => {
        executeDemoScan(job.scanId, 'codeql')
      })

      return res.status(202).json({
        success: true,
        message: 'Pemindaian CodeQL demo berhasil dimulai.',
        data: {
          scanId: job.scanId,
          type: job.type,
          status: job.status,
          progress: job.progress,
          currentStep: job.currentStep,
          isDemo: true,
          createdAt: job.createdAt
        }
      })
    }

    if (sourceType === 'github') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Mode GitHub Repository belum tersedia. Gunakan Upload ZIP Project.',
          code: 'SOURCE_NOT_AVAILABLE'
        }
      })
    }

    if (sourceType === 'workspace') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Mode Workspace belum tersedia. Gunakan Upload ZIP Project.',
          code: 'SOURCE_NOT_AVAILABLE'
        }
      })
    }

    if (sourceType === 'zip') {
      return handleZipUpload(req, res)
    }
  } catch (err) {
    if (err.code === 'SCAN_LIMIT_REACHED') {
      return res.status(429).json({
        success: false,
        error: {
          message: sanitizeErrorMessage(err.message),
          code: err.code
        }
      })
    }
    next(err)
  }
}

/**
 * Handles ZIP file upload for CodeQL scan.
 * Validates the file, creates a scan job, saves ZIP to workspace, triggers async execution.
 */
async function handleZipUpload(req, res) {
  // Check that a file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'File ZIP wajib diunggah. Gunakan field "projectZip".',
        code: 'MISSING_FILE'
      }
    })
  }

  // Validate ZIP magic bytes
  if (!isZipFile(req.file.buffer)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'File yang diunggah bukan file ZIP yang valid',
        code: 'INVALID_ZIP'
      }
    })
  }

  // Create the scan job
  const job = createScanJob({
    type: 'codeql',
    params: {
      sourceType: 'zip',
      isDemo: false
    }
  })

  // Save ZIP to workspace directory
  const workspaceBase = path.resolve(scannerConfig.WORKSPACE_DIR)
  const scanWorkspace = path.join(workspaceBase, job.scanId)

  try {
    await fs.mkdir(scanWorkspace, { recursive: true })
    const zipPath = path.join(scanWorkspace, 'upload.zip')
    await fs.writeFile(zipPath, req.file.buffer)
  } catch (err) {
    logger.error(`[${job.scanId}] Failed to save uploaded ZIP`, err)
    updateScanStatus(job.scanId, { status: 'failed' })
    const updatedJob = getScanJob(job.scanId)
    if (updatedJob) {
      updatedJob.error = {
        message: 'Gagal menyimpan file yang diunggah',
        code: 'UPLOAD_SAVE_FAILED'
      }
    }
    return res.status(500).json({
      success: false,
      error: {
        message: 'Gagal menyimpan file yang diunggah',
        code: 'UPLOAD_SAVE_FAILED'
      }
    })
  }

  // Trigger async execution
  setImmediate(() => {
    executeCodeqlZipScan(job.scanId)
  })

  return res.status(202).json({
    success: true,
    message: 'Pemindaian CodeQL dari ZIP berhasil dimulai.',
    data: {
      scanId: job.scanId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      isDemo: false,
      createdAt: job.createdAt
    }
  })
}

/**
 * Async ZIP scan executor.
 * Extracts ZIP, detects project, runs CodeQL analysis, parses results.
 */
async function executeCodeqlZipScan(scanId) {
  const workspaceBase = path.resolve(scannerConfig.WORKSPACE_DIR)
  const scanWorkspace = path.join(workspaceBase, scanId)
  const zipPath = path.join(scanWorkspace, 'upload.zip')
  const sourceDir = path.join(scanWorkspace, 'source')
  const dbDir = path.join(scanWorkspace, 'codeql-db')
  const sarifPath = path.join(scanWorkspace, 'results.sarif')

  try {
    // Step 1: Validating
    updateScanStatus(scanId, { status: 'validating', progress: 10, currentStep: 'Memvalidasi file ZIP...' })

    // Step 2: Extract ZIP
    updateScanStatus(scanId, { status: 'preparing', progress: 20, currentStep: 'Mengekstrak file ZIP...' })
    await fs.mkdir(sourceDir, { recursive: true })
    const extractResult = await safeExtractZip(zipPath, sourceDir)

    if (!extractResult.success) {
      const job = getScanJob(scanId)
      if (job) {
        job.error = { message: extractResult.error, code: 'EXTRACTION_FAILED' }
        updateScanStatus(scanId, { status: 'failed', progress: 0 })
      }
      await cleanupWorkspace(scanWorkspace)
      return
    }

    // Step 3: Detect JS/TS project
    updateScanStatus(scanId, { status: 'preparing', progress: 30, currentStep: 'Mendeteksi jenis project...' })
    const projectDetection = await detectJsProject(sourceDir)

    if (!projectDetection.supported) {
      const job = getScanJob(scanId)
      if (job) {
        job.error = { message: projectDetection.reason, code: 'UNSUPPORTED_PROJECT' }
        updateScanStatus(scanId, { status: 'failed', progress: 0 })
      }
      await cleanupWorkspace(scanWorkspace)
      return
    }

    // Step 4: Detect CodeQL CLI
    updateScanStatus(scanId, { status: 'preparing', progress: 35, currentStep: 'Memeriksa ketersediaan CodeQL CLI...' })
    const codeqlInfo = detectCodeql()

    if (!codeqlInfo.available) {
      const job = getScanJob(scanId)
      if (job) {
        job.error = { message: codeqlInfo.error, code: 'CODEQL_NOT_FOUND' }
        updateScanStatus(scanId, { status: 'failed', progress: 0 })
      }
      await cleanupWorkspace(scanWorkspace)
      return
    }

    // Step 5: Create CodeQL database
    updateScanStatus(scanId, { status: 'running', progress: 45, currentStep: 'Membuat database CodeQL...' })
    await createDatabase(sourceDir, dbDir)

    // Step 6: Analyze database
    updateScanStatus(scanId, { status: 'analyzing', progress: 65, currentStep: 'Menganalisis keamanan kode...' })
    await analyzeDatabase(dbDir, sarifPath)

    // Step 7: Parse SARIF
    updateScanStatus(scanId, { status: 'parsing', progress: 85, currentStep: 'Memproses hasil analisis...' })
    const sarifRaw = await fs.readFile(sarifPath, 'utf-8')
    const sarifContent = JSON.parse(sarifRaw)
    let findings = parseSarif(sarifContent, sourceDir)

    // Step 8: Enrich with recommendations
    findings = generateCodeqlRecommendations(findings)

    // Build summary
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const finding of findings) {
      if (bySeverity[finding.severity] !== undefined) {
        bySeverity[finding.severity]++
      }
    }

    const result = {
      summary: {
        total: findings.length,
        bySeverity
      },
      findings,
      files: {
        sarif: 'results.sarif',
        findings: 'findings.json'
      }
    }

    // Attach result
    const job = getScanJob(scanId)
    if (job) {
      job.result = result
      updateScanStatus(scanId, { status: 'completed', progress: 100 })
    }

    // Save findings JSON
    const outputDir = path.resolve(scannerConfig.SCAN_OUTPUT_DIR, scanId)
    await fs.mkdir(outputDir, { recursive: true })
    await fs.writeFile(path.join(outputDir, 'findings.json'), JSON.stringify(result, null, 2))

    logger.info(`[${scanId}] CodeQL ZIP scan completed: ${findings.length} findings`)
  } catch (err) {
    logger.error(`[${scanId}] CodeQL ZIP scan failed`, err)
    const job = getScanJob(scanId)
    if (job) {
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('TIMEOUT')
      job.error = {
        message: sanitizeErrorMessage(isTimeout ? 'Waktu pemindaian habis' : (err.message || 'Pemindaian gagal')),
        code: isTimeout ? 'SCAN_TIMEOUT' : 'SCAN_FAILED'
      }
      updateScanStatus(scanId, { status: isTimeout ? 'timeout' : 'failed', progress: 0 })
    }
  } finally {
    // Cleanup workspace if configured
    if (scannerConfig.CLEANUP_WORKSPACE_AFTER_SCAN && !scannerConfig.KEEP_WORKSPACE) {
      await cleanupWorkspace(scanWorkspace)
    }
  }
}

/**
 * Safely removes a workspace directory.
 */
async function cleanupWorkspace(workspacePath) {
  try {
    await fs.rm(workspacePath, { recursive: true, force: true })
  } catch (err) {
    logger.warn(`Failed to cleanup workspace: ${sanitizeErrorMessage(err.message)}`)
  }
}

/**
 * GET /api/scans/:scanId
 * Returns scan job details.
 */
export const getScanDetail = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = getScanJob(scanId)

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
      data: stripInternalFields(job)
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/scans
 * Returns paginated list of scan jobs.
 */
export const getScansList = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50
    const offset = parseInt(req.query.offset, 10) || 0

    const { scans, total } = getAllScans({ limit, offset })

    return res.status(200).json({
      success: true,
      data: {
        scans,
        total,
        limit,
        offset
      }
    })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/scans/:scanId/cancel
 * Cancels an active scan job.
 */
export const cancelScan = async (req, res, next) => {
  try {
    const { scanId } = req.params
    const job = cancelScanJob(scanId)

    return res.status(200).json({
      success: true,
      message: 'Pemindaian berhasil dibatalkan.',
      data: stripInternalFields(job)
    })
  } catch (err) {
    if (err.code === 'SCAN_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          message: sanitizeErrorMessage(err.message),
          code: err.code
        }
      })
    }
    if (err.code === 'CANCEL_NOT_ALLOWED') {
      return res.status(409).json({
        success: false,
        error: {
          message: sanitizeErrorMessage(err.message),
          code: err.code
        }
      })
    }
    next(err)
  }
}

/**
 * DELETE /api/scans/:scanId
 * Deletes a scan job.
 */
export const deleteScan = async (req, res, next) => {
  try {
    const { scanId } = req.params
    deleteScanJob(scanId)

    return res.status(200).json({
      success: true,
      message: 'Pemindaian berhasil dihapus.'
    })
  } catch (err) {
    if (err.code === 'SCAN_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          message: sanitizeErrorMessage(err.message),
          code: err.code
        }
      })
    }
    next(err)
  }
}
