import path from 'path'
import mime from 'mime-types'
import { getPreviewHtml } from '../services/preview.service.js'
import { getJobOutputDir } from '../utils/path.util.js'
import { fileExists, readJsonFile } from '../utils/file.util.js'

/**
 * Controller to handle raw snapshot preview.
 * Serves index.html for offline-package mode or single.html for single-html mode.
 */
export const getPreview = async (req, res, next) => {
  try {
    const { jobId } = req.params
    
    // Check job mode to determine which HTML file to serve
    const outputDir = getJobOutputDir(jobId)
    const jobJsonPath = path.join(outputDir, 'job.json')
    const metadataPath = path.join(outputDir, 'metadata.json')
    
    let mode = 'offline-package'
    
    // Try to read mode from job.json first
    if (await fileExists(jobJsonPath)) {
      try {
        const jobData = await readJsonFile(jobJsonPath)
        mode = jobData.mode || 'offline-package'
      } catch (err) {
        // Fallback to checking metadata.json
      }
    }
    
    // Fallback to metadata.json if job.json doesn't exist
    if (mode === 'offline-package' && await fileExists(metadataPath)) {
      try {
        const metadata = await readJsonFile(metadataPath)
        mode = metadata.mode || 'offline-package'
      } catch (err) {
        // Keep default mode
      }
    }
    
    const html = await getPreviewHtml(jobId, mode)
    
    // Set appropriate content type and basic sandboxed security policies
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Security-Policy', "default-src 'self' http: https: data: 'unsafe-inline' 'unsafe-eval'")
    
    res.status(200).send(html)
  } catch (err) {
    // Forward path resolution/missing file errors to standard error middleware
    next(err)
  }
}

/**
 * Controller to serve local snapshot assets inside the preview iframe.
 * Ensures security checks are run to prevent directory traversal.
 */
export const getPreviewAsset = async (req, res, next) => {
  try {
    const { jobId } = req.params
    const assetSubPath = req.params[0]
    
    if (!assetSubPath) {
      return res.status(404).send('Asset path not provided')
    }

    // Securely resolve the job's output directory
    const outputDir = getJobOutputDir(jobId)
    
    // Resolve absolute path to asset
    const assetPath = path.resolve(outputDir, 'assets', assetSubPath)
    
    // Safety check: ensure resolved path remains under outputDir/assets
    const assetsBaseDir = path.resolve(outputDir, 'assets')
    if (!assetPath.startsWith(assetsBaseDir)) {
      return res.status(403).send('Forbidden: Access denied.')
    }
    
    if (!(await fileExists(assetPath))) {
      return res.status(404).send('Asset not found.')
    }
    
    // Lookup contentType
    const contentType = mime.lookup(assetPath) || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    
    // Serve the file
    res.sendFile(assetPath)
  } catch (err) {
    next(err)
  }
}
