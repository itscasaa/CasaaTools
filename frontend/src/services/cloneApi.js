import { appConfig } from '../constants/appConfig'

const getAuthHeaders = () => {
  const token = localStorage.getItem('casaa_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const cloneApi = {
  /**
   * Submits a URL to the backend /api/clone endpoint.
   * 
   * @param {string} url - The target URL to clone
   * @param {object} options - Options (e.g. scrollPage, captureAssets, mode)
   * @returns {Promise<object>} Response JSON from API
   */
  async createCloneJob(url, options = {}) {
    const { mode = 'offline-package', ...otherOptions } = options
    
    const response = await fetch(`${appConfig.apiBaseUrl}/api/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ url, mode, options: otherOptions })
    })

    const data = await response.json()
    
    if (!response.ok || !data.success) {
      const errMsg = data.error?.message || data.message || 'Failed to submit URL for rebuilding.'
      const err = new Error(errMsg)
      err.code = data.error?.code
      throw err
    }
    
    return data
  },

  /**
   * Helper alias to match existing codebases.
   */
  async submitCloneJob(url, options = {}) {
    return this.createCloneJob(url, options)
  }
}
