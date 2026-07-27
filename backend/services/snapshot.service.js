import path from 'path'
import * as cheerio from 'cheerio'
import { getJobOutputDir } from '../utils/path.util.js'
import { ensureDirectoryExists, writeTextFile, writeJsonFile, writeBufferFile } from '../utils/file.util.js'
import { capturePage } from './browser.service.js'
import { discoverAssets } from './asset-discovery.service.js'
import { downloadAssetsForJob } from './asset-downloader.service.js'
import { rewriteHtmlForJob, urlToFilename } from './rewrite-html.service.js'
import { rewriteCssForJob } from './rewrite-css.service.js'
import { detectPageLibraries } from './animation-detector.service.js'
import { runVisualCompareForJob } from './visual-compare.service.js'
import { refineHtmlWithAI } from './prompt-generator.service.js'
import { limitsConfig } from '../config/limits.config.js'
import { logger } from '../utils/logger.util.js'

const getInternalLinks = (html, baseUrl) => {
  const $ = cheerio.load(html)
  const links = []
  try {
    const origin = new URL(baseUrl).origin
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        try {
          const resolved = new URL(href, baseUrl)
          if (resolved.origin === origin && !resolved.hash && !resolved.pathname.startsWith('javascript:')) {
            const cleanUrl = resolved.origin + resolved.pathname
            if (!links.includes(cleanUrl)) {
              links.push(cleanUrl)
            }
          }
        } catch (e) {}
      }
    })
  } catch (e) {}
  return links
}

/**
 * Creates a website snapshot: runs browser capture, scans assets,
 * downloads discovered asset files, and writes index.html, screenshot,
 * manifest.json, and metadata.json.
 * 
 * @param {object} params
 * @param {string} params.url - The target URL (already validated/normalized)
 * @param {string} params.jobId - The unique Job ID
 * @returns {Promise<object>} The snapshot metadata
 */
