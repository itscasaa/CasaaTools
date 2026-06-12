import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { limitsConfig } from '../config/limits.config.js'
import {
  startScan,
  getScanStatus,
  downloadHtmlReport,
  downloadJsonReport,
  viewHtmlReport
} from '../controllers/zapScan.controller.js'

const isDev = limitsConfig.APP_MODE === 'development'

// Rate limiter for starting ZAP Baseline scans (resource intensive Docker commands)
const zapScanStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 20 : 5, // 20 in dev, 5 in production
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Batas permintaan pemindaian ZAP terlampaui. Silakan tunggu beberapa menit sebelum mencoba lagi.',
        code: 'RATE_LIMITED'
      }
    })
  }
})

const router = Router()

// POST /api/zap-scan/start - Start scan
router.post('/start', zapScanStartLimiter, startScan)

// GET /api/zap-scan/status/:scanId - Get scan status
router.get('/status/:scanId', getScanStatus)

// GET /api/zap-scan/download/:scanId/html - Download HTML report
router.get('/download/:scanId/html', downloadHtmlReport)

// GET /api/zap-scan/download/:scanId/json - Download JSON report
router.get('/download/:scanId/json', downloadJsonReport)

// GET /api/zap-scan/view/:scanId - View HTML report inline
router.get('/view/:scanId', viewHtmlReport)

export default router
