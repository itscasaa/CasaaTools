import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import fs from 'fs/promises'
import path from 'path'
import { scannerConfig } from '../config/scanner.config.js'
import { isContainedIn, sanitizeErrorMessage } from '../utils/path-containment.js'
import { logger } from '../utils/logger.util.js'

/**
 * Heading label translations (Indonesian).
 */
const HEADING_LABELS = {
  url: 'URL',
  source: 'Sumber',
  sourceLocation: 'Lokasi',
  transferSize: 'Ukuran Transfer',
  wastedBytes: 'Perkiraan Penghematan',
  wastedMs: 'Perkiraan Penghematan',
  totalBytes: 'Ukuran Total',
  resourceSize: 'Ukuran Resource',
  resourceType: 'Tipe',
  entity: 'Pihak',
  cacheLifetimeMs: 'TTL Cache',
  node: 'Elemen',
  statistic: 'Statistik',
  value: 'Nilai',
  description: 'Deskripsi',
  duration: 'Durasi',
  startTime: 'Mulai',
  blockingTime: 'Waktu Blocking',
  scriptUrl: 'Script URL',
  mainThreadTime: 'Waktu Main Thread',
  groupLabel: 'Kategori',
  subItems: 'Detail'
}

/**
 * Formats bytes into a human-readable string (B, KiB, MiB).
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

/**
 * Formats milliseconds into a human-readable string.
 *
 * @param {number} ms
 * @returns {string}
 */
