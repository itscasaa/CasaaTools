import path from 'path'
import { fileExists, readTextFile, writeTextFile } from '../utils/file.util.js'
import { getJobOutputDir } from '../utils/path.util.js'
import { logger } from '../utils/logger.util.js'

// Simple helper to resolve a URL relative to a base URL
const resolveUrl = (relativeUrl, baseUrl) => {
  if (!relativeUrl) return null
  try {
    return new URL(relativeUrl.trim(), baseUrl).toString()
  } catch (err) {
    return null
  }
};

/**
 * Scrapes and rewrites url() and @import paths inside downloaded CSS stylesheets.
 * Normalizes references relative to the CSS file's original URL, maps to downloaded assets,
 * and replaces them with relative paths between the CSS file and the target asset on disk.
 * 
 * @param {object} params
 * @param {string} params.jobId - Unique Job ID
 * @param {object} params.manifest - Discovered assets manifest
 * @param {string} params.outputDir - Absolute path to job output directory
 * @param {string} params.pageUrl - Original base page URL
 * @returns {Promise<object>} Updated manifest catalog
 */
export const rewriteCssForJob = async ({ jobId, manifest, outputDir, pageUrl }) => {
  logger.info(`Starting CSS URL rewrite pipeline for job: ${jobId}`)

  // 1. Build a lookup map of all assets by original URL for quick access
  const assetMap = new Map()
  for (const asset of manifest.assets) {
    assetMap.set(asset.originalUrl, asset)
  }

  // Find all stylesheet assets that were successfully downloaded
  const cssAssets = manifest.assets.filter(
    (asset) => asset.type === 'stylesheet' && asset.status === 'downloaded' && asset.localPath
  )

  let totalFilesProcessed = 0
  let totalRewrittenCount = 0
  let totalSkippedCount = 0
  let createdBackups = false

  const cssUrlRegex = /url\(\s*(['"]?)(.*?)\1\s*\)/gi
  const cssImportStringRegex = /@import\s+(['"])(.*?)\1/gi

  for (const cssAsset of cssAssets) {
    const cssFilePath = path.join(outputDir, cssAsset.localPath)
    
    if (!(await fileExists(cssFilePath))) {
      logger.warn(`CSS file not found at ${cssFilePath}, skipping CSS rewrite.`)
      continue
    }

    try {
      const cssContent = await readTextFile(cssFilePath)

      // Create backup file path (e.g. style.css -> style.original.css)
      const ext = path.extname(cssAsset.localPath)
      const baseNoExt = path.basename(cssAsset.localPath, ext)
      const dirName = path.dirname(cssAsset.localPath)
      const backupLocalPath = path.join(dirName, `${baseNoExt}.original${ext}`).replace(/\\/g, '/')
      const backupFilePath = path.join(outputDir, backupLocalPath)

      // 2. Save backup of the CSS file once
      if (!(await fileExists(backupFilePath))) {
        await writeTextFile(backupFilePath, cssContent)
        createdBackups = true
        logger.info(`Saved original CSS backup for ${cssAsset.localPath} to ${backupLocalPath}`)
      }

      let fileRewrittenCount = 0
      let fileSkippedCount = 0

      // Helper logic to process and replace a single URL reference
      const processCssUrl = (urlToken) => {
        const trimmed = urlToken.trim()
        if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:') || trimmed.startsWith('#')) {
          return null // Ignore data URIs, anchors, etc.
        }

        // Normalize URL relative to the CSS file original URL
        const absoluteUrl = resolveUrl(trimmed, cssAsset.originalUrl)
        if (absoluteUrl) {
          const matchedAsset = assetMap.get(absoluteUrl)
          if (matchedAsset && matchedAsset.status === 'downloaded' && matchedAsset.localPath) {
            // Calculate local relative path from CSS file directory to target asset path
            let relativeLocalPath = path.relative(path.dirname(cssAsset.localPath), matchedAsset.localPath)
            // Convert to POSIX format on Windows
            relativeLocalPath = relativeLocalPath.replace(/\\/g, '/')
            
            matchedAsset.rewrittenInCss = true
            fileRewrittenCount++
            return relativeLocalPath
          }
        }
        
        fileSkippedCount++
        return null
      }

      // Rewrite @import "..." references
      let modifiedCss = cssContent.replace(cssImportStringRegex, (match, quote, urlToken) => {
        const replacement = processCssUrl(urlToken)
        if (replacement) {
          return `@import ${quote}${replacement}${quote}`
        }
        return match
      })

      // Rewrite url(...) references
      modifiedCss = modifiedCss.replace(cssUrlRegex, (match, quote, urlToken) => {
        const replacement = processCssUrl(urlToken)
        if (replacement) {
          return `url(${quote}${replacement}${quote})`
        }
        return match
      })

      // Write updated CSS file back to disk
      await writeTextFile(cssFilePath, modifiedCss)
      logger.info(`Rewrote CSS paths for: ${cssAsset.localPath}. Rewritten: ${fileRewrittenCount}, Skipped: ${fileSkippedCount}`)

      // Record metrics on the css asset itself in the manifest
      cssAsset.cssRewrite = {
        processed: true,
        rewrittenCount: fileRewrittenCount,
        skippedCount: fileSkippedCount,
        backupPath: backupLocalPath
      }

      totalFilesProcessed++
      totalRewrittenCount += fileRewrittenCount
      totalSkippedCount += fileSkippedCount

    } catch (cssErr) {
      logger.error(`Error processing CSS file ${cssAsset.localPath}: ${cssErr.message}`)
    }
  }

  // 3. Build overall rewrite summary block for CSS
  const cssSummary = {
    status: 'completed',
    filesProcessed: totalFilesProcessed,
    rewrittenCount: totalRewrittenCount,
    skippedCount: totalSkippedCount,
    createdBackups,
    finishedAt: new Date().toISOString()
  }

  // Map updated assets array with rewrittenInCss status flag
  const updatedAssets = manifest.assets.map(asset => {
    const match = assetMap.get(asset.originalUrl)
    if (match && match.rewrittenInCss) {
      return {
        ...asset,
        rewrittenInCss: true
      }
    }
    return asset
  })

  const updatedManifest = {
    ...manifest,
    phase: 'css-url-rewriter',
    assets: updatedAssets,
    rewrite: {
      ...manifest.rewrite,
      css: cssSummary
    }
  }

  logger.info(`Completed CSS rewrite pipeline. Files processed: ${totalFilesProcessed}. Total Rewritten: ${totalRewrittenCount}`)

  return {
    updatedManifest,
    cssSummary
  }
}
