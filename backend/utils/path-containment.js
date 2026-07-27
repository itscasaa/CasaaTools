import path from 'path'

/**
 * Verifies that a resolved path is contained within an allowed base directory.
 * Normalizes both paths before comparison for Windows compatibility.
 * 
 * @param {string} resolvedPath - The fully resolved absolute path to check
 * @param {string} allowedBase - The allowed base directory (absolute path)
 * @returns {boolean} True if resolvedPath is inside allowedBase
 */
export function isContainedIn(resolvedPath, allowedBase) {
  if (!resolvedPath || !allowedBase) return false

  // Normalize Windows backslashes to forward slashes for cross-platform matching
  const cleanPath = resolvedPath.replace(/\\/g, '/')
  const cleanBase = allowedBase.replace(/\\/g, '/')

  const normalizedPath = path.normalize(path.resolve(cleanPath))
  const normalizedBase = path.normalize(path.resolve(cleanBase))

  // Ensure base ends with a slash for accurate prefix matching
  const baseWithSep = normalizedBase.endsWith('/') || normalizedBase.endsWith(path.sep)
    ? normalizedBase
    : normalizedBase + '/'

  // Path is contained if it equals the base or starts with base prefix
  return normalizedPath === normalizedBase || normalizedPath.startsWith(baseWithSep)
}

/**
 * Validates user-provided path input for dangerous patterns.
 * Rejects inputs containing path traversal sequences, absolute paths,
 * drive letters, or null bytes.
 * 
 * @param {string} inputPath - Raw user-provided path string
 * @returns {{ valid: boolean, error?: string }}
 */
export function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'Path input is required' }
  }

  // Reject null bytes
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Path contains null bytes' }
  }

  // Reject .. sequences (path traversal)
  if (inputPath.includes('..')) {
    return { valid: false, error: 'Path traversal sequences (..) are not allowed' }
  }

  // Reject leading / or \ (absolute paths)
  if (inputPath.startsWith('/') || inputPath.startsWith('\\')) {
    return { valid: false, error: 'Absolute paths are not allowed' }
  }

  // Reject drive letters (e.g., C:\, D:/, E:)
  if (/^[A-Za-z]:[/\\]/.test(inputPath)) {
    return { valid: false, error: 'Drive letter paths are not allowed' }
  }

  return { valid: true }
}

/**
 * Strips absolute server filesystem paths from error messages
 * to prevent path disclosure to the frontend.
 * Handles both Windows (C:\Users\...) and Unix (/home/..., /var/...) path formats.
 * 
 * @param {string} message - Error message that may contain server paths
 * @returns {string} Sanitized message with paths replaced by [path hidden]
 */
export function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') return message || ''

  let sanitized = message

  // Windows absolute paths: C:\..., D:\...
  sanitized = sanitized.replace(/[A-Za-z]:\\[^\s"'`]+/g, '[path hidden]')

  // Unix absolute paths starting with common system directories
  sanitized = sanitized.replace(/\/(?:home|var|usr|tmp|opt|etc|root|mnt|srv|proc|sys|dev|run)[^\s"'`]*/g, '[path hidden]')

  return sanitized
}
