import { createSnapshot as createOfflinePackage } from './snapshot.service.js'
import { createSingleHtmlSnapshot } from './single-html.service.js'
import { logger } from '../utils/logger.util.js'

/**
 * Routes snapshot creation to appropriate pipeline based on mode.
 * 
 * @param {object} params
 * @param {string} params.url - The target URL (already validated/normalized)
 * @param {string} params.jobId - The unique Job ID
 * @param {string} params.mode - Snapshot mode ('offline-package' or 'single-html')
 * @param {function} params.onProgress - Progress callback function
 * @returns {Promise<object>} The snapshot metadata
 */
export const createSnapshotByMode = async ({ url, jobId, mode = 'offline-package', options = {}, onProgress }) => {
  logger.info(`Creating snapshot for job ${jobId} with mode: ${mode}`)
  
  if (mode === 'single-html') {
    return await createSingleHtmlSnapshot({ url, jobId, options, onProgress })
  } else {
    // Default to offline-package mode
    return await createOfflinePackage({ url, jobId, options, onProgress })
  }
}
