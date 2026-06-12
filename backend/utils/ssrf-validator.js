import net from 'net'
import dns from 'dns'

/**
 * SSRF Validation Utility for PageMirror Security & Performance Scanner.
 *
 * Provides URL safety validation including private IP detection,
 * cloud metadata endpoint blocking, localhost detection, and
 * DNS resolution verification. All error messages in Bahasa Indonesia.
 */

/** Maximum allowed URL length */
const MAX_URL_LENGTH = 2048

/** Error messages in Bahasa Indonesia */
const ERROR_MESSAGES = {
  SSRF_BLOCKED: 'URL mengarah ke alamat internal yang tidak diperbolehkan',
  LOCALHOST_BLOCKED: 'URL localhost tidak diperbolehkan',
  METADATA_BLOCKED: 'URL cloud metadata tidak diperbolehkan',
  PROTOCOL_NOT_ALLOWED: 'Hanya protokol HTTP dan HTTPS yang diperbolehkan',
  INVALID_URL: 'URL tidak valid atau tidak dapat diparsing',
  URL_TOO_LONG: 'URL melebihi batas 2048 karakter'
}

/**
 * Checks if an IP address belongs to private/internal/reserved networks.
 * Handles IPv4, IPv6, and IPv4-mapped IPv6 addresses.
 *
 * @param {string} ip - The IP address to check
 * @returns {boolean} True if the IP is private/internal
 */
export function isPrivateIp(ip) {
  if (!ip) return false

  const ipType = net.isIP(ip)

  if (ipType === 4) {
    return isPrivateIpv4(ip)
  }

  if (ipType === 6) {
    return isPrivateIpv6(ip)
  }

  return false
}

/**
 * Checks if an IPv4 address is private/reserved.
 *
 * @param {string} ip - IPv4 address string
 * @returns {boolean}
 */
function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(num => parseInt(num, 10))
  if (parts.length !== 4 || parts.some(isNaN)) return true // treat invalid as unsafe

  const [a, b] = parts

  // 127.0.0.0/8 — Loopback
  if (a === 127) return true
  // 0.0.0.0/8 — Current network
  if (a === 0) return true
  // 10.0.0.0/8 — RFC 1918 Private Class A
  if (a === 10) return true
  // 172.16.0.0/12 — RFC 1918 Private Class B
  if (a === 172 && b >= 16 && b <= 31) return true
  // 192.168.0.0/16 — RFC 1918 Private Class C
  if (a === 192 && b === 168) return true
  // 169.254.0.0/16 — Link-local (APIPA)
  if (a === 169 && b === 254) return true

  return false
}

/**
 * Checks if an IPv6 address is private/reserved.
 * Handles pure IPv6 and IPv4-mapped IPv6 addresses.
 *
 * @param {string} ip - IPv6 address string
 * @returns {boolean}
 */
