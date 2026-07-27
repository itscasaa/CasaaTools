import express from 'express'
import fs from 'fs-extra'
import path from 'path'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { scannerConfig } from '../config/scanner.config.js'
import { appConfig } from '../config/app.config.js'
import { logger } from '../utils/logger.util.js'

const router = express.Router()
const settingsFilePath = path.resolve(process.cwd(), 'data/settings.json')

// Helper to ensure settings file exists
const ensureSettingsFile = async () => {
  await fs.ensureDir(path.dirname(settingsFilePath))
  if (!(await fs.pathExists(settingsFilePath))) {
    const defaultSettings = {
      performanceProvider: scannerConfig.PERFORMANCE_PROVIDER || 'pagespeed',
      pageSpeedApiKey: scannerConfig.PAGESPEED_API_KEY || '',
      pageSpeedStrategy: scannerConfig.PAGESPEED_STRATEGY || 'mobile',
      maxConcurrentScans: scannerConfig.MAX_CONCURRENT_SCANS || 2,
      scanStaleAfterMinutes: scannerConfig.SCAN_STALE_AFTER_MINUTES || 30,
      maxRepoSizeMb: scannerConfig.MAX_REPO_SIZE_MB || 200,
      scanOutputMaxAgeDays: scannerConfig.SCAN_OUTPUT_MAX_AGE_DAYS || 7,
      allowedOrigins: Array.isArray(appConfig.ALLOWED_ORIGINS) 
        ? appConfig.ALLOWED_ORIGINS.join(', ') 
        : appConfig.ALLOWED_ORIGINS
    }
    await fs.writeJson(settingsFilePath, defaultSettings, { spaces: 2 })
  }
}

// Get Settings
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Akses ditolak. Pengaturan sistem hanya dapat diakses oleh Administrator.' }
      })
    }
    await ensureSettingsFile()
    const settings = await fs.readJson(settingsFilePath)
    res.status(200).json({
      success: true,
      data: settings
    })
  } catch (err) {
    next(err)
  }
})

// Update Settings
router.put('/', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Akses ditolak. Pengaturan sistem hanya dapat diakses oleh Administrator.' }
      })
    }
    await ensureSettingsFile()
    const currentSettings = await fs.readJson(settingsFilePath)
    const newSettings = { ...currentSettings, ...req.body }

    // Save to file
    await fs.writeJson(settingsFilePath, newSettings, { spaces: 2 })

    // Apply to runtime config dynamically
    if (newSettings.performanceProvider) {
      scannerConfig.PERFORMANCE_PROVIDER = newSettings.performanceProvider
    }
    if (newSettings.pageSpeedApiKey !== undefined) {
      scannerConfig.PAGESPEED_API_KEY = newSettings.pageSpeedApiKey
    }
    if (newSettings.pageSpeedStrategy) {
      scannerConfig.PAGESPEED_STRATEGY = newSettings.pageSpeedStrategy
    }
    if (newSettings.maxConcurrentScans) {
      scannerConfig.MAX_CONCURRENT_SCANS = parseInt(newSettings.maxConcurrentScans, 10)
    }
    if (newSettings.scanStaleAfterMinutes) {
      scannerConfig.SCAN_STALE_AFTER_MINUTES = parseInt(newSettings.scanStaleAfterMinutes, 10)
    }
    if (newSettings.maxRepoSizeMb) {
      scannerConfig.MAX_REPO_SIZE_MB = parseInt(newSettings.maxRepoSizeMb, 10)
    }
    if (newSettings.scanOutputMaxAgeDays) {
      scannerConfig.SCAN_OUTPUT_MAX_AGE_DAYS = parseInt(newSettings.scanOutputMaxAgeDays, 10)
    }
    if (newSettings.allowedOrigins) {
      const origins = newSettings.allowedOrigins
      appConfig.ALLOWED_ORIGINS = origins.includes(',') 
        ? origins.split(',').map(o => o.trim()) 
        : origins
    }

    logger.info('System settings updated dynamically through API.')

    res.status(200).json({
      success: true,
      message: 'Pengaturan berhasil disimpan.',
      data: newSettings
    })
  } catch (err) {
    next(err)
  }
})

// Clear Snapshots & Scans (Maintenance)
router.delete('/cleanup', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { message: 'Akses ditolak. Operasi pembersihan sandbox hanya dapat dipicu oleh Administrator.' }
      })
    }
    const outputDir = path.resolve(scannerConfig.SCAN_OUTPUT_DIR || './output')
    const workspaceDir = path.resolve(scannerConfig.WORKSPACE_DIR || './workspaces')
    
    let deletedCount = 0

    // Function to empty a directory except .gitkeep
    const cleanDir = async (dirPath) => {
      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath)
        for (const file of files) {
          if (file === '.gitkeep') continue
          await fs.remove(path.join(dirPath, file))
          deletedCount++
        }
      }
    }

    await cleanDir(outputDir)
    await cleanDir(workspaceDir)

    logger.warn(`Maintenance cleanup triggered. Cleared ${deletedCount} item(s) from sandbox workspace.`)

    res.status(200).json({
      success: true,
      message: `Pembersihan berhasil. Berhasil menghapus ${deletedCount} item dari penyimpanan sandbox.`
    })
  } catch (err) {
    next(err)
  }
})

export default router
