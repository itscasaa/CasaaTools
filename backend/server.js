import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs-extra'
import mime from 'mime-types'
import { getJobOutputDir } from './utils/path.util.js'
import { appConfig } from './config/app.config.js'
import { scannerConfig } from './config/scanner.config.js'
import { logger } from './utils/logger.util.js'
import { apiRateLimiter, previewRateLimiter } from './middleware/rate-limit.middleware.js'
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js'
import { securityMiddleware } from './middleware/security.middleware.js'

// Import routes
import cloneRoutes from './routes/clone.routes.js'
import jobRoutes from './routes/job.routes.js'
import previewRoutes from './routes/preview.routes.js'
import scanRoutes from './routes/scan.routes.js'
import zapScanRoutes from './routes/zapScan.routes.js'
import authRoutes from './routes/auth.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import promptGeneratorRoutes from './routes/prompt-generator.routes.js'
import scaffoldRoutes from './routes/scaffold.routes.js'
import { authMiddleware } from './middleware/auth.middleware.js'
import { markInterruptedJobs, markStaleJobs } from './services/scan.service.js'
import { startCleanupScheduler } from './services/scan-cleanup.service.js'
import { initDb } from './config/db.config.js'

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
app.use(securityMiddleware)

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

// Middleware to intercept absolute requests from previews using the Referer header
app.use(async (req, res, next) => {
  const referer = req.headers.referer || ''
  const previewMatch = referer.match(/\/preview\/([a-zA-Z0-9_-]+)/)
  
  if (previewMatch && !req.path.startsWith('/api') && !req.path.startsWith('/preview')) {
    const jobId = previewMatch[1]
    try {
      const outputDir = getJobOutputDir(jobId)
      let targetUrl = null
      let baseUrl = null

      // Read job.json to get the original target URL
      const jobJsonPath = path.join(outputDir, 'job.json')
      if (await fs.pathExists(jobJsonPath)) {
        const jobData = await fs.readJson(jobJsonPath)
        targetUrl = jobData.url
      }

      // Check manifest first for local files
      const manifestPath = path.join(outputDir, 'manifest.json')
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath)
        baseUrl = manifest.url
        if (!targetUrl) targetUrl = manifest.url

        let lookupUrl
        try {
          lookupUrl = new URL(req.path, baseUrl).toString()
        } catch (e) {}

        const matchedAsset = manifest.assets?.find(a => {
          if (lookupUrl && a.originalUrl === lookupUrl) return true
          try {
            const assetPath = new URL(a.originalUrl).pathname
            const reqPath = new URL(req.path, 'http://localhost').pathname
            return assetPath === reqPath
          } catch (e) {
            return false
          }
        })

        if (matchedAsset && matchedAsset.status === 'downloaded' && matchedAsset.localPath) {
          const fullAssetPath = path.join(outputDir, matchedAsset.localPath)
          if (await fs.pathExists(fullAssetPath)) {
            const contentType = mime.lookup(fullAssetPath) || 'application/octet-stream'
            res.setHeader('Content-Type', contentType)
            return res.sendFile(fullAssetPath)
          }
        }
      }

      // Fallback 1: filename matching locally
      const filename = path.basename(req.path)
      const possibleDirs = ['js', 'css', 'images', 'fonts', 'media', 'other']
      let localFileFound = false
      for (const dir of possibleDirs) {
        const filePath = path.join(outputDir, 'assets', dir, filename)
        if (await fs.pathExists(filePath)) {
          localFileFound = true
          const contentType = mime.lookup(filePath) || 'application/octet-stream'
          res.setHeader('Content-Type', contentType)
          return res.sendFile(filePath)
        }
      }

      // Fallback 2: Proxy to original website for missing assets/chunks (crucial for single-html and dynamic chunks!)
      if (targetUrl && !localFileFound) {
        try {
          const remoteUrl = new URL(req.url, targetUrl).toString()
          logger.info(`Proxying preview request for missing asset: ${req.url} -> ${remoteUrl}`)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)
          
          const response = await fetch(remoteUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })
          
          clearTimeout(timeoutId)

          if (response.ok) {
            const contentType = response.headers.get('content-type')
            if (contentType) {
              res.setHeader('Content-Type', contentType)
            }
            // Set CORS headers so browser allows it in iframe
            res.setHeader('Access-Control-Allow-Origin', '*')
            
            const arrayBuffer = await response.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)
            return res.send(buffer)
          } else {
            logger.warn(`Proxy request to ${remoteUrl} returned status ${response.status}`)
          }
        } catch (proxyErr) {
          logger.error(`Failed to proxy asset request for ${req.url}: ${proxyErr.message}`)
        }
      }
    } catch (err) {
      logger.error(`Error resolving referer asset for job: ${err.message}`)
    }
  }
  next()
})

// Serve static assets from frontend/dist
const frontendDistPath = path.resolve(process.cwd(), '../frontend/dist')
app.use(express.static(frontendDistPath, {
  setHeaders: (res, filepath) => {
    if (path.basename(filepath) === 'index.html') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
    }
  }
}))

// Apply global rate limiter to cloning and jobs endpoints
app.use('/api', apiRateLimiter)
app.use('/preview', previewRateLimiter)

// Mount Routers
app.use('/api/auth', authRoutes)
app.use('/api/clone', authMiddleware, cloneRoutes)
app.use('/api/jobs', authMiddleware, jobRoutes)
app.use('/preview', previewRoutes) // Preview is kept public so built offline previews can be viewed
app.use('/api/scans', authMiddleware, scanRoutes)
app.use('/api/zap-scan', authMiddleware, zapScanRoutes)
app.use('/api/settings', authMiddleware, settingsRoutes)
app.use('/api/prompt-generator', authMiddleware, promptGeneratorRoutes)
app.use('/api/scaffold', scaffoldRoutes)

// Fallback handler for React app (HashRouter SPA fallback)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/preview')) {
    return next()
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  res.sendFile(path.join(frontendDistPath, 'index.html'))
})

// Fallback 404 Route Handler
app.use(notFoundMiddleware)

// Central Global Error Handler Middleware
app.use(errorMiddleware)

// Start listening
const server = app.listen(appConfig.PORT, async () => {
  logger.info(`CasaaTools Express Server successfully launched in [${appConfig.NODE_ENV}] mode on port ${appConfig.PORT}`)
  
  // Initialize PostgreSQL database tables
  await initDb()

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
