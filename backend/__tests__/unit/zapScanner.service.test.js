import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import {
  createZapJob,
  getZapJob,
  updateZapStatus,
  cancelZapJob,
  parseZapJson
} from '../../services/zapScanner.service.js'

// Mock logger
vi.mock('../../utils/logger.util.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
    mkdir: vi.fn()
  }
}))

describe('zapScanner.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createZapJob()', () => {
    it('creates a job with queued status', () => {
      const job = createZapJob('https://example.com')
      expect(job).toBeDefined()
      expect(job.status).toBe('queued')
      expect(job.targetUrl).toBe('https://example.com')
      expect(job.scanId).toMatch(/^scan-[a-zA-Z0-9]+$/)
      expect(job.summary).toEqual({
        high: 0,
        medium: 0,
        low: 0,
        informational: 0
      })
    })
  })

  describe('getZapJob()', () => {
    it('retrieves an existing job', () => {
      const created = createZapJob('https://example.com')
      const retrieved = getZapJob(created.scanId)
      expect(retrieved).toBe(created)
    })

    it('returns null for non-existing jobs', () => {
      expect(getZapJob('non-existent')).toBeNull()
    })
  })

  describe('updateZapStatus()', () => {
    it('updates status and records finishedAt for terminal states', () => {
      const job = createZapJob('https://example.com')
      updateZapStatus(job.scanId, { status: 'completed' })
      
      const updated = getZapJob(job.scanId)
      expect(updated.status).toBe('completed')
      expect(updated.finishedAt).not.toBeNull()
    })
  })

  describe('cancelZapJob()', () => {
    it('cancels active job and kills process if present', () => {
      const job = createZapJob('https://example.com')
      const mockKill = vi.fn()
      job._childProcess = { kill: mockKill }
      
      cancelZapJob(job.scanId)
      expect(job.status).toBe('cancelled')
      expect(mockKill).toHaveBeenCalled()
    })
  })

  describe('parseZapJson()', () => {
    it('extracts vulnerability counts from valid ZAP JSON report format', async () => {
      const mockJson = JSON.stringify({
        site: [
          {
            alerts: [
              { riskcode: '3', alert: 'SQL Injection' },
              { riskcode: '2', alert: 'XSS' },
              { riskcode: '1', alert: 'CSRF' },
              { riskcode: '0', alert: 'Headers missing' },
              { riskcode: '3', alert: 'Command Injection' }
            ]
          }
        ]
      })

      // Set fs mock responses
      fs.access = vi.fn().mockResolvedValue(true)
      fs.readFile = vi.fn().mockResolvedValue(mockJson)

      const summary = await parseZapJson('/path/to/report.json')

      expect(summary.high).toBe(2)
      expect(summary.medium).toBe(1)
      expect(summary.low).toBe(1)
      expect(summary.informational).toBe(1)
    })

    it('returns zeroes on fs access failure', async () => {
      fs.access = vi.fn().mockRejectedValue(new Error('File not found'))

      const summary = await parseZapJson('/path/to/nonexistent.json')

      expect(summary).toEqual({
        high: 0,
        medium: 0,
        low: 0,
        informational: 0
      })
    })
  })
})