export function formatMs(ms) {
  if (ms === 0 || ms === undefined || ms === null) return '0 ms'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

/**
 * Detects whether Chrome/Chromium is available on the system.
 * Checks SCANNER_CHROME_PATH first, then falls back to chrome-launcher auto-detection.
 *
 * @returns {{ available: boolean, chromePath?: string, error?: string }}
 */
export function detectChrome() {
  try {
    // Check explicit config path first
    if (scannerConfig.CHROME_PATH) {
      return { available: true, chromePath: scannerConfig.CHROME_PATH }
    }

    // Use chrome-launcher's auto-detection
    const detected = chromeLauncher.Launcher.getFirstInstallation()
    if (detected) {
      return { available: true, chromePath: detected }
    }

    return {
      available: false,
      error: 'Chrome/Chromium tidak ditemukan. Pasang Chrome atau atur SCANNER_CHROME_PATH.'
    }
  } catch {
    return {
      available: false,
      error: 'Chrome/Chromium tidak ditemukan. Pasang Chrome atau atur SCANNER_CHROME_PATH.'
    }
  }
}

/**
 * Extracts integer 0-100 scores from the Lighthouse result object.
 *
 * @param {object} lhr - The Lighthouse result (.lhr property from lighthouse run)
 * @returns {{ performance: number, accessibility: number, bestPractices: number, seo: number }}
 */
export function extractScores(lhr) {
  const categories = lhr.categories || {}

  const getScore = (key) => {
    const cat = categories[key]
    if (!cat || cat.score === null || cat.score === undefined) return 0
    return Math.round(cat.score * 100)
  }

  return {
    performance: getScore('performance'),
    accessibility: getScore('accessibility'),
    bestPractices: getScore('best-practices'),
    seo: getScore('seo')
  }
}

/**
 * Extracts Core Web Vitals metrics from the Lighthouse result.
 *
 * @param {object} lhr - The Lighthouse result
 * @returns {{ fcp: number, lcp: number, tbt: number, cls: number, speedIndex: number }}
 */
export function extractCoreWebVitals(lhr) {
  const audits = lhr.audits || {}

  const getNumericValue = (auditId) => {
    const audit = audits[auditId]
    if (!audit || audit.numericValue === undefined || audit.numericValue === null) return 0
    return audit.numericValue
  }

  return {
    fcp: Math.round(getNumericValue('first-contentful-paint')),
    lcp: Math.round(getNumericValue('largest-contentful-paint')),
    tbt: Math.round(getNumericValue('total-blocking-time')),
    cls: parseFloat(getNumericValue('cumulative-layout-shift').toFixed(4)),
    speedIndex: Math.round(getNumericValue('speed-index'))
  }
}

/**
 * Extracts performance opportunities from the Lighthouse result.
 * Capped at the configured MAX_OPPORTUNITIES limit.
 *
 * @param {object} lhr - The Lighthouse result
 * @param {number} [max] - Maximum number of opportunities to return
 * @returns {Array<{ id: string, title: string, description: string, estimatedSavingsMs: number }>}
 */
export function extractOpportunities(lhr, max = scannerConfig.MAX_OPPORTUNITIES) {
  const audits = lhr.audits || {}
  const opportunities = []

  for (const [id, audit] of Object.entries(audits)) {
    // Opportunities have details.type === 'opportunity' or have overallSavingsMs
    const savings = audit.details?.overallSavingsMs
    if (savings && savings > 0) {
      opportunities.push({
        id,
        title: audit.title || id,
        description: audit.description || '',
        estimatedSavingsMs: Math.round(savings)
      })
    }
  }

  // Sort by savings descending
  opportunities.sort((a, b) => b.estimatedSavingsMs - a.estimatedSavingsMs)

  return opportunities.slice(0, max)
}

/**
 * Extracts diagnostic audits from the Lighthouse result.
 * Capped at the configured MAX_DIAGNOSTICS limit.
 *
 * @param {object} lhr - The Lighthouse result
 * @param {number} [max] - Maximum number of diagnostics to return
 * @returns {Array<{ id: string, title: string, description: string, details: string }>}
 */
export function extractDiagnostics(lhr, max = scannerConfig.MAX_DIAGNOSTICS) {
  const audits = lhr.audits || {}
  const categories = lhr.categories || {}
  const diagnostics = []

  // Get audit refs from performance category that are 'diagnostics' group
  const perfCategory = categories.performance
  if (perfCategory && perfCategory.auditRefs) {
    for (const ref of perfCategory.auditRefs) {
      if (ref.group === 'diagnostics') {
        const audit = audits[ref.id]
        if (audit && audit.score !== null && audit.score < 1) {
          diagnostics.push({
            id: ref.id,
            title: audit.title || ref.id,
            description: audit.description || '',
            details: audit.displayValue || ''
          })
        }
      }
    }
  }

  return diagnostics.slice(0, max)
}

/**
 * Extracts a display URL (path only, truncated) from a full URL string.
 *
 * @param {string} urlStr
 * @returns {{ displayUrl: string, origin: string }}
 */
function extractUrlParts(urlStr) {
  try {
    const parsed = new URL(urlStr)
    let displayUrl = parsed.pathname + parsed.search
    if (displayUrl.length > 60) {
      displayUrl = displayUrl.substring(0, 57) + '...'
    }
    return { displayUrl, origin: parsed.hostname }
  } catch {
    // Not a valid URL, return as-is
    const truncated = urlStr && urlStr.length > 60 ? urlStr.substring(0, 57) + '...' : (urlStr || '')
    return { displayUrl: truncated, origin: '' }
  }
}

/**
 * Builds table headings from Lighthouse audit details headings.
 *
 * @param {Array} headings - Raw headings from audit.details.headings
 * @returns {Array<{ key: string, label: string }>}
 */
function buildTableHeadings(headings) {
  if (!headings || !Array.isArray(headings)) return []
  return headings
    .filter(h => h && h.key)
    .map(h => ({
      key: h.key,
      label: HEADING_LABELS[h.key] || h.label || h.key
    }))
}

/**
 * Builds table items from Lighthouse audit details items.
 *
 * @param {Array} items - Raw items from audit.details.items
 * @returns {Array<object>}
 */
function buildTableItems(items) {
  if (!items || !Array.isArray(items)) return []
  return items.map(item => {
    const result = {}

    // URL fields
    if (item.url) {
      result.url = item.url
      const parts = extractUrlParts(item.url)
      result.displayUrl = parts.displayUrl
      result.origin = parts.origin
    }

    // Byte fields
    if (item.transferSize !== undefined) {
      result.transferSize = item.transferSize
      result.transferSizeFormatted = formatBytes(item.transferSize)
    }
    if (item.wastedBytes !== undefined) {
      result.wastedBytes = item.wastedBytes
      result.wastedBytesFormatted = formatBytes(item.wastedBytes)
    }
    if (item.totalBytes !== undefined) {
      result.totalBytes = item.totalBytes
      result.totalBytesFormatted = formatBytes(item.totalBytes)
    }

    // Time fields
    if (item.wastedMs !== undefined) {
      result.wastedMs = item.wastedMs
      result.wastedMsFormatted = formatMs(item.wastedMs)
    }

    // Node snippet
    if (item.node?.snippet) {
      result.node = item.node.snippet
    }

    // Pass through other simple values (statistic, value, etc.)
    for (const [key, val] of Object.entries(item)) {
      if (result[key] === undefined && typeof val !== 'object') {
        result[key] = val
      }
    }

    return result
  })
}

/**
 * Extracts detailed opportunities with table data from the Lighthouse result.
 *
 * @param {object} lhr - The Lighthouse result
 * @param {number} [max] - Maximum number of opportunities to return
 * @returns {Array<object>}
 */
export function extractDetailedOpportunities(lhr, max = scannerConfig.MAX_OPPORTUNITIES) {
  const audits = lhr.audits || {}
  const categories = lhr.categories || {}
  const opportunities = []

  // Get performance category audit refs that are opportunities
  const perfCategory = categories.performance
  const opportunityIds = new Set()

  if (perfCategory && perfCategory.auditRefs) {
    for (const ref of perfCategory.auditRefs) {
      if (ref.group === 'load-opportunities') {
        opportunityIds.add(ref.id)
      }
    }
  }

  for (const [id, audit] of Object.entries(audits)) {
    const isOpportunity = opportunityIds.has(id) ||
      audit.details?.type === 'opportunity' ||
      (audit.details?.overallSavingsMs && audit.details.overallSavingsMs > 0)

    if (!isOpportunity) continue

    const savingsBytes = audit.details?.overallSavingsBytes || 0
    const savingsMs = audit.details?.overallSavingsMs || 0

    // Extract badges from metricSavings
    const badges = audit.metricSavings
      ? Object.keys(audit.metricSavings).filter(k => audit.metricSavings[k] > 0)
      : []

    // Build table
    const table = {
      headings: buildTableHeadings(audit.details?.headings),
      items: buildTableItems(audit.details?.items)
    }

    opportunities.push({
      id,
      title: audit.title || id,
      description: audit.description || '',
      displayValue: audit.displayValue || '',
      savings: {
        bytes: savingsBytes,
        ms: savingsMs,
        formatted: savingsBytes > 0 ? formatBytes(savingsBytes) : formatMs(savingsMs)
      },
      badges,
      table
    })
  }

  // Sort by total savings descending (bytes + ms weighted)
  opportunities.sort((a, b) => {
    const savingsA = a.savings.bytes + (a.savings.ms * 100)
    const savingsB = b.savings.bytes + (b.savings.ms * 100)
    return savingsB - savingsA
  })

  return opportunities.slice(0, max)
}

/**
 * Extracts detailed diagnostics with table data from the Lighthouse result.
 *
 * @param {object} lhr - The Lighthouse result
 * @param {number} [max] - Maximum number of diagnostics to return
 * @returns {Array<object>}
 */
export function extractDetailedDiagnostics(lhr, max = scannerConfig.MAX_DIAGNOSTICS) {
  const audits = lhr.audits || {}
  const categories = lhr.categories || {}
  const diagnostics = []

  // Get audit refs from performance category that are 'diagnostics' group
  const perfCategory = categories.performance
  if (perfCategory && perfCategory.auditRefs) {
    for (const ref of perfCategory.auditRefs) {
      if (ref.group === 'diagnostics') {
        const audit = audits[ref.id]
        if (audit && audit.score !== null && audit.score < 1) {
          // Extract badges from metricSavings
          const badges = audit.metricSavings
            ? Object.keys(audit.metricSavings).filter(k => audit.metricSavings[k] > 0)
            : []

          // Build table
          const table = {
            headings: buildTableHeadings(audit.details?.headings),
            items: buildTableItems(audit.details?.items)
          }

          diagnostics.push({
            id: ref.id,
            title: audit.title || ref.id,
            description: audit.description || '',
            displayValue: audit.displayValue || '',
            badges,
            table
          })
        }
      }
    }
  }

  return diagnostics.slice(0, max)
}

/**
 * Writes Lighthouse output files to the specified directory.
 * Validates path containment before writing.
 *
 * @param {string} outputDir - Target output directory (must be within SCAN_OUTPUT_DIR)
 * @param {object} lhr - The Lighthouse result object
 * @param {object} summary - The summary object to write
 * @param {string} htmlReport - The HTML report string
 */
async function writeOutputFiles(outputDir, lhr, summary, htmlReport) {
  const resolvedOutputDir = path.resolve(outputDir)
  const resolvedBaseDir = path.resolve(scannerConfig.SCAN_OUTPUT_DIR)

  if (!isContainedIn(resolvedOutputDir, resolvedBaseDir)) {
    throw new Error('Output directory is outside the allowed base directory')
  }

  await fs.mkdir(resolvedOutputDir, { recursive: true })

  const resultPath = path.join(resolvedOutputDir, 'lighthouse-result.json')
  const summaryPath = path.join(resolvedOutputDir, 'summary.json')
  const reportPath = path.join(resolvedOutputDir, 'lighthouse-report.html')

  // Verify each file path is contained
  if (!isContainedIn(resultPath, resolvedBaseDir)) {
    throw new Error('Result file path is outside the allowed base directory')
  }
  if (!isContainedIn(summaryPath, resolvedBaseDir)) {
    throw new Error('Summary file path is outside the allowed base directory')
  }
  if (!isContainedIn(reportPath, resolvedBaseDir)) {
    throw new Error('Report file path is outside the allowed base directory')
  }

  await Promise.all([
    fs.writeFile(resultPath, JSON.stringify(lhr, null, 2), 'utf-8'),
    fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf-8'),
    fs.writeFile(reportPath, htmlReport || '', 'utf-8')
  ])
}

/**
 * Selects the median result from an array of LHR results based on performance score.
 *
 * @param {Array<object>} results - Array of { lhr, report } objects
 * @returns {object} The selected result with median performance score
 */
function selectMedianResult(results) {
  if (results.length === 1) return results[0]

  // Sort by performance score
  const sorted = [...results].sort((a, b) => {
    const scoreA = a.lhr.categories?.performance?.score || 0
    const scoreB = b.lhr.categories?.performance?.score || 0
    return scoreA - scoreB
  })

  // Pick the median (middle element)
  const medianIndex = Math.floor(sorted.length / 2)
  return sorted[medianIndex]
}

/**
 * Runs a single Lighthouse audit.
 * Launches Chrome, runs audit, kills Chrome — one complete cycle per run.
 *
 * @param {{ scanId: string, url: string, runIndex: number }} params
 * @returns {Promise<{ lhr: object, report: string }>}
 */
async function runSingleLighthouseAudit({ scanId, url, runIndex }) {
  let chrome = null
  let timer = null

  try {
    // Launch Chrome headless
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
      chromePath: scannerConfig.CHROME_PATH || undefined
    })

    logger.info(`[${scanId}] Run ${runIndex + 1}: Chrome launched on port ${chrome.port}`)

    const lighthouseConfig = {
      extends: 'lighthouse:default',
      settings: {
        formFactor: scannerConfig.LIGHTHOUSE_FORM_FACTOR,
        throttlingMethod: scannerConfig.LIGHTHOUSE_THROTTLING,
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75
        },
        onlyCategories: scannerConfig.LIGHTHOUSE_CATEGORIES
      }
    }

    // Create the audit function
    const runAudit = async () => {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: ['json', 'html']
      }, lighthouseConfig)
      return result
    }

    // Timeout enforcement using Promise.race
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), scannerConfig.LIGHTHOUSE_TIMEOUT_MS)
    })

    const result = await Promise.race([runAudit(), timeoutPromise])

    // Clear timeout since audit completed successfully
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    const lhr = result.lhr
    const htmlReport = result.report ? result.report[1] : ''

    logger.info(`[${scanId}] Run ${runIndex + 1}: completed with performance score ${Math.round((lhr.categories?.performance?.score || 0) * 100)}`)

    return { lhr, report: htmlReport }
  } finally {
    // Always clear timeout
    if (timer) {
      clearTimeout(timer)
    }

    // Always close Chrome to prevent zombie processes
    if (chrome) {
      try {
        await chrome.kill()
        logger.info(`[${scanId}] Run ${runIndex + 1}: Chrome process killed`)
      } catch (killErr) {
        logger.error(`[${scanId}] Run ${runIndex + 1}: Failed to kill Chrome process`, killErr)
      }
    }
  }
}

