import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dns
vi.mock('dns', () => ({
  default: { promises: { lookup: vi.fn() } },
  promises: { lookup: vi.fn() }
}))

// Mock http
vi.mock('http', () => ({
  default: { request: vi.fn() },
  request: vi.fn()
}))

// Mock https
vi.mock('https', () => ({
  default: { request: vi.fn() },
  request: vi.fn()
}))

// Mock scanner config
vi.mock('../../config/scanner.config.js', () => ({
  scannerConfig: { MAX_REDIRECTS: 5 }
}))

import dns from 'dns'
import http from 'http'
import https from 'https'

const { validateRedirects } = await import('../../utils/redirect-validator.js')

/**
 * Helper to mock a HEAD request response.
 * Simulates the http/https.request callback pattern.
 */
function mockHeadResponse(module, statusCode, headers = {}) {
  module.request.mockImplementation((options, callback) => {
    const res = {
      statusCode,
      headers,
      resume: vi.fn()
    }
    // Call the callback asynchronously to match real behavior
    process.nextTick(() => callback(res))
    return {
      on: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn()
    }
  })
}

/**
 * Helper to mock HEAD request that triggers an error.
 */
function mockHeadError(module, error = new Error('Connection refused')) {
  module.request.mockImplementation((options, callback) => {
    const req = {
      on: vi.fn((event, handler) => {
        if (event === 'error') {
          process.nextTick(() => handler(error))
        }
      }),
      end: vi.fn(),
      destroy: vi.fn()
    }
    return req
  })
}

