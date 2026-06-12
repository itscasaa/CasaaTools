import net from 'net'
import { normalizeUrl, isHttpUrl, getHostname } from '../utils/url.util.js'
import { isLocalhost, isBlockedHostname, isPrivateIp, isMetadataHost } from '../utils/security.util.js'

/**
 * Middleware to validate target website URL before any cloning activity is performed.
 */
export const validateUrl = (req, res, next) => {
  const { url } = req.body

  // 1. Required URL checks
  if (url === undefined || url === null) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'URL is required.',
        code: 'INVALID_URL'
      }
    })
  }

  if (typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'URL must be a string.',
        code: 'INVALID_URL'
      }
    })
  }

  const trimmedUrl = url.trim()
  if (trimmedUrl === '') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'URL is required.',
        code: 'INVALID_URL'
      }
    })
  }

  // 2. Normalize and parse URL
  const parsedUrl = normalizeUrl(trimmedUrl)
  if (!parsedUrl) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid or unsafe URL.',
        code: 'INVALID_URL'
      }
    })
  }

  // 3. Protocol check (allow only http: and https:)
  if (!isHttpUrl(parsedUrl)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Only HTTP and HTTPS URLs are allowed.',
        code: 'INVALID_URL'
      }
    })
  }

  const hostname = getHostname(parsedUrl)
  
  // Hostname validation (empty hostnames)
  if (!hostname) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid or unsafe URL.',
        code: 'INVALID_URL'
      }
    })
  }

  // 4. Cloud metadata protection
  if (isMetadataHost(hostname)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Cloud metadata URLs are not allowed.',
        code: 'INVALID_URL'
      }
    })
  }

  // 5. Hostname validation (Localhost and Blocked Hostnames)
  if (isLocalhost(hostname) || isBlockedHostname(hostname)) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Localhost URLs are not allowed.',
        code: 'INVALID_URL'
      }
    })
  }

  // 6. IP address validation (for direct IP targets)
  const cleanHost = hostname.replace(/[\[\]]/g, '') // strip brackets for IPv6 host comparison
  if (net.isIP(cleanHost)) {
    if (isPrivateIp(cleanHost)) {
      if (cleanHost === '169.254.169.254') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Cloud metadata URLs are not allowed.',
            code: 'INVALID_URL'
          }
        })
      }
      return res.status(403).json({
        success: false,
        error: {
          message: 'Private or internal IP addresses are not allowed.',
          code: 'INVALID_URL'
        }
      })
    }
  }

  // Return normalized URL to the controller as req.safeUrl
  req.safeUrl = parsedUrl.toString()
  next()
}
