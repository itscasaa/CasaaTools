import { isPrivateIp, isCloudMetadata, isLocalhostHostname } from './ssrf-validator.js'
import dns from 'dns'
import http from 'http'
import https from 'https'
import net from 'net'
import { scannerConfig } from '../config/scanner.config.js'

/**
 * Follows redirects manually (up to MAX_REDIRECTS hops), validating each
 * hop target against the SSRF validator. Uses HEAD requests to minimize
 * bandwidth. Returns the final safe URL if all hops pass validation.
 *
 * @param {string} initialUrl - The starting URL (already validated by ssrf-validator)
 * @param {{ maxRedirects?: number }} options
 * @returns {Promise<{ safe: boolean, finalUrl?: string, code?: string, message?: string }>}
 */
export async function validateRedirects(initialUrl, options = {}) {
  const maxRedirects = options.maxRedirects ?? scannerConfig.MAX_REDIRECTS
  let currentUrl = initialUrl
  let redirectCount = 0

  while (redirectCount <= maxRedirects) {
    let parsedUrl
    try {
      parsedUrl = new URL(currentUrl)
    } catch {
      return { safe: false, code: 'INVALID_URL', message: 'URL redirect tidak valid' }
    }

    // Protocol check
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        safe: false,
        code: 'PROTOCOL_NOT_ALLOWED',
        message: 'Redirect mengarah ke protokol yang tidak diizinkan'
      }
    }

    const hostname = parsedUrl.hostname.toLowerCase()

    // Localhost check
    if (isLocalhostHostname(hostname)) {
      return { safe: false, code: 'LOCALHOST_BLOCKED', message: 'Redirect mengarah ke localhost' }
    }

    // Cloud metadata check
    if (isCloudMetadata(hostname)) {
      return { safe: false, code: 'METADATA_BLOCKED', message: 'Redirect mengarah ke cloud metadata endpoint' }
    }

    // IP literal check
    const cleanHost = hostname.replace(/[\[\]]/g, '')
    if (net.isIP(cleanHost)) {
      if (isPrivateIp(cleanHost)) {
        return { safe: false, code: 'SSRF_BLOCKED', message: 'Redirect mengarah ke alamat IP internal' }
      }
      if (isCloudMetadata(cleanHost, cleanHost)) {
        return { safe: false, code: 'METADATA_BLOCKED', message: 'Redirect mengarah ke cloud metadata endpoint' }
      }
    } else {
      // DNS resolution for hostname
      try {
        const { address } = await dns.promises.lookup(hostname)
        if (isPrivateIp(address)) {
          return { safe: false, code: 'SSRF_BLOCKED', message: 'Redirect mengarah ke alamat IP internal (setelah resolusi DNS)' }
        }
        if (isCloudMetadata(hostname, address)) {
          return { safe: false, code: 'METADATA_BLOCKED', message: 'Redirect mengarah ke cloud metadata endpoint' }
        }
      } catch {
        return { safe: false, code: 'INVALID_URL', message: 'Tidak dapat meresolver hostname redirect' }
      }
    }

    // Make a HEAD request to check for redirect
    try {
      const response = await makeHeadRequest(currentUrl)

      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        redirectCount++
        if (redirectCount > maxRedirects) {
          return {
            safe: false,
            code: 'TOO_MANY_REDIRECTS',
            message: 'Terlalu banyak redirect. Pemindaian dibatalkan untuk keamanan.'
          }
        }
        // Resolve relative redirect
        currentUrl = new URL(response.headers.location, currentUrl).toString()
        continue
      }

      // No more redirects — this is the final URL
      return { safe: true, finalUrl: currentUrl }
    } catch (err) {
      // Network error during preflight — allow Lighthouse to try (it may succeed)
      // Return safe but with the current URL
      return { safe: true, finalUrl: currentUrl }
    }
  }

  return {
    safe: false,
    code: 'TOO_MANY_REDIRECTS',
    message: 'Terlalu banyak redirect. Pemindaian dibatalkan untuk keamanan.'
  }
}

/**
 * Makes a HEAD request with no redirect following.
 * Returns the raw response with statusCode and headers.
 */
function makeHeadRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const module = parsedUrl.protocol === 'https:' ? https : http

    const options = {
      method: 'HEAD',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: { 'User-Agent': 'CasaaTools-SSRF-Preflight/1.0' },
      timeout: 10000 // 10 second timeout per hop
    }

    const req = module.request(options, (res) => {
      res.resume() // Consume the response body to free memory
      resolve({ statusCode: res.statusCode, headers: res.headers })
    })

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.end()
  })
}
