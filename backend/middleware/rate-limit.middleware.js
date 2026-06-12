import rateLimit from 'express-rate-limit'
import { limitsConfig } from '../config/limits.config.js'

const isDev = limitsConfig.APP_MODE === 'development'

// Stricter rate limit for submit clone requests (POST /api/clone)
const cloneSubmitLimiter = rateLimit({
  windowMs: isDev ? limitsConfig.DEV_CLONE_RATE_LIMIT_WINDOW_MS : limitsConfig.PROD_CLONE_RATE_LIMIT_WINDOW_MS,
  max: isDev ? limitsConfig.DEV_CLONE_RATE_LIMIT_MAX : limitsConfig.PROD_CLONE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many snapshot submissions. Please wait a moment and try again.',
        code: 'RATE_LIMITED'
      }
    })
  }
})

// More generous rate limit for polling job status (GET /api/jobs/:jobId)
const jobStatusLimiter = rateLimit({
  windowMs: isDev ? limitsConfig.DEV_POLL_RATE_LIMIT_WINDOW_MS : limitsConfig.PROD_POLL_RATE_LIMIT_WINDOW_MS,
  max: isDev ? limitsConfig.DEV_POLL_RATE_LIMIT_MAX : limitsConfig.PROD_POLL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED'
      }
    })
  }
})

// Rate limiter for static/preview pages and assets (/preview/:jobId)
export const previewRateLimiter = rateLimit({
  windowMs: isDev ? limitsConfig.DEV_PREVIEW_RATE_LIMIT_WINDOW_MS : limitsConfig.PROD_PREVIEW_RATE_LIMIT_WINDOW_MS,
  max: isDev ? limitsConfig.DEV_PREVIEW_RATE_LIMIT_MAX : limitsConfig.PROD_PREVIEW_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED'
      }
    })
  }
})

export const apiRateLimiter = (req, res, next) => {
  if (req.path.startsWith('/clone') && req.method === 'POST') {
    return cloneSubmitLimiter(req, res, next)
  }
  return jobStatusLimiter(req, res, next)
}

