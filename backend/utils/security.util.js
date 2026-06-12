import net from 'net'

/**
 * Checks if the hostname is localhost or local host variation.
 * @param {string} hostname 
 * @returns {boolean}
 */
export const isLocalhost = (hostname) => {
  if (!hostname) return false
  const lower = hostname.toLowerCase()
  return lower === 'localhost' || lower === 'localhost.localdomain' || lower.endsWith('.localhost')
}

/**
 * Checks if the hostname matches any blocked hostnames or patterns.
 * @param {string} hostname 
 * @returns {boolean}
 */
export const isBlockedHostname = (hostname) => {
  if (!hostname) return true
  const lower = hostname.toLowerCase()
  
  const blockedNames = [
    'localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'metadata',
    'internal'
  ]
  
  if (blockedNames.includes(lower)) return true
  if (lower.endsWith('.localhost') || lower.endsWith('.local') || lower.endsWith('.internal')) return true
  
  return false
}

/**
 * Checks if the IP address belongs to private/internal/reserved networks.
 * Handles both IPv4 and IPv6 addresses.
 * @param {string} ip 
 * @returns {boolean}
 */
export const isPrivateIp = (ip) => {
  if (!ip) return false
  
  const ipType = net.isIP(ip)
  if (ipType === 4) {
    const parts = ip.split('.').map(num => parseInt(num, 10))
    if (parts.length !== 4 || parts.some(isNaN)) return true // treat invalid formatting as unsafe
    
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true
    // 0.0.0.0/8 (Broadcast/any interface)
    if (parts[0] === 0) return true
    // 10.0.0.0/8 (Private Class A)
    if (parts[0] === 10) return true
    // 172.16.0.0/12 (Private Class B)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
    // 192.168.0.0/16 (Private Class C)
    if (parts[0] === 192 && parts[1] === 168) return true
    // 169.254.0.0/16 (Link-local, APIPA)
    if (parts[0] === 169 && parts[1] === 254) return true
    
    return false
  }
  
  if (ipType === 6) {
    // Strip optional brackets and normalize to lowercase
    const cleanIp = ip.replace(/[\[\]]/g, '').toLowerCase().trim()
    
    // IPv6 Loopback: ::1, 0:0:0:0:0:0:0:1, or unspecified ::
    if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1' || cleanIp === '::' || cleanIp === '0:0:0:0:0:0:0:0') return true
    
    // IPv6 Link-Local: fe80::/10 (starts with fe8, fe9, fea, feb)
    if (cleanIp.startsWith('fe8') || cleanIp.startsWith('fe9') || cleanIp.startsWith('fea') || cleanIp.startsWith('feb')) return true
    
    // IPv6 Unique Local: fc00::/7 (starts with fc or fd)
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true
    
    // IPv4-mapped IPv6 address private ranges (e.g. ::ffff:127.0.0.1, ::ffff:10.0.0.1)
    if (
      cleanIp.startsWith('::ffff:127.') || 
      cleanIp.startsWith('::ffff:10.') || 
      cleanIp.startsWith('::ffff:192.168.') || 
      cleanIp.startsWith('::ffff:172.')
    ) {
      return true
    }
    
    return false
  }
  
  return false
}

/**
 * Checks if the hostname points to cloud metadata services.
 * @param {string} hostname 
 * @returns {boolean}
 */
export const isMetadataHost = (hostname) => {
  if (!hostname) return false
  const lower = hostname.toLowerCase().replace(/[\[\]]/g, '')
  return lower === 'metadata.google.internal' || lower === '169.254.169.254'
}

/**
 * Performs a comprehensive security validation on the parsed URL object.
 * @param {URL} parsedUrl 
 * @returns {boolean} True if the URL is unsafe, false otherwise.
 */
export const isUnsafeUrl = (parsedUrl) => {
  if (!parsedUrl) return true
  
  // Protocol check
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return true
  
  const hostname = parsedUrl.hostname.toLowerCase()
  if (!hostname) return true
  
  if (isMetadataHost(hostname)) return true
  if (isLocalhost(hostname)) return true
  if (isBlockedHostname(hostname)) return true
  
  const cleanHost = hostname.replace(/[\[\]]/g, '')
  if (net.isIP(cleanHost) && isPrivateIp(cleanHost)) return true
  
  return false
}
