export function validateUrl(url) {
  if (!url) {
    return { isValid: false, error: 'URL is required.' }
  }

  // General URL validation
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch (e) {
    return { isValid: false, error: 'Please enter a valid URL (include http:// or https://).' }
  }

  // Check protocols
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { isValid: false, error: 'Only HTTP and HTTPS protocols are allowed.' }
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  // Loopback and Localhosts
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]'
  ) {
    return { isValid: false, error: 'Local network addresses are restricted for security reasons.' }
  }

  // Cloud metadata IP
  if (hostname === '169.254.169.254') {
    return { isValid: false, error: 'Restricted IP address pattern.' }
  }

  // Private IP checks
  // Class A: 10.0.0.0 - 10.255.255.255
  // Class B: 172.16.0.0 - 172.31.255.255
  // Class C: 192.168.0.0 - 192.168.255.255
  if (
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return { isValid: false, error: 'Access to private local network IPs is prohibited.' }
  }

  return { isValid: true, error: '' }
}
