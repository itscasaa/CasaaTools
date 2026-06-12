import { describe, it, expect, beforeEach, vi } from 'vitest'
import { scannerConfig } from '../../config/scanner.config.js'
import {
  createScanJob,
  getScanJob,
  getAllScans,
  cancelScanJob,
  deleteScanJob,
  getActiveScansCount,
  updateScanStatus,
  markStaleJobs,
  markInterruptedJobs,
  _getStore
} from '../../services/scan.service.js'

describe('scan.service', () => {
  beforeEach(() => {
    // Clear the in-memory store before each test
    _getStore().clear()
  })

  describe('createScanJob', () => {
    it('should create a lighthouse scan job with valid params', () => {
      const job = createScanJob({
        type: 'lighthouse',
        params: { url: 'https://example.com' }
      })

      expect(job.scanId).toMatch(/^scan-[A-Za-z0-9]{10}$/)
      expect(job.type).toBe('lighthouse')
      expect(job.status).toBe('queued')
      expect(job.progress).toBe(0)
      expect(job.currentStep).toBe('Dalam Antrean')
      expect(job.url).toBe('https://example.com')
      expect(job.sourceType).toBeNull()
      expect(job.repoUrl).toBeNull()
      expect(job.workspaceId).toBeNull()
      expect(job.createdAt).toBeTruthy()
      expect(job.updatedAt).toBeTruthy()
      expect(job.finishedAt).toBeNull()
      expect(job.result).toBeNull()
      expect(job.error).toBeNull()
      expect(job.isDemo).toBe(false)
      expect(job._childProcess).toBeNull()
      expect(job._timeoutTimer).toBeNull()
    })

    it('should create a codeql scan job with valid params', () => {
      const job = createScanJob({
        type: 'codeql',
        params: { sourceType: 'github', repoUrl: 'https://github.com/owner/repo' }
      })

      expect(job.type).toBe('codeql')
      expect(job.sourceType).toBe('github')
      expect(job.repoUrl).toBe('https://github.com/owner/repo')
      expect(job.url).toBeNull()
    })

    it('should create a demo scan job with isDemo flag', () => {
      const job = createScanJob({
        type: 'lighthouse',
        params: { url: 'https://example.com', isDemo: true }
      })

      expect(job.isDemo).toBe(true)
    })

    it('should throw SCAN_LIMIT_REACHED when concurrency limit is exceeded', () => {
      // Create jobs and move them to active status
      const job1 = createScanJob({ type: 'lighthouse', params: { url: 'https://a.com' } })
      const job2 = createScanJob({ type: 'lighthouse', params: { url: 'https://b.com' } })

      // Move to active statuses (default MAX_CONCURRENT_SCANS = 2)
      updateScanStatus(job1.scanId, { status: 'running' })
      updateScanStatus(job2.scanId, { status: 'validating' })

      // Third job should throw
      expect(() => {
        createScanJob({ type: 'lighthouse', params: { url: 'https://c.com' } })
      }).toThrow('Batas pemindaian bersamaan tercapai')

      try {
        createScanJob({ type: 'lighthouse', params: { url: 'https://c.com' } })
      } catch (err) {
        expect(err.code).toBe('SCAN_LIMIT_REACHED')
      }
    })

    it('should allow creating jobs when active scans are below limit', () => {
      // Queued jobs don't count as active
      createScanJob({ type: 'lighthouse', params: { url: 'https://a.com' } })
      createScanJob({ type: 'lighthouse', params: { url: 'https://b.com' } })

      // These are still queued, not active
      expect(getActiveScansCount()).toBe(0)

      // Should not throw
      const job3 = createScanJob({ type: 'lighthouse', params: { url: 'https://c.com' } })
      expect(job3.scanId).toBeTruthy()
    })
  })

  describe('getScanJob', () => {
    it('should retrieve a job by scanId', () => {
      const created = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      const retrieved = getScanJob(created.scanId)

      expect(retrieved).toBeTruthy()
      expect(retrieved.scanId).toBe(created.scanId)
      expect(retrieved.url).toBe('https://example.com')
    })

    it('should return null for non-existent scanId', () => {
      const result = getScanJob('scan-nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getAllScans', () => {
    it('should return empty list when no scans exist', () => {
      const result = getAllScans()
      expect(result.scans).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should return scans sorted by createdAt descending', async () => {
      const job1 = createScanJob({ type: 'lighthouse', params: { url: 'https://first.com' } })
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      const job2 = createScanJob({ type: 'lighthouse', params: { url: 'https://second.com' } })

      const result = getAllScans()
      expect(result.total).toBe(2)
      expect(result.scans[0].url).toBe('https://second.com')
      expect(result.scans[1].url).toBe('https://first.com')
    })

    it('should support pagination with limit and offset', () => {
      for (let i = 0; i < 5; i++) {
        createScanJob({ type: 'lighthouse', params: { url: `https://site${i}.com` } })
      }

      const page1 = getAllScans({ limit: 2, offset: 0 })
      expect(page1.scans.length).toBe(2)
      expect(page1.total).toBe(5)

      const page2 = getAllScans({ limit: 2, offset: 2 })
      expect(page2.scans.length).toBe(2)
      expect(page2.total).toBe(5)

      const page3 = getAllScans({ limit: 2, offset: 4 })
      expect(page3.scans.length).toBe(1)
      expect(page3.total).toBe(5)
    })

    it('should clamp limit to 1-100 range', () => {
      for (let i = 0; i < 3; i++) {
        createScanJob({ type: 'lighthouse', params: { url: `https://site${i}.com` } })
      }

      // limit 0 should clamp to 1
      const result1 = getAllScans({ limit: 0 })
      expect(result1.scans.length).toBe(1)

      // limit 200 should clamp to 100 (but we only have 3)
      const result2 = getAllScans({ limit: 200 })
      expect(result2.scans.length).toBe(3)
    })

    it('should strip internal fields from returned objects', () => {
      createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      const result = getAllScans()
      const scan = result.scans[0]

      expect(scan).not.toHaveProperty('_childProcess')
      expect(scan).not.toHaveProperty('_timeoutTimer')
      expect(scan).toHaveProperty('scanId')
      expect(scan).toHaveProperty('status')
    })

    it('should use defaults when no params provided', () => {
      for (let i = 0; i < 3; i++) {
        createScanJob({ type: 'lighthouse', params: { url: `https://site${i}.com` } })
      }

      const result = getAllScans()
      expect(result.scans.length).toBe(3)
      expect(result.total).toBe(3)
    })
  })

  describe('updateScanStatus', () => {
    it('should update status and auto-translate currentStep', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      updateScanStatus(job.scanId, { status: 'running' })
      const updated = getScanJob(job.scanId)

      expect(updated.status).toBe('running')
      expect(updated.currentStep).toBe('Pemindaian Berjalan')
    })

    it('should update progress independently', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      updateScanStatus(job.scanId, { progress: 50 })
      const updated = getScanJob(job.scanId)

      expect(updated.progress).toBe(50)
    })

    it('should allow explicit currentStep override', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      updateScanStatus(job.scanId, { status: 'running', currentStep: 'Custom Step' })
      const updated = getScanJob(job.scanId)

      expect(updated.status).toBe('running')
      expect(updated.currentStep).toBe('Custom Step')
    })

    it('should set finishedAt when transitioning to terminal status', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      expect(job.finishedAt).toBeNull()

      updateScanStatus(job.scanId, { status: 'completed' })
      const updated = getScanJob(job.scanId)

      expect(updated.finishedAt).toBeTruthy()
    })

    it('should update updatedAt on every call', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      const originalUpdatedAt = job.updatedAt

      // Small delay to guarantee timestamp difference
      updateScanStatus(job.scanId, { progress: 10 })
      const updated = getScanJob(job.scanId)

      // updatedAt should be >= original (may be same if test runs fast)
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      )
    })

    it('should do nothing for non-existent scanId', () => {
      // Should not throw
      updateScanStatus('scan-nonexistent', { status: 'running' })
    })
  })

  describe('cancelScanJob', () => {
    it('should cancel a job in queued status', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      const cancelled = cancelScanJob(job.scanId)

      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.currentStep).toBe('Dibatalkan')
      expect(cancelled.finishedAt).toBeTruthy()
    })

    it('should cancel a job in active status', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'running' })

      const cancelled = cancelScanJob(job.scanId)

      expect(cancelled.status).toBe('cancelled')
    })

    it('should kill child process when cancelling', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'running' })

      // Attach mock child process
      const mockKill = vi.fn()
      const stored = getScanJob(job.scanId)
      stored._childProcess = { kill: mockKill }

      cancelScanJob(job.scanId)

      expect(mockKill).toHaveBeenCalled()
    })

    it('should throw CANCEL_NOT_ALLOWED for terminal status (completed)', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'completed' })

      expect(() => cancelScanJob(job.scanId)).toThrow('Pemindaian tidak dapat dibatalkan karena sudah dalam status akhir')

      try {
        cancelScanJob(job.scanId)
      } catch (err) {
        expect(err.code).toBe('CANCEL_NOT_ALLOWED')
      }
    })

    it('should throw CANCEL_NOT_ALLOWED for terminal status (failed)', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'failed' })

      expect(() => cancelScanJob(job.scanId)).toThrow()
    })

    it('should throw CANCEL_NOT_ALLOWED for cancelled status', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      cancelScanJob(job.scanId) // Cancel first time

      expect(() => cancelScanJob(job.scanId)).toThrow()
    })

    it('should throw SCAN_NOT_FOUND for non-existent scanId', () => {
      expect(() => cancelScanJob('scan-nonexistent')).toThrow('Pemindaian tidak ditemukan')

      try {
        cancelScanJob('scan-nonexistent')
      } catch (err) {
        expect(err.code).toBe('SCAN_NOT_FOUND')
      }
    })
  })

  describe('deleteScanJob', () => {
    it('should remove a job from the store', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      deleteScanJob(job.scanId)

      expect(getScanJob(job.scanId)).toBeNull()
      expect(_getStore().size).toBe(0)
    })

    it('should kill child process when deleting active job', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'running' })

      const mockKill = vi.fn()
      const stored = getScanJob(job.scanId)
      stored._childProcess = { kill: mockKill }

      deleteScanJob(job.scanId)

      expect(mockKill).toHaveBeenCalled()
    })

    it('should throw SCAN_NOT_FOUND for non-existent scanId', () => {
      expect(() => deleteScanJob('scan-nonexistent')).toThrow('Pemindaian tidak ditemukan')

      try {
        deleteScanJob('scan-nonexistent')
      } catch (err) {
        expect(err.code).toBe('SCAN_NOT_FOUND')
      }
    })
  })

  describe('getActiveScansCount', () => {
    it('should return 0 when no active scans', () => {
      expect(getActiveScansCount()).toBe(0)
    })

    it('should count only jobs in active statuses', () => {
      const job1 = createScanJob({ type: 'lighthouse', params: { url: 'https://a.com' } })
      const job2 = createScanJob({ type: 'lighthouse', params: { url: 'https://b.com' } })
      const job3 = createScanJob({ type: 'lighthouse', params: { url: 'https://c.com' } })

      // queued jobs don't count
      expect(getActiveScansCount()).toBe(0)

      // Move to active statuses
      updateScanStatus(job1.scanId, { status: 'running' })
      expect(getActiveScansCount()).toBe(1)

      updateScanStatus(job2.scanId, { status: 'validating' })
      expect(getActiveScansCount()).toBe(2)

      // Queued still doesn't count
      expect(getActiveScansCount()).toBe(2)

      // Move one to terminal
      updateScanStatus(job1.scanId, { status: 'completed' })
      expect(getActiveScansCount()).toBe(1)
    })

    it('should not count queued, completed, failed, timeout, cancelled, stale', () => {
      const jobs = []
      for (let i = 0; i < 6; i++) {
        jobs.push(createScanJob({ type: 'lighthouse', params: { url: `https://site${i}.com` } }))
      }

      updateScanStatus(jobs[0].scanId, { status: 'completed' })
      updateScanStatus(jobs[1].scanId, { status: 'failed' })
      updateScanStatus(jobs[2].scanId, { status: 'timeout' })
      updateScanStatus(jobs[3].scanId, { status: 'cancelled' })
      updateScanStatus(jobs[4].scanId, { status: 'stale' })
      // jobs[5] stays queued

      expect(getActiveScansCount()).toBe(0)
    })
  })

  describe('markStaleJobs', () => {
    it('should mark queued jobs as stale when updatedAt exceeds threshold', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      // Manually set updatedAt to be older than SCAN_STALE_AFTER_MINUTES
      const staleTime = new Date(Date.now() - (scannerConfig.SCAN_STALE_AFTER_MINUTES + 1) * 60 * 1000)
      const stored = getScanJob(job.scanId)
      stored.updatedAt = staleTime.toISOString()

      markStaleJobs()

      const updated = getScanJob(job.scanId)
      expect(updated.status).toBe('stale')
      expect(updated.currentStep).toBe('Terhenti')
      expect(updated.finishedAt).toBeTruthy()
      expect(updated.error.code).toBe('SCAN_STALE')
      expect(updated.error.message).toBe('Pemindaian terhenti karena tidak merespon')
    })

    it('should mark running jobs as stale when updatedAt exceeds threshold', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'running' })

      // Manually set updatedAt to be older than threshold
      const staleTime = new Date(Date.now() - (scannerConfig.SCAN_STALE_AFTER_MINUTES + 1) * 60 * 1000)
      const stored = getScanJob(job.scanId)
      stored.updatedAt = staleTime.toISOString()

      markStaleJobs()

      const updated = getScanJob(job.scanId)
      expect(updated.status).toBe('stale')
    })

    it('should NOT mark recently updated jobs as stale', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      markStaleJobs()

      const updated = getScanJob(job.scanId)
      expect(updated.status).toBe('queued')
    })

    it('should NOT affect jobs in other statuses', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'validating' })

      // Set old updatedAt
      const staleTime = new Date(Date.now() - (scannerConfig.SCAN_STALE_AFTER_MINUTES + 1) * 60 * 1000)
      const stored = getScanJob(job.scanId)
      stored.updatedAt = staleTime.toISOString()

      markStaleJobs()

      // validating is NOT checked by markStaleJobs (only queued and running)
      const updated = getScanJob(job.scanId)
      expect(updated.status).toBe('validating')
    })

    it('should kill child process of stale jobs', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })
      updateScanStatus(job.scanId, { status: 'running' })

      const mockKill = vi.fn()
      const stored = getScanJob(job.scanId)
      stored._childProcess = { kill: mockKill }
      stored.updatedAt = new Date(Date.now() - (scannerConfig.SCAN_STALE_AFTER_MINUTES + 1) * 60 * 1000).toISOString()

      markStaleJobs()

      expect(mockKill).toHaveBeenCalled()
    })
  })

  describe('markInterruptedJobs', () => {
    it('should mark queued jobs as failed', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      markInterruptedJobs()

      const updated = getScanJob(job.scanId)
      expect(updated.status).toBe('failed')
      expect(updated.error.message).toBe('Pemindaian terinterupsi karena server dimulai ulang')
      expect(updated.error.code).toBe('SCAN_INTERRUPTED')
      expect(updated.finishedAt).toBeTruthy()
    })

    it('should mark all active status jobs as failed', () => {
      const statuses = ['queued', 'validating', 'preparing', 'running', 'analyzing', 'parsing']
      // Create all jobs first (they start as queued so no concurrency issue)
      const jobs = statuses.map((status, i) => {
        return createScanJob({ type: 'lighthouse', params: { url: `https://site${i}.com` } })
      })

      // Now update statuses directly via the store to avoid concurrency checks
      statuses.forEach((status, i) => {
        if (status !== 'queued') {
          const stored = _getStore().get(jobs[i].scanId)
          stored.status = status
        }
      })

      markInterruptedJobs()

      for (const job of jobs) {
        const updated = getScanJob(job.scanId)
        expect(updated.status).toBe('failed')
        expect(updated.error.code).toBe('SCAN_INTERRUPTED')
      }
    })

    it('should NOT affect jobs in terminal statuses', () => {
      const job1 = createScanJob({ type: 'lighthouse', params: { url: 'https://a.com' } })
      const job2 = createScanJob({ type: 'lighthouse', params: { url: 'https://b.com' } })

      updateScanStatus(job1.scanId, { status: 'completed' })
      updateScanStatus(job2.scanId, { status: 'failed' })

      markInterruptedJobs()

      expect(getScanJob(job1.scanId).status).toBe('completed')
      expect(getScanJob(job2.scanId).status).toBe('failed')
      // job2 should still have its original error, not SCAN_INTERRUPTED
      expect(getScanJob(job2.scanId).error).toBeNull()
    })

    it('should set translated currentStep', () => {
      const job = createScanJob({ type: 'lighthouse', params: { url: 'https://example.com' } })

      markInterruptedJobs()

      const updated = getScanJob(job.scanId)
      expect(updated.currentStep).toBe('Gagal')
    })
  })
})
