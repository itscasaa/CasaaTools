import { appConfig } from '../constants/appConfig'

const getAuthHeaders = () => {
  const token = localStorage.getItem('casaa_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const promptGeneratorApi = {
  /**
   * Post target URL to generate rebuild prompt
   * @param {string} url - Target website URL to extract and process
   * @returns {Promise<object>} Generated prompt and metadata
   */
  async generatePrompt(url) {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/prompt-generator/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ url })
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to generate website rebuilding prompt.')
    }
    return data.data
  }
}
