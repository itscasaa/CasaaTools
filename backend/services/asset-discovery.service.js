import * as cheerio from 'cheerio'
import path from 'path'
import { logger } from '../utils/logger.util.js'

const inlineStyleUrlRegex = /url\(['"]?([^'")]+)['"]?\)/gi

const typeSubDirs = {
  stylesheet: 'css',
  script: 'js',
  image: 'images',
  font: 'fonts',
  media: 'media',
  other: 'other',
  html: 'other',
  iframe: 'other',
  document: 'other',
  data: 'other'
}

/**
 * Classifies an asset type based on its URL, source tag, content-type, or request resourceType.
 */
export const classifyAsset = (urlStr, sourceTag, contentType, resourceType) => {
  // 1. Check content type
  if (contentType) {
    const ct = contentType.toLowerCase()
    if (ct.includes('css')) return 'stylesheet'
    if (ct.includes('javascript') || ct.includes('ecmascript')) return 'script'
    if (ct.includes('image')) return 'image'
    if (ct.includes('font') || ct.includes('woff') || ct.includes('opentype') || ct.includes('truetype')) return 'font'
    if (ct.includes('video') || ct.includes('audio') || ct.includes('ogg')) return 'media'
    if (ct.includes('html')) return 'html'
    if (ct.includes('json') || ct.includes('xml')) return 'data'
  }

  // 2. Check resource type from browser request
  if (resourceType) {
    const rt = resourceType.toLowerCase()
    if (rt === 'stylesheet') return 'stylesheet'
    if (rt === 'script') return 'script'
    if (rt === 'image') return 'image'
    if (rt === 'font') return 'font'
    if (rt === 'media') return 'media'
    if (rt === 'document') return 'document'
    if (rt === 'fetch' || rt === 'xhr') return 'data'
  }

  // 3. Check HTML source tag
  if (sourceTag) {
    const tag = sourceTag.toLowerCase()
    if (tag.startsWith('html:link[stylesheet]')) return 'stylesheet'
    if (tag.startsWith('html:script')) return 'script'
    if (tag.startsWith('html:img') || tag.startsWith('html:source') && tag.includes('srcset') || tag.startsWith('html:meta')) return 'image'
    if (tag.startsWith('html:video') || tag.startsWith('html:audio')) return 'media'
    if (tag.startsWith('html:iframe')) return 'iframe'
  }

  // 4. Check file extension in URL path
  try {
    const urlObj = new URL(urlStr)
    const ext = path.extname(urlObj.pathname).toLowerCase()
    if (ext === '.css') return 'stylesheet'
    if (ext === '.js' || ext === '.mjs') return 'script'
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'].includes(ext)) return 'image'
    if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) return 'font'
    if (['.mp4', '.mp3', '.webm', '.ogg', '.wav', '.mov'].includes(ext)) return 'media'
    if (['.html', '.htm'].includes(ext)) return 'html'
    if (['.json', '.xml'].includes(ext)) return 'data'
  } catch (e) {}

  return 'other'
}

/**
 * Generates a safe and unique filename from a URL.
 */
const getSafeFilename = (urlStr, type, counter) => {
  try {
    const urlObj = new URL(urlStr)
    const pathname = urlObj.pathname
    let basename = path.basename(pathname)
    
    let ext = path.extname(basename)
    let nameWithoutExt = path.basename(basename, ext)

    // Sanitize name and extension to contain only safe characters
    nameWithoutExt = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '')
    ext = ext.replace(/[^a-zA-Z0-9.]/g, '')

    if (!nameWithoutExt) {
      nameWithoutExt = `${type}-${String(counter).padStart(3, '0')}`
    }

    if (!ext) {
      const extMap = {
        stylesheet: '.css',
        script: '.js',
        image: '.png',
        font: '.woff2',
        media: '.mp4',
        html: '.html',
        iframe: '.html',
        document: '.html'
      }
      ext = extMap[type] || ''
    }

    return nameWithoutExt + ext
  } catch (err) {
    return `${type}-${String(counter).padStart(3, '0')}`
  }
}

/**
 * Parses captured HTML to discover relative and absolute asset references.
 */
