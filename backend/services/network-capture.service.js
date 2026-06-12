import { logger } from '../utils/logger.util.js'

/**
 * Attaches a listener to a Playwright page to capture network resource metadata.
 * 
 * @param {object} page - Playwright page instance
 * @param {Array} resourcesList - Array where captured resource metadata is stored
 */
export const registerNetworkCapture = (page, resourcesList) => {
  page.on('response', (response) => {
    try {
      const request = response.request()
      const url = response.url()
      const resourceType = request.resourceType()
      const statusCode = response.status()
      const headers = response.headers()
      const contentType = headers['content-type'] || ''

      resourcesList.push({
        url,
        resourceType,
        statusCode,
        contentType,
        source: 'network'
      })
    } catch (err) {
      logger.debug(`Failed to capture network response metadata: ${err.message}`)
    }
  })
}
