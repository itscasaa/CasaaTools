import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import path from 'path'

// Mock fs/promises before importing the service
vi.mock('fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    stat: vi.fn(),
    rm: vi.fn()
  }
}))

// Mock the logger to avoid console noise and verify logging
vi.mock('../../utils/logger.util.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock scanner config with known values
vi.mock('../../config/scanner.config.js', () => ({
  scannerConfig: {
    SCAN_OUTPUT_DIR: './output',
    WORKSPACE_DIR: './workspaces',
    SCAN_OUTPUT_MAX_AGE_DAYS: 7,
    CLEANUP_INTERVAL_MS: 3600000
  }
}))

import fs from 'fs/promises'
import { logger } from '../../utils/logger.util.js'
import {
  startCleanupScheduler,
  stopCleanupScheduler,
  cleanupExpiredScans,
  cleanupScanById
} from '../../services/scan-cleanup.service.js'

describe('scan-cleanup.service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    stopCleanupScheduler()
    vi.useRealTimers()
  })

  describe('cleanupExpiredScans', () => {
    it('should delete old scan output folder (mtime > maxAge)', async () => {
      const now = Date.now()
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

      fs.readdir.mockImplementation((dir) => {
        return Promise.resolve([
          { name: 'scan-abcdefghij', isDirectory: () => true }
        ])
      })

      fs.stat.mockResolvedValue({ mtimeMs: eightDaysAgo })
      fs.rm.mockResolvedValue(undefined)

      const summary = await cleanupExpiredScans({ maxAgeDays: 7 })

      expect(summary.deleted).toBe(2) // one from output, one from workspaces
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('scan-abcdefghij'),
        { recursive: true, force: true }
      )
    })

    it('should keep recent scan output folder (mtime < maxAge)', async () => {
      const now = Date.now()
      const oneDayAgo = now - (1 * 24 * 60 * 60 * 1000)

      fs.readdir.mockImplementation(() => {
        return Promise.resolve([
          { name: 'scan-abcdefghij', isDirectory: () => true }
        ])
      })

      fs.stat.mockResolvedValue({ mtimeMs: oneDayAgo })
      fs.rm.mockResolvedValue(undefined)

      const summary = await cleanupExpiredScans({ maxAgeDays: 7 })

      expect(summary.skipped).toBe(2) // one from output, one from workspaces
      expect(summary.deleted).toBe(0)
      expect(fs.rm).not.toHaveBeenCalled()
    })

    it('should not delete folder outside configured root (path containment)', async () => {
      const now = Date.now()
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

      // Return a directory that doesn't start with 'scan-' — won't be processed
      fs.readdir.mockImplementation(() => {
        return Promise.resolve([
          { name: 'other-folder', isDirectory: () => true },
          { name: 'scan-abcdefghij', isDirectory: () => true }
        ])
      })

      fs.stat.mockResolvedValue({ mtimeMs: eightDaysAgo })
      fs.rm.mockResolvedValue(undefined)

      const summary = await cleanupExpiredScans({ maxAgeDays: 7 })

      // 'other-folder' doesn't start with 'scan-' so it's not scanned
      expect(summary.scanned).toBe(2) // only scan- prefixed dirs
      expect(summary.deleted).toBe(2)
    })

    it('should not actually delete when dryRun is true', async () => {
      const now = Date.now()
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

      fs.readdir.mockImplementation(() => {
        return Promise.resolve([
          { name: 'scan-abcdefghij', isDirectory: () => true }
        ])
      })

      fs.stat.mockResolvedValue({ mtimeMs: eightDaysAgo })
      fs.rm.mockResolvedValue(undefined)

      const summary = await cleanupExpiredScans({ maxAgeDays: 7, dryRun: true })

      expect(summary.deleted).toBe(2) // counts as "would delete"
      expect(fs.rm).not.toHaveBeenCalled()
    })

    it('should handle delete errors gracefully (does not throw)', async () => {
      const now = Date.now()
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000)

      fs.readdir.mockImplementation(() => {
        return Promise.resolve([
          { name: 'scan-abcdefghij', isDirectory: () => true }
        ])
      })

      fs.stat.mockResolvedValue({ mtimeMs: eightDaysAgo })
      fs.rm.mockRejectedValue(new Error('Permission denied'))

      // Should not throw
      const summary = await cleanupExpiredScans({ maxAgeDays: 7 })

      expect(summary.errors).toBe(2) // one error per directory (output + workspaces)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle missing directories gracefully (ENOENT)', async () => {
      const enoentError = new Error('Directory not found')
      enoentError.code = 'ENOENT'
      fs.readdir.mockRejectedValue(enoentError)

      // Should not throw and not count as error
      const summary = await cleanupExpiredScans({ maxAgeDays: 7 })

      expect(summary.errors).toBe(0)
      expect(summary.scanned).toBe(0)
    })

    it('should log cleanup summary', async () => {
      fs.readdir.mockResolvedValue([])

      await cleanupExpiredScans({ maxAgeDays: 7 })

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleanup complete')
      )
    })
  })

  describe('cleanupScanById', () => {
    it('should delete correct output and workspace paths', async () => {
      fs.rm.mockResolvedValue(undefined)

      const result = await cleanupScanById('scan-aBcDeFgHiJ')

      expect(result.output).toBe(true)
      expect(result.workspace).toBe(true)
      expect(result.deleted).toBe(true)
      expect(fs.rm).toHaveBeenCalledTimes(2)
      expect(fs.rm).toHaveBeenCalledWith(
        expect.stringContaining('scan-aBcDeFgHiJ'),
        { recursive: true, force: true }
      )
    })

    it('should reject invalid scanId format', async () => {
      const result1 = await cleanupScanById('invalid-id')
      expect(result1.deleted).toBe(false)
      expect(result1.error).toBe('Invalid scanId format')

      const result2 = await cleanupScanById('')
      expect(result2.deleted).toBe(false)
      expect(result2.error).toBe('Invalid scanId format')

      const result3 = await cleanupScanById(null)
      expect(result3.deleted).toBe(false)
      expect(result3.error).toBe('Invalid scanId format')

      const result4 = await cleanupScanById('scan-short')
      expect(result4.deleted).toBe(false)
      expect(result4.error).toBe('Invalid scanId format')

      const result5 = await cleanupScanById('../scan-aBcDeFgHiJ')
      expect(result5.deleted).toBe(false)
      expect(result5.error).toBe('Invalid scanId format')

      // Should not have called fs.rm for any invalid IDs
      expect(fs.rm).not.toHaveBeenCalled()
    })

    it('should handle ENOENT gracefully when directories do not exist', async () => {
      const enoentError = new Error('Not found')
      enoentError.code = 'ENOENT'
      fs.rm.mockRejectedValue(enoentError)

      // Should not throw
      const result = await cleanupScanById('scan-aBcDeFgHiJ')

      // ENOENT is silently ignored, output/workspace remain false since rm threw
      expect(result.error).toBeUndefined()
    })

    it('should handle non-ENOENT errors gracefully', async () => {
      fs.rm.mockRejectedValue(new Error('Permission denied'))

      const result = await cleanupScanById('scan-aBcDeFgHiJ')

      expect(logger.error).toHaveBeenCalled()
      // Still doesn't throw
      expect(result.deleted).toBe(false)
    })
  })

  describe('startCleanupScheduler', () => {
    it('should be idempotent (calling again clears previous interval)', async () => {
      fs.readdir.mockResolvedValue([])

      startCleanupScheduler(1000)
      startCleanupScheduler(1000)

      // Advance time by 1 interval
      await vi.advanceTimersByTimeAsync(1000)

      // cleanupExpiredScans should only be called once per interval tick,
      // not twice (which would happen if duplicate intervals existed)
      // readdir is called twice per cleanupExpiredScans (output + workspaces)
      expect(fs.readdir).toHaveBeenCalledTimes(2)
    })

    it('should run cleanup on interval', async () => {
      fs.readdir.mockResolvedValue([])

      startCleanupScheduler(500)

      await vi.advanceTimersByTimeAsync(500)
      // 2 calls per tick (output dir + workspace dir)
      expect(fs.readdir).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(500)
      expect(fs.readdir).toHaveBeenCalledTimes(4)
    })

    it('should log when scheduler starts', () => {
      startCleanupScheduler(3600000)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Scan cleanup scheduler started')
      )
    })
  })

  describe('stopCleanupScheduler', () => {
    it('should clear the interval', async () => {
      fs.readdir.mockResolvedValue([])

      startCleanupScheduler(500)
      stopCleanupScheduler()

      await vi.advanceTimersByTimeAsync(1000)

      // Should not have been called since interval was cleared
      expect(fs.readdir).not.toHaveBeenCalled()
    })

    it('should be safe to call when no scheduler is running', () => {
      // Should not throw
      expect(() => stopCleanupScheduler()).not.toThrow()
    })
  })
})
