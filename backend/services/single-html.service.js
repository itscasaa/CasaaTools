import path from 'path'
import { getJobOutputDir } from '../utils/path.util.js'
import { ensureDirectoryExists, writeTextFile, writeJsonFile, writeBufferFile } from '../utils/file.util.js'
import { capturePage } from './browser.service.js'
import { detectPageLibraries } from './animation-detector.service.js'
import { logger } from '../utils/logger.util.js'
import { URL } from 'url'

/**
 * Creates a single HTML snapshot with remote assets.
 * Captures rendered DOM, converts relative URLs to absolute, preserves remote asset references.
 * 
 * @param {object} params
 * @param {string} params.url - The target URL (already validated/normalized)
 * @param {string} params.jobId - The unique Job ID
 * @param {function} params.onProgress - Progress callback function
 * @returns {Promise<object>} The snapshot metadata
 */
export const createSingleHtmlSnapshot = async ({ url, jobId, onProgress }) => {
  const createdAt = new Date().toISOString()
  const startTime = Date.now()
  
  // Resolve output directory securely
  const outputDir = getJobOutputDir(jobId)
  
  try {
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir)
    logger.info(`Output directory prepared at: ${outputDir}`)
    if (onProgress) await onProgress(5, 'Starting snapshot', 'Initializing single HTML snapshot.')
    
    // Perform browser capture
    if (onProgress) await onProgress(10, 'Launching browser', 'Headless browser launched safely.')
    if (onProgress) await onProgress(15, 'Opening page', 'Navigating to target URL and waiting for network idle.')
    const { title, html, screenshotBuffer, captureInfo, networkResources, runtimeIntelligence, autoScroll } = await capturePage(url, { onProgress })
    if (onProgress) await onProgress(45, 'Capturing rendered DOM', 'Static DOM structure successfully captured.')
    
    // Convert relative URLs to absolute URLs
    logger.info(`Converting relative URLs to absolute for job ${jobId}`)
    if (onProgress) await onProgress(60, 'Preserving remote assets', 'Converting relative URLs to absolute remote references.')
    const processedHtml = convertRelativeToAbsolute(html, url)
    
    // Detect libraries while page info is available
    logger.info(`Analyzing page metadata for job ${jobId}`)
    if (onProgress) await onProgress(75, 'Detecting libraries', 'Analyzing page metadata for runtime frameworks.')
    const intelligence = await detectPageLibraries({
      html,
      networkResources,
      intelligence: runtimeIntelligence
    })
    
    // Define relative output file names
    const files = {
      html: 'single.html',
      metadata: 'metadata.json',
      screenshot: screenshotBuffer ? 'screenshot.png' : null,
      readme: 'README_REMOTE_ASSETS.txt'
    }
    
    // Write single.html
    const htmlPath = path.join(outputDir, files.html)
    await writeTextFile(htmlPath, processedHtml)
    logger.info(`Single HTML file written at: ${htmlPath}`)
    if (onProgress) await onProgress(85, 'Writing HTML', 'Single HTML file with remote assets saved.')
    
    // Write screenshot.png if available
    if (screenshotBuffer) {
      const screenshotPath = path.join(outputDir, files.screenshot)
      await writeBufferFile(screenshotPath, screenshotBuffer)
      logger.info(`Screenshot file written at: ${screenshotPath}`)
    } else {
      logger.warn(`No screenshot buffer captured; screenshot.png will not be written.`)
      files.screenshot = null
    }
    
    // Write README_REMOTE_ASSETS.txt
    const readmeContent = generateRemoteAssetsReadme()
    const readmePath = path.join(outputDir, files.readme)
    await writeTextFile(readmePath, readmeContent)
    logger.info(`README file written at: ${readmePath}`)
    
    const finishedAt = new Date().toISOString()
    const durationMs = Date.now() - startTime

    // Construct metadata object
    const metadata = {
      jobId,
      url,
      title,
      status: 'done',
      mode: 'single-html',
      phase: 'single-html-remote-assets',
      createdAt,
      finishedAt,
      durationMs,
      files,
      capture: {
        ...captureInfo,
        autoScroll: autoScroll ? {
          enabled: autoScroll.enabled || false,
          status: autoScroll.status,
          stepPx: autoScroll.stepPx,
          durationMs: autoScroll.durationMs,
          scrolledDistancePx: autoScroll.scrolledDistancePx,
          backToTop: autoScroll.backToTop,
          error: autoScroll.error
        } : {
          enabled: false
        }
      },
      remoteAssets: {
        enabled: true,
        note: 'Assets are loaded from the original website URLs.'
      },
      intelligence: {
        summary: intelligence.summary,
        detectedNames: intelligence.detectedNames,
        libraries: intelligence.libraries
      }
    }
    
    // Write metadata.json
    const metadataPath = path.join(outputDir, files.metadata)
    await writeJsonFile(metadataPath, metadata)
    logger.info(`Metadata file written at: ${metadataPath}`)
    if (onProgress) await onProgress(95, 'Writing metadata', 'Metadata catalog finalized.')
    
    if (onProgress) await onProgress(100, 'Completed', 'Single HTML snapshot created successfully.')
    return metadata
  } catch (error) {
    logger.error(`Single HTML snapshot creation failed for job ${jobId}: ${error.message}`)
    throw error
  }
}

