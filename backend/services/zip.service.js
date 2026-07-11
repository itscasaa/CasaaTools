import { ZipArchive } from 'archiver'
import path from 'path'
import { getJobOutputDir } from '../utils/path.util.js'
import { fileExists } from '../utils/file.util.js'
import { logger } from '../utils/logger.util.js'

/**
 * Creates a zip archive stream populated with the job's captured files.
 * Supports full and partial downloads based on available files.
 * Handles both offline-package mode (index.html + assets) and single-html mode (single.html + remote assets).
 * 
 * @param {string} jobId - The unique job ID
 * @param {object} downloadStatus - Download readiness status from checkDownloadReadiness
 * @param {string} mode - Snapshot mode ('offline-package' or 'single-html')
 * @returns {Promise<ZipArchive>} Initialized archiver stream
 */
export const createJobZipStream = async (jobId, downloadStatus, mode = 'offline-package') => {
  // Safe resolution of job output folder (checks for directory traversal)
  const outputDir = getJobOutputDir(jobId)

  // Verify that the job folder actually exists
  if (!(await fileExists(outputDir))) {
    const error = new Error(`Job directory not found for job: ${jobId}`)
    error.statusCode = 404
    error.code = 'JOB_NOT_FOUND'
    throw error
  }

  // Verify core files exist (mode unavailable should be blocked before this)
  if (downloadStatus.mode === 'unavailable') {
    const error = new Error(`Core files missing for job ${jobId}. Cannot create ZIP.`)
    error.statusCode = 409
    error.code = 'SNAPSHOT_UNAVAILABLE'
    throw error
  }

  // Create a ZipArchive instance
  const archive = new ZipArchive({
    zlib: { level: 9 } // Max compression
  })

  // Set up error listener
  archive.on('error', (err) => {
    logger.error(`Archiver error for job ${jobId}: ${err.message}`)
  })

  // Collect files to append based on mode
  const filesToAppend = []

  // Core files: mode-specific HTML file + metadata.json
  const htmlFile = mode === 'single-html' ? 'single.html' : 'index.html'
  const coreFiles = [htmlFile, 'metadata.json']
  
  for (const file of coreFiles) {
    const filePath = path.join(outputDir, file)
    if (await fileExists(filePath)) {
      filesToAppend.push(file)
    }
  }

  // Preferred files (include if available)
  const preferredFiles = ['screenshot.png']
  
  // For offline-package mode, also include manifest and rewrite backups
  if (mode === 'offline-package') {
    preferredFiles.push('manifest.json', 'index.original.html', 'preview-screenshot.png', 'visual-diff.png')
  }
  
  // For single-html mode, include README_REMOTE_ASSETS.txt
  if (mode === 'single-html') {
    preferredFiles.push('README_REMOTE_ASSETS.txt')
  }
  
  for (const file of preferredFiles) {
    const filePath = path.join(outputDir, file)
    if (await fileExists(filePath)) {
      filesToAppend.push(file)
    }
  }

  // Append files using clean relative names
  for (const file of filesToAppend) {
    const filePath = path.join(outputDir, file)
    archive.file(filePath, { name: file })
  }

  // Append assets/ directory recursively if it exists (only for offline-package mode)
  if (mode === 'offline-package') {
    const assetsDir = path.join(outputDir, 'assets')
    if (await fileExists(assetsDir)) {
      archive.directory(assetsDir, 'assets')
    }
  }

  // If partial mode, add README explaining incomplete snapshot
  if (downloadStatus.mode === 'partial') {
    const readmeContent = generateIncompleteSnapshotReadme(downloadStatus.missingFiles, mode)
    archive.append(readmeContent, { name: 'README_INCOMPLETE_SNAPSHOT.txt' })
  }

  return archive
}

/**
 * Generates README content for partial snapshots.
 * 
 * @param {string[]} missingFiles - Array of missing file names
 * @param {string} mode - Snapshot mode ('offline-package' or 'single-html')
 * @returns {string} README content
 */
function generateIncompleteSnapshotReadme(missingFiles, mode = 'offline-package') {
  const modeDescription = mode === 'single-html' 
    ? 'This is a single HTML snapshot with remote asset references.'
    : 'This is an offline package snapshot with downloaded assets.'
  
  return `CasaaTools Partial Snapshot

This snapshot package is incomplete.
${modeDescription}

Missing files:
${missingFiles.map(file => `- ${file}`).join('\n')}

The available HTML, metadata, manifest, and downloaded assets were still included.
The snapshot may still be useful for inspection, debugging, or manual recovery.

Known limitations:
- Original screenshot may be unavailable.
- Visual comparison may be unavailable or incomplete.
- Some dynamic JavaScript behavior may still depend on the original website.
`
}