export const discoverHtmlAssets = (html, baseUrl) => {
  const assets = []
  
  try {
    const $ = cheerio.load(html)
    
    const addUrl = (relativeUrl, source) => {
      if (!relativeUrl) return
      try {
        const absoluteUrl = new URL(relativeUrl, baseUrl).toString()
        // Skip base64 inline assets
        if (absoluteUrl.startsWith('data:')) return
        assets.push({ url: absoluteUrl, source })
      } catch (err) {
        // Ignore invalid URLs
      }
    }

    // 1. img[src]
    $('img[src]').each((_, el) => {
      addUrl($(el).attr('src'), 'html:img[src]')
    })

    // 2. img[srcset] and source[srcset]
    $('[srcset]').each((_, el) => {
      const srcset = $(el).attr('srcset')
      const tag = el.tagName.toLowerCase()
      if (srcset) {
        const parts = srcset.split(',')
        for (const part of parts) {
          const trimmedPart = part.trim()
          if (trimmedPart) {
            const urlPart = trimmedPart.split(/\s+/)[0]
            addUrl(urlPart, `html:${tag}[srcset]`)
          }
        }
      }
    })

    // 3. source[src]
    $('source[src]').each((_, el) => {
      addUrl($(el).attr('src'), 'html:source[src]')
    })

    // 4. video[src], audio[src]
    $('video[src], audio[src]').each((_, el) => {
      const tag = el.tagName.toLowerCase()
      addUrl($(el).attr('src'), `html:${tag}[src]`)
    })

    // 5. link[rel]
    $('link[rel]').each((_, el) => {
      const rel = $(el).attr('rel')?.toLowerCase() || ''
      const href = $(el).attr('href')
      if (href) {
        if (rel.includes('stylesheet')) {
          addUrl(href, 'html:link[stylesheet]')
        } else if (rel.includes('icon')) {
          addUrl(href, `html:link[rel="${rel}"]`)
        } else if (rel.includes('apple-touch-icon')) {
          addUrl(href, 'html:link[apple-touch-icon]')
        }
      }
    })

    // 6. script[src]
    $('script[src]').each((_, el) => {
      addUrl($(el).attr('src'), 'html:script[src]')
    })

    // 7. iframe[src]
    $('iframe[src]').each((_, el) => {
      addUrl($(el).attr('src'), 'html:iframe[src]')
    })

    // 8. Meta social share images
    $('meta[property="og:image"], meta[name="twitter:image"]').each((_, el) => {
      const content = $(el).attr('content')
      const name = $(el).attr('property') || $(el).attr('name')
      if (content) {
        addUrl(content, `html:meta[${name}]`)
      }
    })

    // 9. Inline styles style="..."
    $('[style]').each((_, el) => {
      const style = $(el).attr('style')
      if (style) {
        let match
        while ((match = inlineStyleUrlRegex.exec(style)) !== null) {
          addUrl(match[1], 'html:inline-style[url]')
        }
      }
    })

    // 10. <style> tag contents
    $('style').each((_, el) => {
      const content = $(el).text()
      if (content) {
        let match
        while ((match = inlineStyleUrlRegex.exec(content)) !== null) {
          addUrl(match[1], 'html:style-tag[url]')
        }
      }
    })

  } catch (err) {
    logger.error(`Error parsing HTML with cheerio: ${err.message}`)
  }

  return assets
}

/**
 * Orchestrates parsing HTML, gathering network responses, deduplicating, classifying,
 * and generating the manifest descriptor object.
 */
export const discoverAssets = async ({ html, networkResources = [], baseUrl, jobId }) => {
  const htmlAssets = discoverHtmlAssets(html, baseUrl)
  const allDiscovered = new Map()

  const addAsset = (url, source, details = {}) => {
    try {
      const normalizedUrl = new URL(url).toString()
      
      if (allDiscovered.has(normalizedUrl)) {
        const existing = allDiscovered.get(normalizedUrl)
        if (!existing.sources.includes(source)) {
          existing.sources.push(source)
        }
        if (details.contentType && !existing.contentType) {
          existing.contentType = details.contentType
        }
        if (details.statusCode && !existing.statusCode) {
          existing.statusCode = details.statusCode
        }
      } else {
        allDiscovered.set(normalizedUrl, {
          url: normalizedUrl,
          sources: [source],
          contentType: details.contentType || '',
          statusCode: details.statusCode || null,
          resourceType: details.resourceType || ''
        })
      }
    } catch (e) {
      // Skip invalid URLs
    }
  }

  // Add html discovered assets
  for (const item of htmlAssets) {
    addAsset(item.url, item.source)
  }

  // Add network discovered assets
  for (const item of networkResources) {
    addAsset(item.url, `network:${item.resourceType}`, {
      contentType: item.contentType,
      statusCode: item.statusCode,
      resourceType: item.resourceType
    })
  }

  const assetsList = []
  const summary = {
    total: 0,
    html: 0,
    stylesheet: 0,
    script: 0,
    image: 0,
    font: 0,
    media: 0,
    document: 0,
    iframe: 0,
    data: 0,
    other: 0
  }

  const usedPaths = new Set()
  let assetCounter = 1

  for (const [url, item] of allDiscovered.entries()) {
    const type = classifyAsset(url, item.sources[0], item.contentType, item.resourceType)
    
    // Build clean safeSuggestedPath and resolve duplicates
    const safeName = getSafeFilename(url, type, assetCounter)
    const subDir = typeSubDirs[type] || 'other'
    
    let suggestedLocalPath = `assets/${subDir}/${safeName}`
    let attempt = 1
    while (usedPaths.has(suggestedLocalPath)) {
      const ext = path.extname(safeName)
      const nameNoExt = path.basename(safeName, ext)
      suggestedLocalPath = `assets/${subDir}/${nameNoExt}-${attempt}${ext}`
      attempt++
    }
    usedPaths.add(suggestedLocalPath)

    if (summary[type] !== undefined) {
      summary[type]++
    } else {
      summary.other++
    }
    summary.total++

    assetsList.push({
      id: `asset_${String(assetCounter).padStart(3, '0')}`,
      type,
      originalUrl: url,
      suggestedLocalPath,
      status: 'discovered',
      sources: item.sources,
      contentType: item.contentType || undefined,
      statusCode: item.statusCode || undefined
    })

    assetCounter++
  }

  const manifest = {
    jobId,
    url: baseUrl,
    createdAt: new Date().toISOString(),
    phase: 'asset-discovery',
    summary,
    assets: assetsList
  }

  return manifest
}
