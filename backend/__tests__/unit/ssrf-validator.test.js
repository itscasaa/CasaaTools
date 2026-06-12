import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import dns from 'dns'

vi.mock('dns', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    default: {
      ...original,
      promises: {
        ...original.promises,
        lookup: vi.fn()
      }
    },
    promises: {
      ...original.promises,
      lookup: vi.fn()
    }
  }
})

const { isPrivateIp, isCloudMetadata, isLocalhostHostname, validateUrlSafety } = await import('../../utils/ssrf-validator.js')

describe('ssrf-validator', () => {
  describe('isPrivateIp', () => {
    describe('IPv4 private ranges', () => {
      it('should detect RFC 1918 10.0.0.0/8', () => {
        expect(isPrivateIp('10.0.0.1')).toBe(true)
        expect(isPrivateIp('10.255.255.255')).toBe(true)
        expect(isPrivateIp('10.100.50.25')).toBe(true)
      })

      it('should detect RFC 1918 172.16.0.0/12', () => {
        expect(isPrivateIp('172.16.0.1')).toBe(true)
        expect(isPrivateIp('172.31.255.255')).toBe(true)
        expect(isPrivateIp('172.20.10.5')).toBe(true)
      })

      it('should not flag 172.15.x.x or 172.32.x.x as private', () => {
        expect(isPrivateIp('172.15.0.1')).toBe(false)
        expect(isPrivateIp('172.32.0.1')).toBe(false)
      })

      it('should detect RFC 1918 192.168.0.0/16', () => {
        expect(isPrivateIp('192.168.0.1')).toBe(true)
        expect(isPrivateIp('192.168.255.255')).toBe(true)
        expect(isPrivateIp('192.168.1.100')).toBe(true)
      })

      it('should detect loopback 127.0.0.0/8', () => {
        expect(isPrivateIp('127.0.0.1')).toBe(true)
        expect(isPrivateIp('127.255.255.255')).toBe(true)
        expect(isPrivateIp('127.0.0.2')).toBe(true)
      })

      it('should detect link-local 169.254.0.0/16', () => {
        expect(isPrivateIp('169.254.0.1')).toBe(true)
        expect(isPrivateIp('169.254.169.254')).toBe(true)
        expect(isPrivateIp('169.254.255.255')).toBe(true)
      })

      it('should allow public IPv4 addresses', () => {
        expect(isPrivateIp('8.8.8.8')).toBe(false)
        expect(isPrivateIp('1.1.1.1')).toBe(false)
        expect(isPrivateIp('203.0.113.1')).toBe(false)
        expect(isPrivateIp('93.184.216.34')).toBe(false)
      })
    })

    describe('IPv6 private ranges', () => {
      it('should detect loopback ::1', () => {
        expect(isPrivateIp('::1')).toBe(true)
        expect(isPrivateIp('0:0:0:0:0:0:0:1')).toBe(true)
      })

      it('should detect unspecified ::', () => {
        expect(isPrivateIp('::')).toBe(true)
        expect(isPrivateIp('0:0:0:0:0:0:0:0')).toBe(true)
      })

      it('should detect link-local fe80::/10', () => {
        expect(isPrivateIp('fe80::1')).toBe(true)
        expect(isPrivateIp('fe80::abcd:1234')).toBe(true)
        expect(isPrivateIp('feb0::1')).toBe(true)
      })

      it('should detect unique local fc00::/7', () => {
        expect(isPrivateIp('fc00::1')).toBe(true)
        expect(isPrivateIp('fd00::1')).toBe(true)
        expect(isPrivateIp('fdff::1')).toBe(true)
      })

      it('should detect IPv4-mapped IPv6 private addresses', () => {
        expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true)
        expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true)
        expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true)
        expect(isPrivateIp('::ffff:172.16.0.1')).toBe(true)
        expect(isPrivateIp('::ffff:169.254.169.254')).toBe(true)
      })

      it('should allow public IPv6 addresses', () => {
        expect(isPrivateIp('2001:db8::1')).toBe(false)
        expect(isPrivateIp('2607:f8b0:4004:800::200e')).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should return false for null/undefined/empty', () => {
        expect(isPrivateIp(null)).toBe(false)
        expect(isPrivateIp(undefined)).toBe(false)
        expect(isPrivateIp('')).toBe(false)
      })

      it('should return false for non-IP strings', () => {
        expect(isPrivateIp('not-an-ip')).toBe(false)
        expect(isPrivateIp('example.com')).toBe(false)
      })
    })
  })

  describe('isCloudMetadata', () => {
    it('should detect metadata IP 169.254.169.254', () => {
      expect(isCloudMetadata('169.254.169.254')).toBe(true)
      expect(isCloudMetadata(null, '169.254.169.254')).toBe(true)
    })

    it('should detect metadata.google.internal', () => {
      expect(isCloudMetadata('metadata.google.internal')).toBe(true)
    })

    it('should detect hostnames ending with .internal', () => {
      expect(isCloudMetadata('something.internal')).toBe(true)
      expect(isCloudMetadata('custom.metadata.internal')).toBe(true)
    })

    it('should detect IPv4-mapped metadata IP', () => {
      expect(isCloudMetadata(null, '::ffff:169.254.169.254')).toBe(true)
    })

    it('should not flag regular hostnames', () => {
      expect(isCloudMetadata('example.com')).toBe(false)
      expect(isCloudMetadata('internal.example.com')).toBe(false)
      expect(isCloudMetadata('myinternal.com')).toBe(false)
    })

    it('should handle null/undefined', () => {
      expect(isCloudMetadata(null, null)).toBe(false)
      expect(isCloudMetadata(undefined, undefined)).toBe(false)
    })
  })

  describe('isLocalhostHostname', () => {
    it('should detect localhost', () => {
      expect(isLocalhostHostname('localhost')).toBe(true)
    })

    it('should detect localhost.localdomain', () => {
      expect(isLocalhostHostname('localhost.localdomain')).toBe(true)
    })

    it('should detect hostnames ending with .localhost', () => {
      expect(isLocalhostHostname('app.localhost')).toBe(true)
      expect(isLocalhostHostname('sub.domain.localhost')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isLocalhostHostname('LOCALHOST')).toBe(true)
      expect(isLocalhostHostname('Localhost')).toBe(true)
      expect(isLocalhostHostname('LOCALHOST.LOCALDOMAIN')).toBe(true)
    })

    it('should not flag non-localhost hostnames', () => {
      expect(isLocalhostHostname('example.com')).toBe(false)
      expect(isLocalhostHostname('localhosts.com')).toBe(false)
      expect(isLocalhostHostname('notlocalhost')).toBe(false)
    })

    it('should return false for null/undefined/empty', () => {
      expect(isLocalhostHostname(null)).toBe(false)
      expect(isLocalhostHostname(undefined)).toBe(false)
      expect(isLocalhostHostname('')).toBe(false)
    })
  })

  describe('validateUrlSafety', () => {
    afterEach(() => {
      vi.clearAllMocks()
    })

    it('should reject null/undefined/empty input', async () => {
      expect(await validateUrlSafety(null)).toEqual({
        valid: false,
        code: 'INVALID_URL',
        message: 'URL tidak valid atau tidak dapat diparsing'
      })
      expect(await validateUrlSafety('')).toEqual({
        valid: false,
        code: 'INVALID_URL',
        message: 'URL tidak valid atau tidak dapat diparsing'
      })
      expect(await validateUrlSafety('   ')).toEqual({
        valid: false,
        code: 'INVALID_URL',
        message: 'URL tidak valid atau tidak dapat diparsing'
      })
    })

    it('should reject URLs exceeding 2048 characters', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2048)
      const result = await validateUrlSafety(longUrl)
      expect(result.valid).toBe(false)
      expect(result.code).toBe('URL_TOO_LONG')
      expect(result.message).toBe('URL melebihi batas 2048 karakter')
    })

    it('should reject invalid/unparseable URLs', async () => {
      const result = await validateUrlSafety('not a valid url')
      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_URL')
    })

    it('should reject non-HTTP protocols', async () => {
      const protocols = ['ftp://example.com', 'file:///etc/passwd', 'gopher://evil.com', 'data:text/html,<h1>hi</h1>', 'javascript:alert(1)']
      for (const url of protocols) {
        const result = await validateUrlSafety(url)
        expect(result.valid).toBe(false)
        expect(result.code).toBe('PROTOCOL_NOT_ALLOWED')
        expect(result.message).toBe('Hanya protokol HTTP dan HTTPS yang diperbolehkan')
      }
    })

    it('should reject localhost hostnames', async () => {
      const urls = ['http://localhost/path', 'http://localhost.localdomain', 'https://app.localhost:3000']
      for (const url of urls) {
        const result = await validateUrlSafety(url)
        expect(result.valid).toBe(false)
        expect(result.code).toBe('LOCALHOST_BLOCKED')
        expect(result.message).toBe('URL localhost tidak diperbolehkan')
      }
    })

    it('should reject cloud metadata hostnames', async () => {
      const urls = ['http://169.254.169.254/latest/meta-data', 'http://metadata.google.internal/computeMetadata', 'http://something.internal/data']
      for (const url of urls) {
        const result = await validateUrlSafety(url)
        expect(result.valid).toBe(false)
        expect(result.code).toBe('METADATA_BLOCKED')
        expect(result.message).toBe('URL cloud metadata tidak diperbolehkan')
      }
    })

    it('should reject direct private IPs in URL', async () => {
      const urls = ['http://10.0.0.1/admin', 'http://192.168.1.1/', 'http://172.16.0.5:8080', 'http://127.0.0.1:3000']
      for (const url of urls) {
        const result = await validateUrlSafety(url)
        expect(result.valid).toBe(false)
        expect(result.code).toBe('SSRF_BLOCKED')
        expect(result.message).toBe('URL mengarah ke alamat internal yang tidak diperbolehkan')
      }
    })

    it('should accept valid public IP URLs without DNS lookup', async () => {
      const result = await validateUrlSafety('http://8.8.8.8/dns')
      expect(result.valid).toBe(true)
      expect(result.safeUrl).toBe('http://8.8.8.8/dns')
    })

    it('should perform DNS resolution and reject if resolved IP is private', async () => {
      dns.promises.lookup.mockResolvedValue({ address: '10.0.0.1', family: 4 })
      const result = await validateUrlSafety('http://internal-service.example.com')
      expect(result.valid).toBe(false)
      expect(result.code).toBe('SSRF_BLOCKED')
    })

    it('should perform DNS resolution and accept if resolved IP is public', async () => {
      dns.promises.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 })
      const result = await validateUrlSafety('https://example.com')
      expect(result.valid).toBe(true)
      expect(result.safeUrl).toBe('https://example.com/')
    })

    it('should reject when DNS resolution fails', async () => {
      dns.promises.lookup.mockRejectedValue(new Error('ENOTFOUND'))
      const result = await validateUrlSafety('http://nonexistent.invalid')
      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_URL')
    })

    it('should detect metadata IP after DNS resolution', async () => {
      dns.promises.lookup.mockResolvedValue({ address: '169.254.169.254', family: 4 })
      const result = await validateUrlSafety('http://evil-redirect.com')
      expect(result.valid).toBe(false)
      expect(result.code).toBe('METADATA_BLOCKED')
    })
  })
})