function isPrivateIpv6(ip) {
  const cleanIp = ip.replace(/[\[\]]/g, '').toLowerCase().trim()

  // IPv6 Loopback: ::1
  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true

  // IPv6 Unspecified: ::
  if (cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true

  // IPv6 Link-Local: fe80::/10 (fe80 - febf)
  if (/^fe[89ab][0-9a-f]?:/.test(cleanIp) || cleanIp.startsWith('fe80') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true

  // IPv6 Unique Local Address: fc00::/7 (fc00 - fdff)
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true

  // IPv4-mapped IPv6 addresses: ::ffff:x.x.x.x
  const ipv4MappedMatch = cleanIp.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/)
  if (ipv4MappedMatch) {
    return isPrivateIpv4(ipv4MappedMatch[1])
  }

  // Also handle compressed forms like ::ffff:a00:1 (which is ::ffff:10.0.0.1)
  const ipv4MappedHexMatch = cleanIp.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (ipv4MappedHexMatch) {
    const high = parseInt(ipv4MappedHexMatch[1], 16)
    const low = parseInt(ipv4MappedHexMatch[2], 16)
    const a = (high >> 8) & 0xff
    const b = high & 0xff
    const c = (low >> 8) & 0xff
    const d = low & 0xff
    return isPrivateIpv4(`${a}.${b}.${c}.${d}`)
  }

  return false
}

/**
 * Checks if a hostname or IP points to a cloud metadata endpoint.
 *
 * @param {string} hostname - The hostname to check
 * @param {string} [ip] - Optional resolved IP to check
 * @returns {boolean} True if the target is a cloud metadata endpoint
 */
export function isCloudMetadata(hostname, ip) {
  if (hostname) {
    const lower = hostname.toLowerCase().replace(/[\[\]]/g, '')
    // Direct metadata IP
    if (lower === '169.254.169.254') return true
    // Google Cloud metadata hostname
    if (lower === 'metadata.google.internal') return true
    // Any .internal hostname
    if (lower.endsWith('.internal')) return true
  }

  if (ip) {
    const cleanIp = ip.replace(/[\[\]]/g, '').trim()
    if (cleanIp === '169.254.169.254') return true
    // Check IPv4-mapped form
    if (cleanIp.toLowerCase() === '::ffff:169.254.169.254') return true
  }

  return false
}

/**
 * Checks if a hostname is a localhost variant.
 *
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if the hostname is a localhost variant
 */
export function isLocalhostHostname(hostname) {
  if (!hostname) return false
  const lower = hostname.toLowerCase()

  if (lower === 'localhost') return true
  if (lower === 'localhost.localdomain') return true
  if (lower.endsWith('.localhost')) return true

  return false
}

/**
 * Full SSRF validation pipeline with DNS resolution.
 * Validates a URL for safety before allowing scanner operations.
 *
 * @param {string} urlString - The URL string to validate
 * @returns {Promise<{valid: boolean, safeUrl?: string, code?: string, message?: string}>}
 */
export async function validateUrlSafety(urlString) {
  // 1. Check URL length
  if (!urlString || typeof urlString !== 'string') {
    return {
      valid: false,
      code: 'INVALID_URL',
      message: ERROR_MESSAGES.INVALID_URL
    }
  }

  const trimmed = urlString.trim()

  if (trimmed.length > MAX_URL_LENGTH) {
    return {
      valid: false,
      code: 'URL_TOO_LONG',
      message: ERROR_MESSAGES.URL_TOO_LONG
    }
  }

  if (trimmed === '') {
    return {
      valid: false,
      code: 'INVALID_URL',
      message: ERROR_MESSAGES.INVALID_URL
    }
  }

  // 2. Parse URL
  let parsedUrl
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    return {
      valid: false,
      code: 'INVALID_URL',
      message: ERROR_MESSAGES.INVALID_URL
    }
  }

  // 3. Protocol check — only http: and https: allowed
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      valid: false,
      code: 'PROTOCOL_NOT_ALLOWED',
      message: ERROR_MESSAGES.PROTOCOL_NOT_ALLOWED
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  // 4. Empty hostname check
  if (!hostname) {
    return {
      valid: false,
      code: 'INVALID_URL',
      message: ERROR_MESSAGES.INVALID_URL
    }
  }

  // 5. Localhost hostname check
  if (isLocalhostHostname(hostname)) {
    return {
      valid: false,
      code: 'LOCALHOST_BLOCKED',
      message: ERROR_MESSAGES.LOCALHOST_BLOCKED
    }
  }

  // 6. Cloud metadata hostname check
  if (isCloudMetadata(hostname)) {
    return {
      valid: false,
      code: 'METADATA_BLOCKED',
      message: ERROR_MESSAGES.METADATA_BLOCKED
    }
  }

  // 7. Direct IP address check (when hostname is an IP literal)
  const cleanHost = hostname.replace(/[\[\]]/g, '')
  if (net.isIP(cleanHost)) {
    // Check cloud metadata IP
    if (isCloudMetadata(cleanHost, cleanHost)) {
      return {
        valid: false,
        code: 'METADATA_BLOCKED',
        message: ERROR_MESSAGES.METADATA_BLOCKED
      }
    }
    // Check private IP
    if (isPrivateIp(cleanHost)) {
      return {
        valid: false,
        code: 'SSRF_BLOCKED',
        message: ERROR_MESSAGES.SSRF_BLOCKED
      }
    }

    // IP is public — URL is safe
    return {
      valid: true,
      safeUrl: parsedUrl.toString()
    }
  }

  // 8. DNS resolution — resolve hostname and verify resolved IP is not private
  try {
    const { address } = await dns.promises.lookup(hostname)

    // Check cloud metadata on resolved IP
    if (isCloudMetadata(hostname, address)) {
      return {
        valid: false,
        code: 'METADATA_BLOCKED',
        message: ERROR_MESSAGES.METADATA_BLOCKED
      }
    }

    // Check private IP on resolved address
    if (isPrivateIp(address)) {
      return {
        valid: false,
        code: 'SSRF_BLOCKED',
        message: ERROR_MESSAGES.SSRF_BLOCKED
      }
    }
  } catch {
    // DNS resolution failure — treat as invalid URL
    return {
      valid: false,
      code: 'INVALID_URL',
      message: ERROR_MESSAGES.INVALID_URL
    }
  }

  // 9. All checks passed — URL is safe
  return {
    valid: true,
    safeUrl: parsedUrl.toString()
  }
}
