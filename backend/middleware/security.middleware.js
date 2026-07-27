import { logger } from '../utils/logger.util.js'

// SQL Injection detection regex patterns
const SQLI_PATTERNS = [
  /(\b(select|union|insert|update|delete|drop|alter|create|truncate|exec|grant)\b\s+.*?\b(from|into|table|where|join|values)\b)/i,
  /('\s*or\s*'\d+'\s*=\s*'\d+)/i,
  /("\s*or\s*"\d+"\s*=\s*"\d+)/i,
  /(\bor\s+\d+\s*=\s*\d+)/i,
  /(--\s*$)/,
  /(\/\*[\s\S]*?\*\/)/
]

// Cross-Site Scripting (XSS) detection regex patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /on\w+\s*=\s*(['"][^'"]*['"]|\S+)/gi, // Matches event handlers like onload= or onerror=
  /<\s*iframe\b/i,
  /<\s*object\b/i,
  /<\s*embed\b/i
]

// Path Traversal detection regex patterns
const PATH_TRAVERSAL_PATTERNS = [
  /(\.\.[/\\])/, // Matches ../ or ..\
  /%2e%2e%2f/i,  // URL encoded ../
  /%2e%2e%5c/i   // URL encoded ..\
]

/**
 * Clean HTML/special characters from a string to prevent XSS.
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Check if a value matches SQLi, XSS, or Path Traversal vectors.
 * Returns { matched: boolean, type: string|null }
 */
export const checkThreats = (value, isUrlField = false) => {
  if (typeof value !== 'string') return { matched: false, type: null }

  // Decode URI component to check for encoded attacks
  let decodedValue = value
  try {
    decodedValue = decodeURIComponent(value)
  } catch (e) {
    // Ignore decoding errors
  }

  // 1. Check for Path Traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(decodedValue)) {
      return { matched: true, type: 'Path Traversal' }
    }
  }

  // 2. Check for XSS
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(decodedValue)) {
      return { matched: true, type: 'Cross-Site Scripting (XSS)' }
    }
  }

  // 3. Check for SQL Injection
  for (const pattern of SQLI_PATTERNS) {
    if (pattern.test(decodedValue)) {
      return { matched: true, type: 'SQL Injection' }
    }
  }

  return { matched: false, type: null }
}

/**
 * Recursively scan an object (req.body, req.query, or req.params) for security threats.
 * Sanitizes safe string fields and throws an error if a threat is detected.
 */
const scanAndSanitize = (obj, isUrlParent = false) => {
  if (!obj || typeof obj !== 'object') return obj

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    const isUrlField = isUrlParent || key.toLowerCase().includes('url') || key.toLowerCase().includes('link')

    if (typeof value === 'string') {
      const threat = checkThreats(value, isUrlField)
      if (threat.matched) {
        throw new Error(`Security threat detected: Malicious ${threat.type} pattern in field "${key}".`)
      }

      // If it's NOT a URL field, HTML-sanitize it to be safe
      if (!isUrlField) {
        obj[key] = sanitizeString(value)
      }
    } else if (typeof value === 'object') {
      scanAndSanitize(value, isUrlField)
    }
  }
}

/**
 * Express Middleware to scan and sanitize incoming request parameters, query strings, and body data.
 * Rejects requests containing SQL Injection, XSS, or Path Traversal payloads.
 */
export const securityMiddleware = (req, res, next) => {
  try {
    // Scan body data
    if (req.body) {
      scanAndSanitize(req.body)
    }

    // Scan query parameters
    if (req.query) {
      scanAndSanitize(req.query)
    }

    // Scan route parameters
    if (req.params) {
      scanAndSanitize(req.params)
    }

    next()
  } catch (err) {
    logger.warn(`Security check blocked request: ${err.message} from IP: ${req.ip}`)
    
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'SECURITY_VIOLATION'
      }
    })
  }
}
