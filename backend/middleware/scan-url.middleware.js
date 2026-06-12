import { validateUrlSafety } from '../utils/ssrf-validator.js'
import { sanitizeErrorMessage } from '../utils/path-containment.js'

/**
 * Middleware to validate scan target URL with full SSRF protection.
 * Performs DNS resolution, checks private IPs, localhost, metadata endpoints, and protocol.
 * Attaches `req.safeUrl` on success.
 */
export const validateScanUrl = async (req, res, next) => {
  const { url, demo } = req.body

  // Demo mode bypass — skip SSRF validation entirely
  if (demo === true) {
    req.safeUrl = url
    return next()
  }

  // Run full SSRF validation pipeline
  const result = await validateUrlSafety(url)

  if (!result.valid) {
    const statusMap = {
      INVALID_URL: 400,
      URL_TOO_LONG: 400,
      PROTOCOL_NOT_ALLOWED: 400,
      SSRF_BLOCKED: 403,
      LOCALHOST_BLOCKED: 403,
      METADATA_BLOCKED: 403
    }

    const httpCode = statusMap[result.code] || 400
    const errorMessage = result.message || sanitizeErrorMessage(String(result))

    return res.status(httpCode).json({
      success: false,
      error: {
        message: errorMessage,
        code: result.code
      }
    })
  }

  req.safeUrl = result.safeUrl
  next()
}
