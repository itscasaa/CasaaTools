import { appConfig } from '../constants/appConfig'

const getAuthHeaders = () => {
  const token = localStorage.getItem('casaa_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const jobApi = {
  /**
   * Fetches details of a single job.
   * @param {string} jobId - The job ID
   * @returns {Promise<object>} The job details
   */
  async getJob(jobId) {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/jobs/${jobId}`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Job not found')
    }
    const job = data.data
    return job
  },

  /**
   * Alias helper to match existing codebase.
   */
  async getJobStatus(jobId) {
    return this.getJob(jobId)
  },

  /**
   * Fetches list of existing jobs.
   * @returns {Promise<Array>} List of job summaries
   */
  async getJobs() {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/jobs`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Failed to fetch jobs')
    }
    return data.data.jobs
  },

  /**
   * Resolves absolute screenshot URL for a job.
   */
  getScreenshotUrl(jobId) {
    // Add token parameter or authorization if necessary, but serving static files via express can remain direct
    const token = localStorage.getItem('casaa_token')
    return `${appConfig.apiBaseUrl}/api/jobs/${jobId}/screenshot?token=${token || ''}`
  },

  /**
   * Resolves absolute preview screenshot URL for a job.
   */
  getPreviewScreenshotUrl(jobId) {
    const token = localStorage.getItem('casaa_token')
    return `${appConfig.apiBaseUrl}/api/jobs/${jobId}/preview-screenshot?token=${token || ''}`
  },

  /**
   * Resolves absolute visual diff image URL for a job.
   */
  getVisualDiffUrl(jobId) {
    const token = localStorage.getItem('casaa_token')
    return `${appConfig.apiBaseUrl}/api/jobs/${jobId}/visual-diff?token=${token || ''}`
  },

  /**
   * Resolves absolute preview URL for a job.
   */
  getPreviewUrl(jobId) {
    return `${appConfig.apiBaseUrl}/preview/${jobId}/`
  },

  /**
   * Fetches raw preview HTML text.
   */
  async getJobHtml(jobId) {
    const response = await fetch(this.getPreviewUrl(jobId))
    if (!response.ok) {
      throw new Error('Failed to load preview HTML')
    }
    return await response.text()
  },


  /**
   * Retrieve recent jobs mapping to compatibility schema.
   */
  async getRecentJobs(limit = 10, offset = 0) {
    try {
      const jobs = await this.getJobs()
      return {
        success: true,
        jobs: jobs.slice(offset, offset + limit),
        total: jobs.length,
        limit,
        offset
      }
    } catch (e) {
      return {
        success: true,
        jobs: [],
        total: 0,
        limit,
        offset
      }
    }
  },

  /**
   * Resolves absolute manifest URL for a job.
   */
  getManifestUrl(jobId) {
    const token = localStorage.getItem('casaa_token')
    return `${appConfig.apiBaseUrl}/api/jobs/${jobId}/manifest?token=${token || ''}`
  },

  /**
   * Fetches the manifest.json details.
   */
  async getManifest(jobId) {
    const response = await fetch(`${appConfig.apiBaseUrl}/api/jobs/${jobId}/manifest`, {
      headers: {
        ...getAuthHeaders()
      }
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || data.message || 'Manifest not found')
    }
    return data.data
  },

  /**
   * Returns the absolute ZIP download URL.
   */
  getDownloadUrl(jobId) {
    const token = localStorage.getItem('casaa_token')
    return `${appConfig.apiBaseUrl}/api/jobs/${jobId}/download?token=${token || ''}`
  },

  /**
   * Deletes a job's output sandbox folder.
   */
  async deleteJob(jobId) {
    try {
      const response = await fetch(`${appConfig.apiBaseUrl}/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders()
        }
      })
      
      // Check if fetch succeeded
      if (!response.ok) {
        // Try to parse error from backend
        try {
          const data = await response.json()
          throw new Error(data.error?.message || data.message || `Failed to delete snapshot (${response.status})`)
        } catch (parseErr) {
          // If JSON parsing fails, throw generic error
          throw new Error(`Failed to delete snapshot (${response.status})`)
        }
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error?.message || data.message || 'Failed to delete snapshot')
      }
      return data
    } catch (err) {
      // Network error or CORS issue
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Could not reach the backend. Check that the backend is running and CORS allows this frontend origin.')
      }
      // Re-throw other errors
      throw err
    }
  }
}
