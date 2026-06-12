import fs from 'fs/promises'
import path from 'path'
import { scannerConfig } from '../config/scanner.config.js'
import { isContainedIn } from '../utils/path-containment.js'
import { logger } from '../utils/logger.util.js'

let cleanupInterval = null

/**
 * Starts the automatic cleanup scheduler.
 * Idempotent — calling again clears the previous interval.
 * @param {number} intervalMs - Cleanup interval in milliseconds (default from config)
 */
export function startCleanupScheduler(intervalMs = scannerConfig.CLEANUP_INTERVAL_MS) {
  // Clear previous interval if exists (idempotent)
  if (cleanupInterval) clearInterval(cleanupInterval)

  cleanupInterval = setInterval(() => {
    cleanupExpiredScans().catch(err => logger.error('Scheduled cleanup error:', err))
  }, intervalMs)

  // Don't prevent Node from exiting
  if (cleanupInterval.unref) cleanupInterval.unref()

  logger.info(`Scan cleanup scheduler started (interval: ${intervalMs}ms)`)
}

/**
 * Stops the cleanup scheduler and clears the interval.
 */
export function stopCleanupScheduler() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
  }
}

/**
 * Removes scan output and workspace directories older than maxAgeDays.
 * @param {object} options
 * @param {number} [options.maxAgeDays] - Max age in days (default from config)
 * @param {boolean} [options.dryRun] - If true, does not actually delete
 * @returns {Promise<{scanned: number, deleted: number, skipped: number, errors: number}>}
 */
export async function cleanupExpiredScans({ maxAgeDays, dryRun } = {}) {
  const maxAge = maxAgeDays ?? scannerConfig.SCAN_OUTPUT_MAX_AGE_DAYS
  const maxAgeMs = maxAge * 24 * 60 * 60 * 1000
  const now = Date.now()

  const summary = { scanned: 0, deleted: 0, skipped: 0, errors: 0 }

  // Clean output directories (scan-* prefixed)
  await cleanDirectory(
    path.resolve(scannerConfig.SCAN_OUTPUT_DIR),
    'scan-',
    maxAgeMs,
    now,
    dryRun,
    summary
  )

  // Clean workspace directories (scan-* prefixed)
  await cleanDirectory(
    path.resolve(scannerConfig.WORKSPACE_DIR),
    'scan-',
    maxAgeMs,
    now,
    dryRun,
    summary
  )

  logger.info(
    `Cleanup complete: scanned=${summary.scanned}, deleted=${summary.deleted}, skipped=${summary.skipped}, errors=${summary.errors}${dryRun ? ' (dry run)' : ''}`
  )

  return summary
}

/**
 * Internal helper to clean one base directory of expired scan subdirectories.
 */
async function cleanDirectory(baseDir, prefix, maxAgeMs, now, dryRun, summary) {
  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith(prefix)) continue

      summary.scanned++
      const fullPath = path.resolve(baseDir, entry.name)

      // Verify path containment — never delete outside the configured root
      if (!isContainedIn(fullPath, baseDir)) {
        summary.skipped++
        continue
      }

      try {
        // Check age via directory mtime
        const stat = await fs.stat(fullPath)
        const age = now - stat.mtimeMs

        if (age > maxAgeMs) {
          if (!dryRun) {
            await fs.rm(fullPath, { recursive: true, force: true })
          }
          summary.deleted++
        } else {
          summary.skipped++
        }
      } catch (err) {
        summary.errors++
        logger.error(`Cleanup error for ${entry.name}:`, err)
      }
    }
  } catch (err) {
    // Directory may not exist yet — that's fine
    if (err.code !== 'ENOENT') {
      summary.errors++
      logger.error(`Cleanup error reading ${baseDir}:`, err)
    }
  }
}

/**
 * Removes a specific scan's output and workspace directories by scanId.
 * @param {string} scanId - The scan ID (must match scan-{10 alphanumeric} format)
 * @returns {Promise<{deleted: boolean, output: boolean, workspace: boolean, error?: string}>}
 */
export async function cleanupScanById(scanId) {
  // Validate scanId format
  if (!scanId || !/^scan-[A-Za-z0-9]{10}$/.test(scanId)) {
    return { deleted: false, output: false, workspace: false, error: 'Invalid scanId format' }
  }

  const outputBase = path.resolve(scannerConfig.SCAN_OUTPUT_DIR)
  const workspaceBase = path.resolve(scannerConfig.WORKSPACE_DIR)
  const outputDir = path.resolve(outputBase, scanId)
  const workspaceDir = path.resolve(workspaceBase, scanId)
  const results = { deleted: false, output: false, workspace: false }

  // Delete output directory
  if (isContainedIn(outputDir, outputBase)) {
    try {
      await fs.rm(outputDir, { recursive: true, force: true })
      results.output = true
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`Failed to delete scan output ${scanId}:`, err)
      }
    }
  }

  // Delete workspace directory
  if (isContainedIn(workspaceDir, workspaceBase)) {
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true })
      results.workspace = true
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`Failed to delete scan workspace ${scanId}:`, err)
      }
    }
  }

  results.deleted = results.output || results.workspace
  return results
}
