/**
 * URL utility helper functions for PageMirror.
 */

/**
 * Normalizes a URL input string by parsing it with the URL constructor.
 * Returns a URL object on success, or null on failure.
 * @param {string} input 
 * @returns {URL|null}
 */
export const normalizeUrl = (input) => {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  
  try {
    return new URL(trimmed)
  } catch (err) {
    return null
  }
}

/**
 * Validates if the parsed URL has an allowed protocol (http: or https:).
 * @param {URL} parsedUrl 
 * @returns {boolean}
 */
export const isHttpUrl = (parsedUrl) => {
  if (!parsedUrl || !parsedUrl.protocol) return false
  return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
}

/**
 * Extracts and lowercases the hostname from a parsed URL object.
 * @param {URL} parsedUrl 
 * @returns {string}
 */
export const getHostname = (parsedUrl) => {
  if (!parsedUrl || !parsedUrl.hostname) return ''
  return parsedUrl.hostname.toLowerCase()
}
