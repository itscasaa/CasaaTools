import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { appConfig } from './config/app.config.js'
import { scannerConfig } from './config/scanner.config.js'
import { logger } from './utils/logger.util.js'
import { apiRateLimiter, previewRateLimiter } from './middleware/rate-limit.middleware.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'

// Import routes
import cloneRoutes from './routes/clone.routes.js'
import jobRoutes from './routes/job.routes.js'
import previewRoutes from './routes/preview.routes.js'
import scanRoutes from './routes/scan.routes.js'
import zapScanRoutes from './routes/zapScan.routes.js'
import { markInterruptedJobs, markStaleJobs } from './services/scan.service.js'
import { startCleanupScheduler } from './services/scan-cleanup.service.js'

const app = express()

// Security Middlewares
app.use(helmet())
app.use(cors({
  origin: appConfig.ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}))

// JSON parsing
app.use(express.json())

// HTTP request logging piped to custom logger utility
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logger.stream }))

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'CasaaTools API',
    status: 'ok',
    phase: 'backend-foundation',
    scanner: {
      performanceProvider: scannerConfig.PERFORMANCE_PROVIDER,
      pageSpeedApiKeyConfigured: !!scannerConfig.PAGESPEED_API_KEY,
      pageSpeedStrategy: scannerConfig.PAGESPEED_STRATEGY,
      pageSpeedLocale: scannerConfig.PAGESPEED_LOCALE
    }
  })
})

// Apply global rate limiter to cloning and jobs endpoints
app.use('/api', apiRateLimiter)
app.use('/preview', previewRateLimiter)

// Mount Routers
app.use('/api/clone', cloneRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/preview', previewRoutes)
app.use('/api/scans', scanRoutes)
app.use('/api/zap-scan', zapScanRoutes)

// Fallback 404 Route Handler
app.use(notFoundMiddleware)

// Central Global Error Handler Middleware
app.use(errorMiddleware)

// Start listening
const server = app.listen(appConfig.PORT, () => {
  logger.info(`CasaaTools Express Server successfully launched in [${appConfig.NODE_ENV}] mode on port ${appConfig.PORT}`)
  const origins = Array.isArray(appConfig.ALLOWED_ORIGINS) ? appConfig.ALLOWED_ORIGINS.join(', ') : appConfig.ALLOWED_ORIGINS
  logger.info(`Allowed CORS origins: ${origins}`)
  markInterruptedJobs()

  // Log scanner configuration (mask API key)
  const maskedKey = scannerConfig.PAGESPEED_API_KEY
    ? `${scannerConfig.PAGESPEED_API_KEY.slice(0, 4)}...${scannerConfig.PAGESPEED_API_KEY.slice(-4)}`
    : '(not configured)'
  logger.info(`Scanner config: provider=${scannerConfig.PERFORMANCE_PROVIDER}, PSI key=${maskedKey}, strategy=${scannerConfig.PAGESPEED_STRATEGY}`)

  // Start scan cleanup scheduler (hourly by default)
  startCleanupScheduler()

  // Start stale job detection (check every 5 minutes)
  const staleCheckInterval = setInterval(() => {
    markStaleJobs()
  }, 5 * 60 * 1000)
  if (staleCheckInterval.unref) staleCheckInterval.unref()
})

// Graceful shutdown
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`)
  server.close(() => {
    logger.info('Server closed.')
    process.exit(0)
  })
}
process.on('SIGTERM', handleShutdown)
process.on('SIGINT', handleShutdown)

export default server
