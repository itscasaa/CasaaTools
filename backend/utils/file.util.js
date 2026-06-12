import fs from 'fs-extra'
import path from 'path'

/**
 * Ensures that a directory exists, creating it recursively if needed.
 * @param {string} dirPath - Absolute path of directory
 */
export const ensureDirectoryExists = async (dirPath) => {
  await fs.ensureDir(dirPath)
}

/**
 * Safely writes text content to a file, ensuring the target directory exists.
 * @param {string} filePath - Absolute path to file
 * @param {string} content - Text content to write
 */
export const writeTextFile = async (filePath, content) => {
  await fs.outputFile(filePath, content, 'utf8')
}

/**
 * Safely writes JSON content to a file, ensuring the target directory exists.
 * @param {string} filePath - Absolute path to file
 * @param {object} data - Object to write as JSON
 */
export const writeJsonFile = async (filePath, data) => {
  await fs.outputJson(filePath, data, { spaces: 2 })
}

/**
 * Safely writes a binary buffer to a file, ensuring the target directory exists.
 * @param {string} filePath - Absolute path to file
 * @param {Buffer} buffer - Binary buffer to write
 */
export const writeBufferFile = async (filePath, buffer) => {
  await fs.outputFile(filePath, buffer)
}

/**
 * Safely reads and parses JSON from a file.
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<object>} Parsed JSON object
 */
export const readJsonFile = async (filePath) => {
  return await fs.readJson(filePath)
}

/**
 * Safely reads text content from a file.
 * @param {string} filePath - Absolute path to file
 * @returns {Promise<string>} File text content
 */
export const readTextFile = async (filePath) => {
  return await fs.readFile(filePath, 'utf8')
}

/**
 * Checks if a file or directory exists.
 * @param {string} filePath - Absolute path
 * @returns {Promise<boolean>} True if path exists
 */
export const fileExists = async (filePath) => {
  return await fs.pathExists(filePath)
}

/**
 * Checks the download readiness of a job by verifying core and required files exist.
 * Implements three download modes: full, partial, unavailable.
 * Supports both offline-package mode (index.html) and single-html mode (single.html).
 * 
 * Mode determination:
 * - Full: core files + screenshot.png exist
 * - Partial: core files exist, but screenshot.png missing
 * - Unavailable: core files missing
 * 
 * Optional files (manifest, visual-diff, etc.) do not affect mode.
 * 
 * @param {string} outputDir - Absolute path to job output directory
 * @param {string} snapshotMode - Snapshot mode ('offline-package' or 'single-html')
 * @returns {Promise<object>} Download readiness status with mode and file checks
 */
export const checkDownloadReadiness = async (outputDir, snapshotMode = 'offline-package') => {
  // Core files absolutely required for any download
  // For single-html mode, check for single.html instead of index.html
  const htmlFile = snapshotMode === 'single-html' ? 'single.html' : 'index.html'
  
  const coreFiles = {
    html: htmlFile,
    metadata: 'metadata.json'
  }
  
  // Preferred file that determines full vs partial mode
  const preferredFiles = {
    screenshot: 'screenshot.png'
  }
  
  // Optional files that don't affect download mode
  const optionalFiles = {
    manifest: 'manifest.json',
    originalHtml: 'index.original.html',
    previewScreenshot: 'preview-screenshot.png',
    visualDiff: 'visual-diff.png',
    assets: 'assets'
  }

  // Check core files
  const coreFileStatus = {}
  const missingCoreFiles = []
  
  for (const [key, filename] of Object.entries(coreFiles)) {
    const filePath = path.join(outputDir, filename)
    const exists = await fileExists(filePath)
    coreFileStatus[key] = exists
    
    if (!exists) {
      missingCoreFiles.push(filename)
    }
  }
  
  // Check preferred files (screenshot.png)
  const preferredFileStatus = {}
  const missingPreferredFiles = []
  
  for (const [key, filename] of Object.entries(preferredFiles)) {
    const filePath = path.join(outputDir, filename)
    const exists = await fileExists(filePath)
    preferredFileStatus[key] = exists
    
    if (!exists) {
      missingPreferredFiles.push(filename)
    }
  }
  
  // Check optional files (for informational purposes only)
  const optionalFileStatus = {}
  const missingOptionalFiles = []
  
  for (const [key, filename] of Object.entries(optionalFiles)) {
    const filePath = path.join(outputDir, filename)
    const exists = await fileExists(filePath)
    optionalFileStatus[key] = exists
    
    if (!exists) {
      missingOptionalFiles.push(filename)
    }
  }

  // Determine download mode
  let mode
  let ready
  let warnings = []
  const missingFiles = [...missingCoreFiles, ...missingPreferredFiles]

  if (missingCoreFiles.length > 0) {
    // Missing core files - unavailable
    mode = 'unavailable'
    ready = false
    warnings.push({
      code: 'SNAPSHOT_UNAVAILABLE',
      message: 'This snapshot cannot be downloaded because core output files are missing.'
    })
  } else if (missingPreferredFiles.length > 0) {
    // Core files present, but screenshot.png missing - partial
    mode = 'partial'
    ready = true
    warnings.push({
      code: 'PARTIAL_SNAPSHOT',
      message: 'This snapshot is incomplete, but the available HTML, metadata, and assets can still be downloaded.'
    })
  } else {
    // Core files + screenshot.png present - full
    mode = 'full'
    ready = true
  }

  return {
    ready,
    mode,
    coreFiles: coreFileStatus,
    preferredFiles: preferredFileStatus,
    optionalFiles: optionalFileStatus,
    missingFiles,
    optionalMissingFiles: missingOptionalFiles,
    warnings
  }
}

