import path from 'path'
import { appConfig } from '../config/app.config.js'

// Base output directory resolved absolutely relative to process working directory
const BASE_OUTPUT_DIR = path.resolve(process.cwd(), appConfig.OUTPUT_DIR || './output')

/**
 * Resolves the absolute path to a specific job's output directory.
 * Ensures that the resulting path is safely contained within the base output directory to prevent directory traversal.
 * 
 * @param {string} jobId The ID of the clone job
 * @returns {string} Absolute path to the job's output directory
 * @throws {Error} If jobId contains traversal characters or resolves outside base output directory
 */
export const getJobOutputDir = (jobId) => {
  if (!jobId || typeof jobId !== 'string') {
    throw new Error('Invalid Job ID')
  }

  // Reject traversal characters
  if (jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
    throw new Error('Directory traversal detected in Job ID')
  }

  const resolvedPath = path.resolve(BASE_OUTPUT_DIR, jobId)

  // Ensure it remains inside the base output directory
  if (!resolvedPath.startsWith(BASE_OUTPUT_DIR)) {
    throw new Error('Directory traversal resolved path outside output directory')
  }

  return resolvedPath
}

/**
 * Resolves path to the base output directory.
 * @returns {string} Absolute path to base output directory
 */
export const getBaseOutputDir = () => {
  return BASE_OUTPUT_DIR
}
