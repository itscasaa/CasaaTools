import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  submitLighthouseScan,
  submitCodeqlScan,
  getScanDetail,
  getScansList,
  cancelScan,
  deleteScan
} from '../../controllers/scan.controller.js'
import { validateScanUrl } from '../../middleware/scan-url.middleware.js'
import { _getStore } from '../../services/scan.service.js'

/**
 * Creates a mock Express request object.
 */
function createMockReq(body = {}, params = {}, query = {}) {
  return { body, params, query }
}

/**
 * Creates a mock Express response object that captures status and json calls.
 */
function createMockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      res.statusCode = code
      return res
    },
    json(data) {
      res.body = data
      return res
    }
  }
  return res
}

/**
 * Simple next function that throws on error for test visibility.
 */
const next = (err) => {
  if (err) throw err
}

describe('Scan API Integration Tests', () => {
  beforeEach(() => {
    _getStore().clear()
  })

  afterEach(() => {
    _getStore().clear()
  })

  describe('Lighthouse demo start', () => {
    it('should return 202 with scanId, type lighthouse, status queued, isDemo true', async () => {
      const req = createMockReq({ url: 'https://example.com', demo: true })
      req.safeUrl = 'https://example.com'
      const res = createMockRes()

      await submitLighthouseScan(req, res, next)

      expect(res.statusCode).toBe(202)
      expect(res.body.success).toBe(true)
      expect(res.body.data.scanId).toMatch(/^scan-[A-Za-z0-9]{10}$/)
      expect(res.body.data.type).toBe('lighthouse')
      expect(res.body.data.status).toBe('queued')
      expect(res.body.data.isDemo).toBe(true)
    })
  })

  describe('CodeQL demo start', () => {
    it('should return 202 with scanId, type codeql, isDemo true', async () => {
      const req = createMockReq({ sourceType: 'demo' })
      const res = createMockRes()

      await submitCodeqlScan(req, res, next)

      expect(res.statusCode).toBe(202)
      expect(res.body.success).toBe(true)
      expect(res.body.data.scanId).toMatch(/^scan-[A-Za-z0-9]{10}$/)
      expect(res.body.data.type).toBe('codeql')
      expect(res.body.data.isDemo).toBe(true)
    })
  })

  describe('Get scan by ID', () => {
    it('should return 200 with scan data for existing scan', async () => {
      // Create a scan first
      const createReq = createMockReq({ url: 'https://example.com', demo: true })
      createReq.safeUrl = 'https://example.com'
      const createRes = createMockRes()
      await submitLighthouseScan(createReq, createRes, next)

      const scanId = createRes.body.data.scanId

      // Get scan detail
      const getReq = createMockReq({}, { scanId })
      const getRes = createMockRes()
      await getScanDetail(getReq, getRes, next)

      expect(getRes.statusCode).toBe(200)
      expect(getRes.body.success).toBe(true)
      expect(getRes.body.data.scanId).toBe(scanId)
      expect(getRes.body.data.type).toBe('lighthouse')
    })
  })

  describe('List scans', () => {
    it('should return 200 with paginated results', async () => {
      // Create multiple scans
      for (let i = 0; i < 3; i++) {
        const req = createMockReq({ sourceType: 'demo' })
        const res = createMockRes()
        await submitCodeqlScan(req, res, next)
      }

      const listReq = createMockReq({}, {}, { limit: '10', offset: '0' })
      const listRes = createMockRes()
      await getScansList(listReq, listRes, next)

      expect(listRes.statusCode).toBe(200)
      expect(listRes.body.success).toBe(true)
      expect(listRes.body.data.scans).toHaveLength(3)
      expect(listRes.body.data.total).toBe(3)
      expect(listRes.body.data.limit).toBe(10)
      expect(listRes.body.data.offset).toBe(0)
    })
  })

  describe('Cancel scan', () => {
    it('should return 200 with cancelled status', async () => {
      // Create a scan (starts in queued status, which is cancellable)
      const createReq = createMockReq({ url: 'https://example.com', demo: true })
      createReq.safeUrl = 'https://example.com'
      const createRes = createMockRes()
      await submitLighthouseScan(createReq, createRes, next)

      const scanId = createRes.body.data.scanId

      // Cancel the scan
      const cancelReq = createMockReq({}, { scanId })
      const cancelRes = createMockRes()
      await cancelScan(cancelReq, cancelRes, next)

      expect(cancelRes.statusCode).toBe(200)
      expect(cancelRes.body.success).toBe(true)
      expect(cancelRes.body.data.status).toBe('cancelled')
    })
  })

  describe('Delete scan', () => {
    it('should return 200 success', async () => {
      // Create a scan
      const createReq = createMockReq({ sourceType: 'demo' })
      const createRes = createMockRes()
      await submitCodeqlScan(createReq, createRes, next)

      const scanId = createRes.body.data.scanId

      // Delete the scan
      const deleteReq = createMockReq({}, { scanId })
      const deleteRes = createMockRes()
      await deleteScan(deleteReq, deleteRes, next)

      expect(deleteRes.statusCode).toBe(200)
      expect(deleteRes.body.success).toBe(true)

      // Verify it's gone
      const getReq = createMockReq({}, { scanId })
      const getRes = createMockRes()
      await getScanDetail(getReq, getRes, next)

      expect(getRes.statusCode).toBe(404)
    })
  })

  describe('Reject private/local URL', () => {
    it('should return 403 for localhost URL via validateScanUrl middleware', async () => {
      const req = createMockReq({ url: 'http://localhost:3000' })
      const res = createMockRes()
      let nextCalled = false

      await validateScanUrl(req, res, () => { nextCalled = true })

      expect(res.statusCode).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('LOCALHOST_BLOCKED')
      expect(nextCalled).toBe(false)
    })
  })

  describe('Reject CodeQL path traversal input', () => {
    it('should return 400 for repoUrl containing path traversal', async () => {
      const req = createMockReq({ sourceType: 'github', repoUrl: '../../../etc/passwd' })
      const res = createMockRes()

      await submitCodeqlScan(req, res, next)

      expect(res.statusCode).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('PATH_TRAVERSAL')
    })
  })

  describe('Unknown scanId returns 404', () => {
    it('should return 404 for non-existent scan ID', async () => {
      const req = createMockReq({}, { scanId: 'scan-NONEXIST00' })
      const res = createMockRes()

      await getScanDetail(req, res, next)

      expect(res.statusCode).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('SCAN_NOT_FOUND')
    })
  })

  describe('No absolute path leakage in error response', () => {
    it('should not expose server filesystem paths in error responses', async () => {
      // Test 404 error
      const req = createMockReq({}, { scanId: 'scan-NONEXIST00' })
      const res = createMockRes()

      await getScanDetail(req, res, next)

      const responseStr = JSON.stringify(res.body)
      // Should not contain Windows or Unix absolute paths
      expect(responseStr).not.toMatch(/[A-Za-z]:\\[^\s"'`]+/)
      expect(responseStr).not.toMatch(/\/(?:home|var|usr|tmp|opt|etc|root)\//)
    })

    it('should not expose server paths in validation error responses', async () => {
      const req = createMockReq({ sourceType: 'invalid' })
      const res = createMockRes()

      await submitCodeqlScan(req, res, next)

      const responseStr = JSON.stringify(res.body)
      expect(responseStr).not.toMatch(/[A-Za-z]:\\[^\s"'`]+/)
      expect(responseStr).not.toMatch(/\/(?:home|var|usr|tmp|opt|etc|root)\//)
    })
  })

  describe('Real mode (non-demo) Lighthouse scan', () => {
    it('should create a job and return proper response shape without unhandled error', async () => {
      const req = createMockReq({ url: 'https://example.com', demo: false })
      req.safeUrl = 'https://example.com'
      const res = createMockRes()

      await submitLighthouseScan(req, res, next)

      // Should return 202 just like demo mode
      expect(res.statusCode).toBe(202)
      expect(res.body.success).toBe(true)

      // Verify the response shape matches demo mode
      expect(res.body.data).toHaveProperty('scanId')
      expect(res.body.data).toHaveProperty('type', 'lighthouse')
      expect(res.body.data).toHaveProperty('status', 'queued')
      expect(res.body.data).toHaveProperty('progress', 0)
      expect(res.body.data).toHaveProperty('currentStep')
      expect(res.body.data).toHaveProperty('isDemo', false)
      expect(res.body.data).toHaveProperty('createdAt')
      expect(res.body.data.scanId).toMatch(/^scan-[A-Za-z0-9]{10}$/)
    })

    it('should have the same response shape as demo mode', async () => {
      // Submit demo scan
      const demoReq = createMockReq({ url: 'https://example.com', demo: true })
      demoReq.safeUrl = 'https://example.com'
      const demoRes = createMockRes()
      await submitLighthouseScan(demoReq, demoRes, next)

      // Submit real scan
      const realReq = createMockReq({ url: 'https://example.com', demo: false })
      realReq.safeUrl = 'https://example.com'
      const realRes = createMockRes()
      await submitLighthouseScan(realReq, realRes, next)

      // Both should have same status code
      expect(demoRes.statusCode).toBe(realRes.statusCode)

      // Both should have same shape (same keys in data)
      const demoKeys = Object.keys(demoRes.body.data).sort()
      const realKeys = Object.keys(realRes.body.data).sort()
      expect(realKeys).toEqual(demoKeys)
    })
  })

  describe('Demo scan completes with result after polling', () => {
    it('should complete lighthouse demo scan with result after delay', { timeout: 10000 }, async () => {
      // Submit demo scan
      const createReq = createMockReq({ url: 'https://example.com', demo: true })
      createReq.safeUrl = 'https://example.com'
      const createRes = createMockRes()
      await submitLighthouseScan(createReq, createRes, next)

      const scanId = createRes.body.data.scanId
      expect(createRes.body.data.status).toBe('queued')

      // Wait for demo execution to complete (demo steps each take 200ms, 5 steps = ~1s + buffer)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Poll for status
      const getReq = createMockReq({}, { scanId })
      const getRes = createMockRes()
      await getScanDetail(getReq, getRes, next)

      expect(getRes.statusCode).toBe(200)
      expect(getRes.body.data.status).toBe('completed')
      expect(getRes.body.data.progress).toBe(100)
      expect(getRes.body.data.result).not.toBeNull()
    })
  })
})
