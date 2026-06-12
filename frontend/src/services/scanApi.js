import { appConfig } from '../constants/appConfig'

// Development debug: log API base URL on first load
if (import.meta.env.DEV) {
  console.log('[scanner-api] API_BASE_URL:', appConfig.apiBaseUrl)
}

/**
 * Creates a user-friendly error from a network/fetch failure.
 */
function createNetworkError(originalError) {
  const msg = originalError?.message || ''

  if (import.meta.env.DEV) {
    console.error('[scanner-api] Network error:', msg, originalError)
  }

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    return new Error(`Backend scanner tidak dapat dihubungi (${appConfig.apiBaseUrl}). Pastikan backend berjalan.`)
  }
  if (msg.includes('CORS') || msg.includes('blocked')) {
    return new Error('Request diblokir CORS. Periksa ALLOWED_ORIGINS di backend.')
  }

  return new Error(`Koneksi ke server gagal: ${msg || 'Unknown error'}`)
}

export const scanApi = {
  /**
   * Start a Lighthouse performance scan.
   * @param {object} payload - { url, demo }
   * @returns {Promise<object>} Response JSON with scan data
   */
  async startLighthouseScan(payload) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/lighthouse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal memulai pemindaian performa.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Start a CodeQL security scan.
   * @param {object} payload - { sourceType, repoUrl?, workspaceId? }
   * @returns {Promise<object>} Response JSON with scan data
   */
  async startCodeqlScan(payload) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/codeql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal memulai pemindaian keamanan.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Start a CodeQL scan with ZIP file upload.
   * @param {File} file - The ZIP file to upload
   * @returns {Promise<object>} Response JSON with scan data
   */
  async startCodeqlZipScan(file) {
    const formData = new FormData()
    formData.append('sourceType', 'zip')
    formData.append('projectZip', file)

    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/codeql`, {
        method: 'POST',
        body: formData
        // Note: Do NOT set Content-Type header - browser sets it with boundary for multipart
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal mengunggah dan memindai file ZIP.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Get a scan by ID.
   * @param {string} scanId
   * @returns {Promise<object>} Scan data
   */
  async getScan(scanId) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/${scanId}`)
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal mengambil data pemindaian.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * List scans with optional pagination.
   * @param {object} params - { limit, offset }
   * @returns {Promise<object>} List of scans
   */
  async listScans(params = {}) {
    const query = new URLSearchParams()
    if (params.limit) query.set('limit', params.limit)
    if (params.offset) query.set('offset', params.offset)

    const url = `${appConfig.apiBaseUrl}/api/scans${query.toString() ? '?' + query.toString() : ''}`

    let response
    try {
      response = await fetch(url)
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal mengambil daftar pemindaian.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Cancel an active scan.
   * @param {string} scanId
   * @returns {Promise<object>}
   */
  async cancelScan(scanId) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/${scanId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal membatalkan pemindaian.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Delete a scan.
   * @param {string} scanId
   * @returns {Promise<object>}
   */
  async deleteScan(scanId) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/scans/${scanId}`, {
        method: 'DELETE'
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal menghapus pemindaian.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Start a ZAP Baseline scan.
   * @param {string} targetUrl
   * @returns {Promise<object>} Response JSON with scan data
   */
  async startZapScan(targetUrl) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/zap-scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl })
      })
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal memulai pemindaian ZAP.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  },

  /**
   * Get a ZAP scan status.
   * @param {string} scanId
   * @returns {Promise<object>} Response JSON with scan data
   */
  async getZapScan(scanId) {
    let response
    try {
      response = await fetch(`${appConfig.apiBaseUrl}/api/zap-scan/status/${scanId}`)
    } catch (networkErr) {
      throw createNetworkError(networkErr)
    }

    let data
    try {
      data = await response.json()
    } catch {
      throw new Error('Respons server tidak valid (bukan JSON).')
    }

    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Gagal mengambil status pemindaian ZAP.'
      const err = new Error(errMsg)
      err.code = data.error?.code || data.code
      throw err
    }

    return data
  }
}