/**
 * Converts relative URLs in HTML to absolute URLs based on the page URL.
 * Handles src, href, srcset attributes and preserves already-absolute URLs.
 * 
 * @param {string} html - Raw HTML content
 * @param {string} baseUrl - The page URL to resolve relative URLs against
 * @returns {string} HTML with absolute URLs
 */
function convertRelativeToAbsolute(html, baseUrl) {
  const base = new URL(baseUrl)
  
  // Replace src attributes
  html = html.replace(/\ssrc=["']([^"']+)["']/gi, (match, url) => {
    const absolute = resolveUrl(url, base)
    return ` src="${absolute}"`
  })
  
  // Replace href attributes
  html = html.replace(/\shref=["']([^"']+)["']/gi, (match, url) => {
    // Skip anchor links
    if (url.startsWith('#')) return match
    const absolute = resolveUrl(url, base)
    return ` href="${absolute}"`
  })
  
  // Replace srcset attributes
  html = html.replace(/\ssrcset=["']([^"']+)["']/gi, (match, srcset) => {
    const absolute = srcset.split(',').map(entry => {
      const parts = entry.trim().split(/\s+/)
      if (parts.length > 0) {
        parts[0] = resolveUrl(parts[0], base)
      }
      return parts.join(' ')
    }).join(', ')
    return ` srcset="${absolute}"`
  })
  
  // Replace data attributes that might contain URLs (common in lazy loading)
  html = html.replace(/\sdata-src=["']([^"']+)["']/gi, (match, url) => {
    const absolute = resolveUrl(url, base)
    return ` data-src="${absolute}"`
  })
  
  return html
}

/**
 * Resolves a URL (relative or absolute) against a base URL.
 * 
 * @param {string} url - URL to resolve
 * @param {URL} base - Base URL object
 * @returns {string} Absolute URL
 */
function resolveUrl(url, base) {
  try {
    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      // Handle protocol-relative URLs
      if (url.startsWith('//')) {
        return `${base.protocol}${url}`
      }
      return url
    }
    
    // Handle data: and blob: URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url
    }
    
    // Resolve relative URL
    const resolved = new URL(url, base)
    return resolved.href
  } catch (err) {
    // If URL resolution fails, return original
    return url
  }
}

/**
 * Generates README content for single HTML snapshots with remote assets.
 * 
 * @returns {string} README content
 */
function generateRemoteAssetsReadme() {
  return `PageMirror Single HTML Snapshot

This package contains a single rendered HTML file.

Important:
- Assets such as images, CSS, JavaScript, fonts, and media are still loaded from the original website URLs.
- This snapshot is not fully offline-ready.
- If the original website changes or removes assets, this HTML file may change visually or stop loading some resources.
- This mode is useful for quick visual snapshots and animation-heavy pages.

Files included:
- single.html: The captured page with remote asset references
- metadata.json: Snapshot metadata and job information
- screenshot.png: Full-page screenshot (if available)
- README_REMOTE_ASSETS.txt: This file
`
}
