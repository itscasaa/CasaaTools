import path from 'path'
import pLimit from 'p-limit'
import { isUnsafeUrl } from '../utils/security.util.js'
import { writeBufferFile } from '../utils/file.util.js'
import { logger } from '../utils/logger.util.js'

/**
 * Downloads eligible assets parsed from the manifest.
 * Enforces size limits, request timeouts, SSRF blocks, and concurrency.
 * 
 * @param {object} params
 * @param {string} params.jobId - Unique Job ID
 * @param {object} params.manifest - Discovered assets manifest
 * @param {string} params.outputDir - Absolute path to job output directory
 * @param {object} params.limits - Limits configurations
 * @returns {Promise<object>} Updated manifest catalog
 */
export const downloadAssetsForJob = async ({ jobId, manifest, outputDir, limits }) => {
  logger.info(`Starting asset downloader pipeline for job: ${jobId}`)
  
  const maxAssetSize = (limits.MAX_ASSET_SIZE_MB || 10) * 1024 * 1024
  const maxTotalAssets = limits.MAX_TOTAL_ASSETS || 150
  const maxOutputSize = (limits.MAX_TOTAL_OUTPUT_SIZE_MB || 100) * 1024 * 1024
  const downloadTimeout = limits.ASSET_DOWNLOAD_TIMEOUT_MS || 15000
  const concurrency = limits.MAX_CONCURRENT_DOWNLOADS || 5

  let currentTotalOutputSizeBytes = 0
  let downloadedCount = 0
  
  const limit = pLimit(concurrency)
  
  const eligibleTypes = ['stylesheet', 'script', 'image', 'font', 'media', 'other']
  
  const updatedAssets = []
  const downloadQueue = []
  
  let eligibleDiscoveredCount = 0

  for (const asset of manifest.assets) {
    const isEligibleType = eligibleTypes.includes(asset.type)
    
    let isProtocolSafe = false
    try {
      const parsedUrl = new URL(asset.originalUrl)
      isProtocolSafe = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch (e) {}

    if (!isEligibleType) {
      updatedAssets.push({
        ...asset,
        status: 'skipped',
        error: {
          message: 'Asset type is not eligible for download',
          code: 'ASSET_SKIPPED'
        }
      })
    } else if (!isProtocolSafe) {
      updatedAssets.push({
        ...asset,
        status: 'skipped',
        error: {
          message: 'Asset URL protocol is unsafe or unsupported',
          code: 'ASSET_SKIPPED'
        }
      })
    } else {
      eligibleDiscoveredCount++
      if (eligibleDiscoveredCount > maxTotalAssets) {
        updatedAssets.push({
          ...asset,
          status: 'skipped',
          error: {
            message: `Max total assets limit of ${maxTotalAssets} reached`,
            code: 'MAX_TOTAL_ASSETS_LIMIT_EXCEEDED'
          }
        })
      } else {
        // Keep a reference for mutation during download
        const assetRef = { ...asset }
        updatedAssets.push(assetRef)
        downloadQueue.push(assetRef)
      }
    }
  }

  // Worker task to download single asset
  const downloadWorker = async (asset) => {
    try {
      const parsedUrl = new URL(asset.originalUrl)
      
      if (isUnsafeUrl(parsedUrl)) {
        asset.status = 'failed'
        asset.error = {
          message: 'Asset URL is blocked (SSRF safety check failed)',
          code: 'UNSAFE_URL'
        }
        return
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), downloadTimeout)

      let response
      try {
        response = await fetch(asset.originalUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          }
        })
      } catch (fetchErr) {
        asset.status = 'failed'
        asset.error = {
          message: fetchErr.name === 'AbortError' ? 'Asset request timed out' : fetchErr.message,
          code: 'ASSET_DOWNLOAD_FAILED'
        }
        return
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        asset.status = 'failed'
        asset.error = {
          message: `Server responded with status code ${response.status}`,
          code: 'ASSET_DOWNLOAD_FAILED'
        }
        return
      }

      const contentLength = response.headers.get('content-length')
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (!isNaN(size) && size > maxAssetSize) {
          asset.status = 'failed'
          asset.error = {
            message: `Asset size (${contentLength} bytes) exceeds limit of ${limits.MAX_ASSET_SIZE_MB}MB`,
            code: 'ASSET_SIZE_LIMIT_EXCEEDED'
          }
          return
        }
      }

      let buffer
      try {
        const arrayBuffer = await response.arrayBuffer()
        buffer = Buffer.from(arrayBuffer)
      } catch (bufErr) {
        asset.status = 'failed'
        asset.error = {
          message: `Failed to read download stream: ${bufErr.message}`,
          code: 'ASSET_DOWNLOAD_FAILED'
        }
        return
      }

      if (buffer.length > maxAssetSize) {
        asset.status = 'failed'
        asset.error = {
          message: `Asset content size (${buffer.length} bytes) exceeds limit of ${limits.MAX_ASSET_SIZE_MB}MB`,
          code: 'ASSET_SIZE_LIMIT_EXCEEDED'
        }
        return
      }

      if (currentTotalOutputSizeBytes + buffer.length > maxOutputSize) {
        asset.status = 'failed'
        asset.error = {
          message: `Asset exceeds the remaining output size limit of ${limits.MAX_TOTAL_OUTPUT_SIZE_MB}MB`,
          code: 'TOTAL_OUTPUT_SIZE_LIMIT_EXCEEDED'
        }
        return
      }

      // Write block file
      const absolutePath = path.join(outputDir, asset.suggestedLocalPath)
      await writeBufferFile(absolutePath, buffer)

      currentTotalOutputSizeBytes += buffer.length
      downloadedCount++

      asset.status = 'downloaded'
      asset.localPath = asset.suggestedLocalPath
      asset.fileName = path.basename(asset.suggestedLocalPath)
      asset.sizeBytes = buffer.length
      asset.downloadedAt = new Date().toISOString()

    } catch (workerErr) {
      logger.error(`Error downloading asset ${asset.originalUrl}: ${workerErr.message}`)
      asset.status = 'failed'
      asset.error = {
        message: workerErr.message || 'Unexpected downloader error',
        code: 'ASSET_DOWNLOAD_FAILED'
      }
    }
  }

  // Execute concurrency-limited promises
  const downloadPromises = downloadQueue.map((asset) => {
    return limit(() => downloadWorker(asset))
  })

  await Promise.all(downloadPromises)

  const summary = {
    ...manifest.summary,
    downloaded: downloadedCount,
    failed: updatedAssets.filter(a => a.status === 'failed').length,
    skipped: updatedAssets.filter(a => a.status === 'skipped').length,
    totalSizeBytes: currentTotalOutputSizeBytes
  }

  const updatedManifest = {
    ...manifest,
    phase: 'asset-downloader',
    summary,
    assets: updatedAssets
  }

  return updatedManifest
}