export const createSnapshot = async ({ url, jobId, options = {}, onProgress }) => {
  const createdAt = new Date().toISOString()
  const startTime = Date.now()
  
  // Resolve output directory securely
  const outputDir = getJobOutputDir(jobId)
  
  try {
    // Ensure output directory exists
    await ensureDirectoryExists(outputDir)
    logger.info(`Output directory prepared at: ${outputDir}`)
    if (onProgress) await onProgress(5, 'Starting snapshot', 'Initializing rebuild directories and configurations.')
    
    // Perform browser capture
    if (onProgress) await onProgress(10, 'Launching browser', 'Headless browser launched safely.')
    if (onProgress) await onProgress(15, 'Opening page', 'Navigating to target URL and waiting for network idle.')
    
    const basePage = await capturePage(url, {
      onProgress,
      enableAutoScroll: options.scrollPage,
      autoScrollStepPx: options.autoScrollStepPx,
      autoScrollDelayMs: options.autoScrollDelayMs,
      rebuildCooldownMs: options.rebuildCooldownMs
    })

    const pages = [{ url, ...basePage }]
    const crawledUrlsMap = new Map()
    crawledUrlsMap.set(url, urlToFilename(url, url))

    if (options.crawlPages === true) {
      const visited = new Set([url])
      const queue = getInternalLinks(basePage.html, url)
      const maxPages = options.maxPages || limitsConfig.MAX_CRAWLED_PAGES || 6
      
      while (queue.length > 0 && pages.length < maxPages) {
        const nextUrl = queue.shift()
        if (visited.has(nextUrl)) continue
        visited.add(nextUrl)
        
        try {
          logger.info(`Crawling internal page: ${nextUrl} (${pages.length + 1}/${maxPages})`)
          if (onProgress) {
            await onProgress(
              15 + Math.floor((pages.length / maxPages) * 12),
              'Crawling pages',
              `Navigating to internal link: ${new URL(nextUrl).pathname}`
            )
          }
          const pageResult = await capturePage(nextUrl, {
            enableAutoScroll: options.scrollPage,
            autoScrollStepPx: options.autoScrollStepPx,
            autoScrollDelayMs: options.autoScrollDelayMs,
            rebuildCooldownMs: options.rebuildCooldownMs
          })
          pages.push({ url: nextUrl, ...pageResult })
          crawledUrlsMap.set(nextUrl, urlToFilename(nextUrl, url))
          
          const newLinks = getInternalLinks(pageResult.html, nextUrl)
          for (const link of newLinks) {
            if (!visited.has(link) && !queue.includes(link)) {
              queue.push(link)
            }
          }
        } catch (err) {
          logger.error(`Failed to crawl page ${nextUrl}: ${err.message}`)
        }
      }
    }

    const { title, html, screenshotBuffer, captureInfo, networkResources, runtimeIntelligence, autoScroll } = basePage

    if (onProgress) await onProgress(28, 'Capturing rendered DOM', 'Static DOM structure successfully captured.')
    if (onProgress) await onProgress(32, 'Capturing screenshot', 'Screenshot and viewport render captured.')
    
    // Perform asset discovery scanning
    logger.info(`Executing asset discovery scan for job ${jobId}`)
    if (onProgress) await onProgress(40, 'Discovering assets', 'Scanning page references for scripts, styles, images, and fonts.')
    
    const combinedHtml = pages.map(p => p.html).join('\n')
    const combinedNetworkResources = [].concat(...pages.map(p => p.networkResources || []))
    const manifest = await discoverAssets({ html: combinedHtml, networkResources: combinedNetworkResources, baseUrl: url, jobId })
    
    // Download discovered asset files locally
    logger.info(`Executing asset downloader pipeline for job ${jobId}`)
    if (onProgress) await onProgress(55, 'Downloading assets', 'Downloading discovered assets to local project bundle.')
    const updatedManifest = await downloadAssetsForJob({
      jobId,
      manifest,
      outputDir,
      limits: limitsConfig
    })

    // Rewrite HTML asset references for each page
    logger.info(`Executing HTML path rewrite pipeline for job ${jobId}`)
    if (onProgress) await onProgress(65, 'Rewriting HTML paths', 'Translating HTML references to map to local folder locations.')
    
    let finalManifest = updatedManifest
    let htmlRewriteSummary = { html: { status: 'completed', rewrittenCount: 0, skippedCount: 0 } }
    let mainRewrittenHtml = ''

    for (const page of pages) {
      const { rewrittenHtml, updatedManifest: pageRewrittenManifest, rewriteSummary } = await rewriteHtmlForJob({
        jobId,
        html: page.html,
        manifest: finalManifest,
        pageUrl: page.url,
        baseUrl: url,
        crawledUrlsMap
      })
      finalManifest = pageRewrittenManifest
      
      let finalHtml = rewrittenHtml
      if (options.aiRefine !== false) {
        logger.info(`Starting AI HTML layout refinement for page: ${page.url}`)
        if (onProgress) {
          await onProgress(
            68,
            'Refining HTML layout',
            `AI layout correction executing for: ${new URL(page.url).pathname}`
          )
        }
        finalHtml = await refineHtmlWithAI(rewrittenHtml, page.url, basePage.domAudit)
      }
      
      const localFilename = urlToFilename(page.url, url)
      const localPath = path.join(outputDir, localFilename)
      await writeTextFile(localPath, finalHtml)
      logger.info(`Written rewritten HTML for page ${page.url} at ${localPath}`)
      
      if (page.url === url) {
        mainRewrittenHtml = finalHtml
        htmlRewriteSummary = rewriteSummary
      }
    }

    const rewrittenHtml = mainRewrittenHtml

    // Rewrite CSS asset references
    logger.info(`Executing CSS URL rewrite pipeline for job ${jobId}`)
    if (onProgress) await onProgress(72, 'Rewriting CSS URLs', 'Parsing and replacing asset URLs inside CSS files.')
    const { updatedManifest: finalCssManifest, cssSummary } = await rewriteCssForJob({
      jobId,
      manifest: finalManifest,
      outputDir,
      pageUrl: url
    })
    finalManifest = finalCssManifest

    // Refine animation & library detection with downloaded assets manifest
    logger.info(`Finalizing library and animation detection for job ${jobId}`)
    if (onProgress) await onProgress(80, 'Detecting libraries', 'Analyzing page metadata for runtime frameworks.')
    const intelligence = await detectPageLibraries({
      html,
      manifest: finalManifest,
      networkResources: combinedNetworkResources,
      intelligence: runtimeIntelligence
    })

    // Define relative output file names
    const files = {
      html: 'index.html',
      originalHtml: 'index.original.html',
      screenshot: 'screenshot.png',
      metadata: 'metadata.json',
      manifest: 'manifest.json'
    }
    
    // Write index.html first so preview can load it
    const htmlPath = path.join(outputDir, files.html)
    await writeTextFile(htmlPath, rewrittenHtml)
    logger.info(`HTML file written at: ${htmlPath}`)
    
    // Write screenshot.png if available
    if (screenshotBuffer) {
      const screenshotPath = path.join(outputDir, files.screenshot)
      await writeBufferFile(screenshotPath, screenshotBuffer)
      logger.info(`Screenshot file written at: ${screenshotPath}`)
    } else {
      logger.warn(`No screenshot buffer captured; screenshot.png will not be written.`)
    }
    
    // Run visual comparison
    logger.info(`Executing visual comparison pipeline for job ${jobId}`)
    if (onProgress) await onProgress(90, 'Running visual compare', 'Comparing local preview layout against original.')
    let visualCompare = null
    try {
      visualCompare = await runVisualCompareForJob({
        jobId,
        outputDir,
        originalScreenshotPath: path.join(outputDir, files.screenshot)
      })
    } catch (vcErr) {
      logger.error(`Visual compare pipeline failed for job ${jobId}: ${vcErr.message}`)
      visualCompare = {
        status: 'failed',
        error: {
          message: vcErr.message || 'Visual comparison failed.',
          code: 'VISUAL_COMPARE_FAILED'
        }
      }
    }

    if (visualCompare && visualCompare.status === 'completed') {
      files.previewScreenshot = 'preview-screenshot.png'
      files.visualDiff = 'visual-diff.png'
    }

    // Build final manifest.json with intelligence and visual compare summary
    const manifestWithIntel = {
      ...finalManifest,
      capture: {
        autoScroll: autoScroll ? {
          enabled: autoScroll.enabled || false,
          status: autoScroll.status
        } : {
          enabled: false
        }
      },
      intelligence: {
        libraries: intelligence.libraries,
        summary: intelligence.summary
      },
      visualCompare: visualCompare ? {
        status: visualCompare.status,
        score: visualCompare.score
      } : undefined
    }

    // Write manifest.json
    const manifestPath = path.join(outputDir, files.manifest)
    if (onProgress) await onProgress(96, 'Writing metadata', 'Finalizing metadata catalog and manifest files.')
    await writeJsonFile(manifestPath, manifestWithIntel)
    logger.info(`Updated manifest catalog written at: ${manifestPath}`)
    
    const finishedAt = new Date().toISOString()
    const durationMs = Date.now() - startTime

    // Construct metadata object with downloader metrics, intelligence summary, and visual compare results
    const metadata = {
      jobId,
      url,
      title,
      status: 'done',
      phase: 'visual-compare',
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
      manifest: files.manifest,
      assetSummary: {
        total: finalManifest.summary.total || 0,
        downloaded: finalManifest.summary.downloaded || 0,
        failed: finalManifest.summary.failed || 0,
        skipped: finalManifest.summary.skipped || 0,
        totalSizeBytes: finalManifest.summary.totalSizeBytes || 0,
        stylesheet: finalManifest.summary.stylesheet || 0,
        script: finalManifest.summary.script || 0,
        image: finalManifest.summary.image || 0,
        font: finalManifest.summary.font || 0,
        media: finalManifest.summary.media || 0,
        other: (finalManifest.summary.other || 0) + 
               (finalManifest.summary.html || 0) + 
               (finalManifest.summary.iframe || 0) + 
               (finalManifest.summary.document || 0) + 
               (finalManifest.summary.data || 0)
      },
      rewrite: {
        html: {
          status: htmlRewriteSummary.html.status,
          rewrittenCount: htmlRewriteSummary.html.rewrittenCount,
          skippedCount: htmlRewriteSummary.html.skippedCount
        },
        css: {
          status: cssSummary.status,
          filesProcessed: cssSummary.filesProcessed,
          rewrittenCount: cssSummary.rewrittenCount,
          skippedCount: cssSummary.skippedCount
        }
      },
      intelligence: {
        summary: intelligence.summary,
        detectedNames: intelligence.detectedNames,
        libraries: intelligence.libraries
      },
      visualCompare,
      assetsDir: 'assets'
    }
    
    // Write metadata.json
    const metadataPath = path.join(outputDir, files.metadata)
    await writeJsonFile(metadataPath, metadata)
    logger.info(`Metadata file written at: ${metadataPath}`)
    
    if (onProgress) await onProgress(100, 'Completed', 'Rebuilt package is offline-ready and archived.')
    return metadata
  } catch (error) {
    logger.error(`Snapshot creation failed for job ${jobId}: ${error.message}`)
    throw error
  }
}