describe('redirect-validator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default DNS mock: resolve to public IP
    dns.promises.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 })
  })

  describe('Public URL with no redirect', () => {
    it('should return safe=true when no redirect occurs', async () => {
      mockHeadResponse(https, 200)

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(true)
      expect(result.finalUrl).toBe('https://example.com')
    })
  })

  describe('Public URL redirecting to another public URL', () => {
    it('should follow redirect and return safe=true with final URL', async () => {
      let callCount = 0
      https.request.mockImplementation((options, callback) => {
        callCount++
        const res = callCount === 1
          ? { statusCode: 301, headers: { location: 'https://www.example.com/page' }, resume: vi.fn() }
          : { statusCode: 200, headers: {}, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(true)
      expect(result.finalUrl).toBe('https://www.example.com/page')
    })
  })

  describe('Public URL redirecting to localhost', () => {
    it('should block redirect to localhost hostname', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://localhost/admin' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('LOCALHOST_BLOCKED')
    })

    it('should block redirect to subdomain of localhost', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://evil.localhost/steal' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('LOCALHOST_BLOCKED')
    })
  })

  describe('Public URL redirecting to 127.0.0.1', () => {
    it('should block redirect to 127.0.0.1', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://127.0.0.1/secret' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('SSRF_BLOCKED')
    })
  })

  describe('Public URL redirecting to private IPs', () => {
    it('should block redirect to 10.0.0.1', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://10.0.0.1/internal' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('SSRF_BLOCKED')
    })

    it('should block redirect to 192.168.1.1', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://192.168.1.1/router' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('SSRF_BLOCKED')
    })

    it('should block redirect to hostname resolving to private IP', async () => {
      // First call resolves to public (initial URL), second to private (redirect target)
      let lookupCount = 0
      dns.promises.lookup.mockImplementation(() => {
        lookupCount++
        if (lookupCount <= 1) {
          return Promise.resolve({ address: '93.184.216.34', family: 4 })
        }
        return Promise.resolve({ address: '10.0.0.5', family: 4 })
      })

      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'https://internal.evil.com/steal' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('SSRF_BLOCKED')
    })
  })

  describe('Public URL redirecting to cloud metadata', () => {
    it('should block redirect to 169.254.169.254', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('METADATA_BLOCKED')
    })

    it('should block redirect to metadata.google.internal', async () => {
      dns.promises.lookup.mockImplementation((hostname) => {
        if (hostname === 'metadata.google.internal') {
          return Promise.resolve({ address: '169.254.169.254', family: 4 })
        }
        return Promise.resolve({ address: '93.184.216.34', family: 4 })
      })

      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://metadata.google.internal/computeMetadata/v1/' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('METADATA_BLOCKED')
    })
  })

  describe('Public URL redirecting to disallowed protocols', () => {
    it('should block redirect to file:// protocol', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'file:///etc/passwd' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('PROTOCOL_NOT_ALLOWED')
    })

    it('should block redirect to ftp:// protocol', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'ftp://evil.com/data' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(false)
      expect(result.code).toBe('PROTOCOL_NOT_ALLOWED')
    })
  })

  describe('Too many redirects', () => {
    it('should block after exceeding max redirects', async () => {
      let callCount = 0
      https.request.mockImplementation((options, callback) => {
        callCount++
        // Always redirect to trigger the limit
        const res = {
          statusCode: 302,
          headers: { location: `https://example.com/hop${callCount}` },
          resume: vi.fn()
        }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com', { maxRedirects: 3 })

      expect(result.safe).toBe(false)
      expect(result.code).toBe('TOO_MANY_REDIRECTS')
    })
  })

  describe('DNS validation on each redirect target', () => {
    it('should call DNS lookup for each hostname hop', async () => {
      let callCount = 0
      https.request.mockImplementation((options, callback) => {
        callCount++
        const res = callCount === 1
          ? { statusCode: 302, headers: { location: 'https://second.example.com/page' }, resume: vi.fn() }
          : { statusCode: 200, headers: {}, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      await validateRedirects('https://first.example.com')

      // DNS should be called for both first.example.com and second.example.com
      expect(dns.promises.lookup).toHaveBeenCalledWith('first.example.com')
      expect(dns.promises.lookup).toHaveBeenCalledWith('second.example.com')
    })
  })

  describe('No absolute path leakage in error messages', () => {
    it('should not expose filesystem paths in error messages', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: 'http://127.0.0.1/secret' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      expect(result.message).not.toMatch(/[A-Z]:\\/)
      expect(result.message).not.toMatch(/^\/[a-z]/)
      expect(result.message).not.toContain('node_modules')
    })

    it('should not expose paths when DNS fails', async () => {
      dns.promises.lookup.mockRejectedValue(new Error('ENOTFOUND'))

      const result = await validateRedirects('https://nonexistent-domain.invalid')

      expect(result.message).not.toMatch(/[A-Z]:\\/)
      expect(result.message).not.toMatch(/^\/[a-z]/)
    })
  })

  describe('Network error during preflight', () => {
    it('should return safe=true on network error (let Lighthouse try)', async () => {
      mockHeadError(https, new Error('Connection refused'))

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(true)
      expect(result.finalUrl).toBe('https://example.com')
    })

    it('should return safe=true on timeout (let Lighthouse try)', async () => {
      mockHeadError(https, new Error('Request timeout'))

      const result = await validateRedirects('https://example.com')

      expect(result.safe).toBe(true)
      expect(result.finalUrl).toBe('https://example.com')
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid redirect URL gracefully', async () => {
      https.request.mockImplementation((options, callback) => {
        const res = { statusCode: 302, headers: { location: '://invalid' }, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com')

      // The relative URL resolution with '://invalid' against 'https://example.com'
      // may produce a valid URL or not - just ensure we don't crash
      expect(result).toBeDefined()
      expect(typeof result.safe).toBe('boolean')
    })

    it('should handle relative redirect paths', async () => {
      let callCount = 0
      https.request.mockImplementation((options, callback) => {
        callCount++
        const res = callCount === 1
          ? { statusCode: 301, headers: { location: '/new-path' }, resume: vi.fn() }
          : { statusCode: 200, headers: {}, resume: vi.fn() }
        process.nextTick(() => callback(res))
        return { on: vi.fn(), end: vi.fn(), destroy: vi.fn() }
      })

      const result = await validateRedirects('https://example.com/old-path')

      expect(result.safe).toBe(true)
      expect(result.finalUrl).toBe('https://example.com/new-path')
    })

    it('should use http module for http:// URLs', async () => {
      mockHeadResponse(http, 200)

      const result = await validateRedirects('http://example.com')

      expect(result.safe).toBe(true)
      expect(http.request).toHaveBeenCalled()
    })
  })
})