/**
 * Runs a full Lighthouse scan against the specified URL.
 * Runs Lighthouse multiple times (configurable) for stability and selects the median result.
 * Always closes Chrome after EACH individual run.
 *
 * @param {{ scanId: string, url: string, outputDir: string }} params
 * @returns {Promise<object>} The parsed Lighthouse result matching the expected shape
 */
export async function runLighthouseScan({ scanId, url, outputDir }) {
  const totalRuns = scannerConfig.LIGHTHOUSE_RUNS
  const successfulResults = []
  const allPerformanceScores = []
  const failedRunWarnings = []

  logger.info(`[${scanId}] Starting multi-run Lighthouse scan (${totalRuns} runs, strategy: ${scannerConfig.LIGHTHOUSE_RESULT_STRATEGY})`)

  for (let i = 0; i < totalRuns; i++) {
    try {
      const result = await runSingleLighthouseAudit({ scanId, url, runIndex: i })
      successfulResults.push(result)
      const perfScore = Math.round((result.lhr.categories?.performance?.score || 0) * 100)
      allPerformanceScores.push(perfScore)
    } catch (err) {
      const warning = `Run ${i + 1} failed: ${err.message}`
      logger.warn(`[${scanId}] ${warning}`)
      failedRunWarnings.push(warning)
    }
  }

  // If all runs failed, throw an error
  if (successfulResults.length === 0) {
    throw new Error(`Semua ${totalRuns} run Lighthouse gagal. ${failedRunWarnings.join('; ')}`)
  }

  // Select the result based on strategy (median)
  const selectedResult = selectMedianResult(successfulResults)
  const selectedLhr = selectedResult.lhr
  const htmlReport = selectedResult.report

  // Extract structured data
  const scores = extractScores(selectedLhr)
  const coreWebVitals = extractCoreWebVitals(selectedLhr)
  const opportunities = extractDetailedOpportunities(selectedLhr)
  const diagnostics = extractDetailedDiagnostics(selectedLhr)

  const stability = {
    runCount: successfulResults.length,
    strategy: scannerConfig.LIGHTHOUSE_RESULT_STRATEGY,
    performanceScores: allPerformanceScores,
    selectedScore: scores.performance,
    variance: allPerformanceScores.length > 1
      ? Math.max(...allPerformanceScores) - Math.min(...allPerformanceScores)
      : 0,
    warnings: failedRunWarnings.length > 0 ? failedRunWarnings : undefined
  }

  const summary = {
    scores,
    coreWebVitals,
    stability,
    opportunities,
    diagnostics
  }

  // Write output files
  await writeOutputFiles(outputDir, selectedLhr, summary, htmlReport)

  logger.info(`[${scanId}] Lighthouse multi-run scan completed (${successfulResults.length}/${totalRuns} successful, selected score: ${scores.performance})`)

  return {
    scores,
    coreWebVitals,
    stability,
    opportunities,
    diagnostics,
    recommendations: [],
    settings: {
      formFactor: scannerConfig.LIGHTHOUSE_FORM_FACTOR,
      throttling: scannerConfig.LIGHTHOUSE_THROTTLING
    },
    files: {
      result: 'lighthouse-result.json',
      summary: 'summary.json',
      report: 'lighthouse-report.html'
    }
  }
}
