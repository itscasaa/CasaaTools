import { scannerConfig } from '../config/scanner.config.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'
import { logger } from '../utils/logger.util.js'
import {
  extractScores,
  extractCoreWebVitals,
  extractDetailedOpportunities,
  extractDetailedDiagnostics,
  formatBytes,
  formatMs
} from './lighthouse.service.js'

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/**
 * Calls the Google PageSpeed Insights API v5.
 * 
 * @param {{ url: string, scanId: string }} params
 * @returns {Promise<object>} Normalized result matching the frontend shape
 */
export async function runPageSpeedInsights({ url, scanId }) {
  const params = new URLSearchParams({
    url,
    strategy: scannerConfig.PAGESPEED_STRATEGY,
    locale: scannerConfig.PAGESPEED_LOCALE
  })

  // Add categories
  for (const cat of scannerConfig.PAGESPEED_CATEGORIES) {
    params.append('category', cat)
  }

  // Add API key if configured
  if (scannerConfig.PAGESPEED_API_KEY) {
    params.set('key', scannerConfig.PAGESPEED_API_KEY)
  }

  const apiUrl = `${PSI_API_URL}?${params.toString()}`

  // Log without exposing API key
  const safeLogUrl = apiUrl.replace(/key=[^&]+/, 'key=***')
  logger.info(`[${scanId}] PSI request URL: ${safeLogUrl}`)

  logger.info(`[${scanId}] Calling PageSpeed Insights API for: ${url}`)

  // Fetch with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), scannerConfig.PAGESPEED_TIMEOUT_MS)

  try {
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      return handlePsiError(response.status, errorBody)
    }

    const data = await response.json()
    const lhr = data.lighthouseResult

    if (!lhr) {
      throw new Error('PageSpeed Insights API gagal memproses URL ini.')
    }

    // Parse using existing helpers (same LHR format)
    const scores = extractScores(lhr)
    const coreWebVitals = extractCoreWebVitals(lhr)
    const opportunities = extractDetailedOpportunities(lhr)
    const diagnostics = extractDetailedDiagnostics(lhr)

    // Extract screenshot if available
    const screenshotAudit = lhr.audits?.['final-screenshot']
    const screenshot = screenshotAudit?.details?.data || null

    logger.info(`[${scanId}] PSI completed: performance=${scores.performance}`)

    return {
      provider: 'pagespeed',
      providerLabel: 'Google PageSpeed Insights',
      scores,
      coreWebVitals,
      stability: {
        provider: 'Google PageSpeed Insights',
        strategy: scannerConfig.PAGESPEED_STRATEGY,
        note: 'Hasil diambil dari Google PageSpeed Insights API.'
      },
      opportunities,
      diagnostics,
      recommendations: [],
      screenshot,
      settings: {
        provider: 'pagespeed',
        strategy: scannerConfig.PAGESPEED_STRATEGY,
        locale: scannerConfig.PAGESPEED_LOCALE
      },
      files: {
        summary: 'summary.json',
        result: 'pagespeed-result.json'
      }
    }
  } catch (err) {
    clearTimeout(timeoutId)

    if (err.name === 'AbortError') {
      throw new Error('Pemindaian PageSpeed melewati batas waktu.')
    }

    // Don't expose raw error details that might contain API key or internal info
    const safeMessage = sanitizeErrorMessage(err.message || 'PageSpeed Insights API gagal memproses URL ini.')
    throw new Error(safeMessage)
  }
}

/**
 * Maps PSI API error responses to Indonesian messages.
 */
function handlePsiError(status, errorBody) {
  const reason = errorBody?.error?.message || ''

  if (status === 429 || reason.includes('quota') || reason.includes('RATE_LIMIT')) {
    throw new Error('Kuota PageSpeed Insights API tercapai. Coba lagi nanti atau tambahkan API key.')
  }
  if (status === 400) {
    if (reason.includes('INVALID_URL') || reason.includes('Cannot resolve')) {
      throw new Error('URL tidak dapat dianalisis oleh PageSpeed Insights.')
    }
    if (reason.includes('API_KEY')) {
      throw new Error('API key PageSpeed Insights tidak valid atau dibatasi.')
    }
    throw new Error('PageSpeed Insights API menolak request. Periksa URL dan coba lagi.')
  }
  if (status === 401) {
    throw new Error('API key PageSpeed Insights tidak valid atau tidak memiliki izin.')
  }
  if (status === 403 || reason.includes('API_KEY_INVALID') || reason.includes('forbidden')) {
    throw new Error('API key PageSpeed Insights tidak valid.')
  }
  if (status === 500 || status === 503) {
    throw new Error('PageSpeed Insights API sedang tidak tersedia. Coba lagi nanti.')
  }

  throw new Error('PageSpeed Insights API gagal memproses URL ini.')
}
