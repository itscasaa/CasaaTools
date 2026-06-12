import path from 'path'
import { getJobOutputDir } from '../utils/path.util.js'
import { readTextFile, fileExists } from '../utils/file.util.js'

/**
 * Retrieves the raw captured HTML content for a job.
 * For offline-package mode: serves index.html
 * For single-html mode: serves single.html
 * 
 * @param {string} jobId - The unique job ID
 * @param {string} mode - Snapshot mode ('offline-package' or 'single-html')
 * @returns {Promise<string>} The captured HTML file content
 * @throws {Error} If job or HTML file is not found
 */
export const getPreviewHtml = async (jobId, mode = 'offline-package') => {
  const outputDir = getJobOutputDir(jobId)
  const htmlFile = mode === 'single-html' ? 'single.html' : 'index.html'
  const htmlPath = path.join(outputDir, htmlFile)
  
  if (!(await fileExists(htmlPath))) {
    const error = new Error(`Preview ${htmlFile} not found.`)
    error.statusCode = 404
    error.code = 'PREVIEW_NOT_FOUND'
    throw error
  }
  
  return await readTextFile(htmlPath)
}
