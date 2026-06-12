import * as cheerio from 'cheerio'
import path from 'path'
import { fileExists, writeTextFile } from '../utils/file.util.js'
import { getJobOutputDir } from '../utils/path.util.js'
import { logger } from '../utils/logger.util.js'

// Simple helper to resolve relative/absolute/protocol-relative URLs against base page URL
const resolveUrl = (relativeUrl, baseUrl) => {
  if (!relativeUrl) return null
  try {
    return new URL(relativeUrl.trim(), baseUrl).toString()
  } catch (err) {
    return null
  }
}

/**
 * Parses page HTML and rewrites asset URLs to local downloaded assets paths.
 * Also preserves a copy of the original index.html as index.original.html.
 * 
 * @param {object} params
 * @param {string} params.jobId - The job ID
 * @param {string} params.html - Raw original captured HTML content
 * @param {object} params.manifest - The downloaded manifest object
 * @param {string} params.pageUrl - Original base page URL
 * @returns {Promise<object>} Rewritten HTML and updated manifest metadata
 */
export const rewriteHtmlForJob = async ({ jobId, html, manifest, pageUrl }) => {
  logger.info(`Starting HTML path rewrite pipeline for job: ${jobId}`)

  const outputDir = getJobOutputDir(jobId)
  const originalHtmlPath = path.join(outputDir, 'index.original.html')

  // 1. Preserve the original captured HTML once
  let createdOriginalBackup = false
  if (!(await fileExists(originalHtmlPath))) {
    await writeTextFile(originalHtmlPath, html)
    createdOriginalBackup = true
    logger.info(`Saved original captured HTML backup at: ${originalHtmlPath}`)
  } else {
    logger.info(`Original captured HTML backup already exists at: ${originalHtmlPath}`)
  }

  // 2. Build look-up map for assets
  const assetMap = new Map()
  for (const asset of manifest.assets) {
    assetMap.set(asset.originalUrl, asset)
  }

  // Helper function to rewrite srcset attributes
  const rewriteSrcset = (srcsetVal, pageUrl, assetMap) => {
    if (!srcsetVal) return srcsetVal
    const parts = srcsetVal.split(',')
    const rewrittenParts = parts.map(part => {
      const trimmed = part.trim()
      if (!trimmed) return part
      const tokens = trimmed.split(/\s+/)
      if (tokens.length === 0) return part
      const urlToken = tokens[0]
      const absoluteUrl = resolveUrl(urlToken, pageUrl)
      if (absoluteUrl) {
        const asset = assetMap.get(absoluteUrl)
        if (asset && asset.status === 'downloaded' && asset.localPath) {
          tokens[0] = `./${asset.localPath}`
          asset.rewrittenInHtml = true
        }
      }
      return tokens.join(' ')
    })
    return rewrittenParts.join(', ')
  }

  // Helper function to rewrite inline CSS background/image url() references
  const inlineStyleUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi
  const rewriteInlineStyle = (styleVal, pageUrl, assetMap) => {
    if (!styleVal) return styleVal
    return styleVal.replace(inlineStyleUrlRegex, (match, quote, urlToken) => {
      const absoluteUrl = resolveUrl(urlToken, pageUrl)
      if (absoluteUrl) {
        const asset = assetMap.get(absoluteUrl)
        if (asset && asset.status === 'downloaded' && asset.localPath) {
          asset.rewrittenInHtml = true
          return `url(${quote}./${asset.localPath}${quote})`
        }
      }
      return match
    })
  }

  // 3. Load HTML using cheerio and replace target attributes
  const $ = cheerio.load(html)

  // link[href] (stylesheets, icons, apple-touch-icons, preloads, etc.)
  $('link[href]').each((_, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase()
    const href = $(el).attr('href')
    if (!href) return

    const isTargetRel = rel.includes('stylesheet') || 
                        rel.includes('icon') || 
                        rel.includes('apple-touch-icon') || 
                        rel === 'preload' || 
                        rel === 'modulepreload'

    if (isTargetRel) {
      const absoluteUrl = resolveUrl(href, pageUrl)
      if (absoluteUrl) {
        const asset = assetMap.get(absoluteUrl)
        if (asset && asset.status === 'downloaded' && asset.localPath) {
          $(el).attr('href', `./${asset.localPath}`)
          asset.rewrittenInHtml = true
        }
      }
    }
  })

  // img[src]
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // img[srcset]
  $('img[srcset]').each((_, el) => {
    const rewritten = rewriteSrcset($(el).attr('srcset'), pageUrl, assetMap)
    if (rewritten) {
      $(el).attr('srcset', rewritten)
    }
  })

  // source[src]
  $('source[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // source[srcset]
  $('source[srcset]').each((_, el) => {
    const rewritten = rewriteSrcset($(el).attr('srcset'), pageUrl, assetMap)
    if (rewritten) {
      $(el).attr('srcset', rewritten)
    }
  })

  // video[src]
  $('video[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // audio[src]
  $('audio[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // script[src]
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // iframe[src]
  $('iframe[src]').each((_, el) => {
    const src = $(el).attr('src')
    const absoluteUrl = resolveUrl(src, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('src', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // meta[property="og:image"]
  $('meta[property="og:image"]').each((_, el) => {
    const content = $(el).attr('content')
    const absoluteUrl = resolveUrl(content, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('content', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // meta[name="twitter:image"]
  $('meta[name="twitter:image"]').each((_, el) => {
    const content = $(el).attr('content')
    const absoluteUrl = resolveUrl(content, pageUrl)
    if (absoluteUrl) {
      const asset = assetMap.get(absoluteUrl)
      if (asset && asset.status === 'downloaded' && asset.localPath) {
        $(el).attr('content', `./${asset.localPath}`)
        asset.rewrittenInHtml = true
      }
    }
  })

  // Inline element style attribute urls (e.g. background-image)
  $('[style]').each((_, el) => {
    const style = $(el).attr('style')
    const rewritten = rewriteInlineStyle(style, pageUrl, assetMap)
    if (rewritten) {
      $(el).attr('style', rewritten)
    }
  })

  const rewrittenHtml = $.html()

  // 4. Update manifest assets list and generate statistics
  const updatedAssets = manifest.assets.map(asset => {
    const match = assetMap.get(asset.originalUrl)
    if (match && match.rewrittenInHtml) {
      return {
        ...asset,
        rewrittenInHtml: true
      }
    }
    return asset
  })

  const rewrittenCount = updatedAssets.filter(a => a.rewrittenInHtml).length
  const skippedCount = updatedAssets.filter(a => !a.rewrittenInHtml).length

  const rewriteSummary = {
    html: {
      status: 'completed',
      rewrittenCount,
      skippedCount,
      createdOriginalBackup,
      finishedAt: new Date().toISOString()
    }
  }

  const updatedManifest = {
    ...manifest,
    phase: 'html-path-rewriter',
    assets: updatedAssets,
    rewrite: rewriteSummary
  }

  logger.info(`Completed HTML path rewrite for job ${jobId}. Rewritten: ${rewrittenCount}, Skipped: ${skippedCount}`)

  return {
    rewrittenHtml,
    updatedManifest,
    rewriteSummary
  }
}
