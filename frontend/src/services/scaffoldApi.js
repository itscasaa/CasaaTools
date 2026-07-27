import { appConfig } from '../constants/appConfig'

const getAuthHeaders = () => {
  const token = localStorage.getItem('casaa_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const scaffoldApi = {
  /**
   * Submit configuration details to generate project skeletons
   * @param {object} data - Form options { projectName, description, framework, language, styling, folders }
   * @returns {Promise<object>} Scaffold session details with fileList and scaffoldId
   */
  async generateScaffold(data) {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/scaffold/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Failed to generate project skeleton.')
    }
    return result.data
  },

  /**
   * Returns complete download URL for the generated ZIP
   * @param {string} scaffoldId
   * @returns {string} URL string
   */
  getDownloadUrl(scaffoldId) {
    return `${appConfig.apiBaseUrl}/api/scaffold/download/${scaffoldId}`
  }
}
