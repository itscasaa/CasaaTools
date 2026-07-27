import path from 'path'
import { getJobOutputDir } from '../utils/path.util.js'
import { ensureDirectoryExists, writeTextFile, writeJsonFile, writeBufferFile } from '../utils/file.util.js'
import { capturePage } from './browser.service.js'
import { detectPageLibraries } from './animation-detector.service.js'
import { logger } from '../utils/logger.util.js'
import { URL } from 'url'
import * as cheerio from 'cheerio'

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
export const createSingleHtmlSnapshot = async ({ url, jobId, options = {}, onProgress }) => {
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
    const { title, html, screenshotBuffer, captureInfo, networkResources, runtimeIntelligence, autoScroll } = await capturePage(url, {
      onProgress,
      enableAutoScroll: options.scrollPage,
      autoScrollStepPx: options.autoScrollStepPx,
      autoScrollDelayMs: options.autoScrollDelayMs,
      rebuildCooldownMs: options.rebuildCooldownMs
    })
    if (onProgress) await onProgress(45, 'Capturing rendered DOM', 'Static DOM structure successfully captured.')
    
    // Convert relative URLs to absolute URLs
    logger.info(`Converting relative URLs to absolute for job ${jobId}`)
    if (onProgress) await onProgress(60, 'Preserving remote assets', 'Converting relative URLs to absolute remote references.')
    let processedHtml = convertRelativeToAbsolute(html, url)
    
    // Inline stylesheets, scripts, and small images to create a fully self-contained HTML file (copying animations/scripts)
    logger.info(`Inlining assets for job ${jobId} to create self-contained HTML`)
    if (onProgress) await onProgress(62, 'Inlining assets', 'Downloading and embedding styles, scripts, and images directly into the HTML.')
    processedHtml = await inlineAssets(processedHtml, url, onProgress)
    
    // Inject client-side resource interceptor & animation fallback scripts into HTML head using Cheerio
    try {
      const $ = cheerio.load(processedHtml)
      
      // Statically clean up Locomotive Scroll and GSAP styling to restore native scroll if needed
      $('html').removeClass('has-scroll-init').removeClass('has-scroll-smooth')
      $('body').removeClass('has-scroll-init').removeClass('has-scroll-smooth')
      
      const htmlStyle = $('html').attr('style') || ''
      if (htmlStyle.includes('overflow: hidden') || htmlStyle.includes('overflow:hidden')) {
        const cleanedStyle = htmlStyle.replace(/overflow\s*:\s*hidden\s*;?/gi, '')
        $('html').attr('style', cleanedStyle)
      }
      const bodyStyle = $('body').attr('style') || ''
      if (bodyStyle.includes('overflow: hidden') || bodyStyle.includes('overflow:hidden')) {
        const cleanedStyle = bodyStyle.replace(/overflow\s*:\s*hidden\s*;?/gi, '')
        $('body').attr('style', cleanedStyle)
      }

      $('[data-scroll-container], [class*="scroll-container"], main.main-wrap').each((_, el) => {
        const style = $(el).attr('style') || ''
        if (style.includes('transform') || style.includes('pointer-events')) {
          const cleaned = style
            .replace(/transform\s*:\s*[^;]+;?/gi, '')
            .replace(/pointer-events\s*:\s*[^;]+;?/gi, '')
          $(el).attr('style', cleaned)
        }
      })

      // 1. Statically clean up .span-lines elements to prevent double-execution text corruption
      $('.span-lines').each((_, el) => {
        if ($(el).find('.span-line').length > 0) {
          const cleanText = $(el).text().replace(/\s+/g, ' ').trim()
          $(el).text(cleanText)
        }
      })

      // 2. Statically remove cloned .name-wrap elements to prevent marquee duplication
      $('.big-name').each((_, parent) => {
        const wraps = $(parent).find('.name-wrap')
        if (wraps.length > 1) {
          wraps.slice(1).remove()
        }
      })

      const interceptorScript = `
<!-- CasaaTools Client-Side Resource Interceptor & SPA Router Sandbox -->
<script id="casaatools-resource-interceptor">
(function() {
  var baseUrl = ${JSON.stringify(url)};
  
  // Save original URL info
  window.__casaatools_jobId = ${JSON.stringify(jobId)};
  window.__casaatools_originalUrl = baseUrl;
  
  // Resolve relative URLs to absolute based on base target URL
  function resolveUrl(url) {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    if (url.startsWith('//')) {
      return window.location.protocol + url;
    }
    try {
      return new URL(url, baseUrl).href;
    } catch (e) {
      return url;
    }
  }

  // Rewrite browser URL pathname to match the original page pathname
  // This satisfies client-side SPA routers (Next.js/React Router) so they don't render 404
  try {
    if (window.location.pathname.startsWith('/preview/')) {
      var originalPath = new URL(baseUrl).pathname;
      window.history.replaceState(null, '', originalPath);
    }
  } catch (e) {
    // Ignore error (e.g. on file:// protocol)
  }

  // Intercept document.createElement for dynamic script & link additions
  var originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    var element = originalCreateElement.apply(this, arguments);
    var tag = tagName.toLowerCase();
    
    if (tag === 'script') {
      var srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (srcDescriptor && srcDescriptor.set) {
        var originalSet = srcDescriptor.set;
        Object.defineProperty(element, 'src', {
          set: function(val) {
            originalSet.call(this, resolveUrl(val));
          },
          get: function() {
            return srcDescriptor.get.call(this);
          },
          configurable: true
        });
      }
    } else if (tag === 'link') {
      var hrefDescriptor = Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype, 'href');
      if (hrefDescriptor && hrefDescriptor.set) {
        var originalHrefSet = hrefDescriptor.set;
        Object.defineProperty(element, 'href', {
          set: function(val) {
            originalHrefSet.call(this, resolveUrl(val));
          },
          get: function() {
            return hrefDescriptor.get.call(this);
          },
          configurable: true
        });
      }
    }
    return element;
  };

  // Intercept Fetch API
  if (window.fetch) {
    var originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        input = resolveUrl(input);
      } else if (input && typeof input === 'object' && input.url) {
        try {
          var newUrl = resolveUrl(input.url);
          input = new Request(newUrl, input);
        } catch (e) {}
      }
      return originalFetch.call(this, input, init);
    };
  }

  // Intercept XMLHttpRequest
  if (window.XMLHttpRequest) {
    var originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string') {
        url = resolveUrl(url);
      }
      return originalOpen.apply(this, arguments);
    };
  }
})();
</script>
`;

      const fallbackScript = `
<!-- CasaaTools Entrance Animation Fallback -->
<script id="casaatools-animation-fallback">
(function() {
  function revealContent() {
    // Hide blocking fullscreen loaders and entrance overlays
    var overlays = document.querySelectorAll('div[class*="z-[9999]"], div[class*="z-[10000]"], div.fixed.bg-black, .loading-container, .loading-screen');
    overlays.forEach(function(el) {
      if (el && !el.classList.contains('pointer-events-none')) {
        el.style.transition = 'opacity 0.5s ease-out';
        el.style.opacity = '0';
        setTimeout(function() { el.style.display = 'none'; }, 500);
      }
    });

    // Unlock scrolling if locked by Locomotive Scroll or CSS rules
    var htmlEl = document.documentElement;
    var bodyEl = document.body;
    if (htmlEl.classList.contains('has-scroll-smooth') || htmlEl.classList.contains('has-scroll-init')) {
      htmlEl.classList.remove('has-scroll-smooth', 'has-scroll-init');
    }
    if (bodyEl.classList.contains('has-scroll-smooth') || bodyEl.classList.contains('has-scroll-init')) {
      bodyEl.classList.remove('has-scroll-smooth', 'has-scroll-init');
    }
    
    if (htmlEl.style.overflow === 'hidden') htmlEl.style.overflow = 'auto';
    if (bodyEl.style.overflow === 'hidden') bodyEl.style.overflow = 'auto';
    
    // Reset any transform/pointer-events on scroll containers to restore native scrolling
    var containers = document.querySelectorAll('[data-scroll-container], [class*="scroll-container"], main.main-wrap');
    containers.forEach(function(el) {
      if (el.style.transform && el.style.transform !== 'none') {
        el.style.transform = 'none';
      }
      if (el.style.pointerEvents === 'none') {
        el.style.pointerEvents = 'auto';
      }
    });
    
    // Reveal hidden body sections/elements stuck with opacity:0 from animation systems
    var opacityElements = document.querySelectorAll('body div, body main, body section, body header');
    opacityElements.forEach(function(el) {
      var styleAttr = el.getAttribute('style') || '';
      if (styleAttr.includes('opacity:0') || styleAttr.includes('opacity: 0') || el.style.opacity === '0') {
        el.style.transition = 'opacity 0.8s ease-in, transform 0.8s ease-in';
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
      if (styleAttr.includes('visibility:hidden') || styleAttr.includes('visibility: hidden') || el.style.visibility === 'hidden') {
        el.style.visibility = 'visible';
      }
    });
  }

  // Safety net: wait 3 seconds. If the page loader is still visible OR the main elements are still completely invisible (stuck), trigger the fallback.
  setTimeout(function() {
    var loader = document.querySelector('.loading-container, .loading-screen');
    var isLoaderVisible = false;
    if (loader) {
      var loaderStyle = window.getComputedStyle(loader);
      isLoaderVisible = loaderStyle.display !== 'none' && loaderStyle.opacity !== '0' && loaderStyle.visibility !== 'hidden';
    }
    
    var isContentStuck = false;
    var sections = document.querySelectorAll('body main, body section');
    if (sections.length > 0) {
      var visibleSections = 0;
      sections.forEach(function(s) {
        var sStyle = window.getComputedStyle(s);
        if (sStyle.opacity !== '0' && sStyle.visibility !== 'hidden') {
          visibleSections++;
        }
      });
      if (visibleSections === 0) {
        isContentStuck = true;
      }
    }
    
    if (isLoaderVisible || isContentStuck) {
      console.warn("CasaaTools: Animation or hydration lockup detected. Activating scroll and layout fallback...");
      revealContent();
    }
  }, 3000);
})();
</script>
`;

      $('head').prepend(interceptorScript);
      $('head').append(fallbackScript);
      processedHtml = $.html();
      logger.info(`Successfully injected interceptor and animation fallback scripts into single HTML.`);
    } catch (err) {
      logger.error(`Failed to inject scripts via cheerio in single HTML: ${err.message}`);
    }
    
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
        enabled: false,
        note: 'External scripts, styles, and small images are inlined. Fonts and media are resolved to remote URLs.'
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
  const $ = cheerio.load(html)
  
  const resolveUrlLocal = (url) => {
    if (!url) return url
    return resolveUrl(url, base)
  }

  // 1. Convert [src]
  $('[src]').each((_, el) => {
    const src = $(el).attr('src')
    if (src) {
      $(el).attr('src', resolveUrlLocal(src))
    }
  })

  // 2. Convert [href]
  $('[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      $(el).attr('href', resolveUrlLocal(href))
    }
  })

  // 3. Convert [srcset]
  $('[srcset]').each((_, el) => {
    const srcset = $(el).attr('srcset')
    if (srcset) {
      const absolute = srcset.split(',').map(entry => {
        const parts = entry.trim().split(/\s+/)
        if (parts.length > 0) {
          parts[0] = resolveUrlLocal(parts[0])
        }
        return parts.join(' ')
      }).join(', ')
      $(el).attr('srcset', absolute)
    }
  })

  // 4. Convert all data- attributes that might contain relative paths (for lazy loading)
  $('*').each((_, el) => {
    const attribs = el.attribs || {}
    for (const name of Object.keys(attribs)) {
      if (name.startsWith('data-')) {
        const val = attribs[name]
        if (val && typeof val === 'string' && (val.startsWith('/') || val.startsWith('./') || val.startsWith('../') || val.includes('.') && !val.includes(':') && !val.includes(' ') && val.length < 500)) {
          try {
            $(el).attr(name, resolveUrlLocal(val))
          } catch (e) {}
        }
      }
    }
  })

  return $.html()
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
 * Generates README content for single HTML snapshots with inlined assets.
 * 
 * @returns {string} README content
 */
function generateRemoteAssetsReadme() {
  return `CasaaTools Single HTML Snapshot

This package contains a single, self-contained, rendered HTML file.

Important:
- External CSS stylesheets, Javascript scripts, and small images are fully copied and inlined directly inside the HTML file.
- This snapshot is offline-ready and preserves layout, styling, and animation logic.
- External web fonts and larger media elements (such as audio/video) are still resolved absolutely to their original remote website URLs.

Files included:
- single.html: The fully self-contained HTML page with inlined styles and scripts
- metadata.json: Snapshot metadata and job information
- screenshot.png: Full-page screenshot (if available)
- README_REMOTE_ASSETS.txt: This file
`
}

/**
 * Inlines external stylesheets, scripts, and small images directly into the HTML.
 * Ensures the single HTML file is fully self-contained and offline-ready.
 */
async function inlineAssets(html, baseUrl, onProgress) {
  const base = new URL(baseUrl)
  try {
    const $ = cheerio.load(html)

    // 1. Inline stylesheets
    const stylesheets = $('link[rel="stylesheet"]').toArray()
    logger.info(`Found ${stylesheets.length} stylesheets to inline`)
    for (let i = 0; i < stylesheets.length; i++) {
      const el = stylesheets[i]
      const href = $(el).attr('href')
      if (href) {
        const absoluteUrl = resolveUrl(href, base)
        try {
          if (onProgress) await onProgress(62 + Math.round((i / Math.max(1, stylesheets.length)) * 5), 'Inlining styles', `Embedding stylesheet ${i + 1}/${stylesheets.length}`)
          let cssContent = await downloadAssetContent(absoluteUrl)
          if (cssContent) {
            // Rewrite CSS relative paths to absolute targeting original URL
            cssContent = makeCssUrlsAbsolute(cssContent, absoluteUrl)
            $(el).replaceWith(`<style>${cssContent}</style>`)
          }
        } catch (err) {
          logger.warn(`Failed to inline stylesheet: ${absoluteUrl} - ${err.message}`)
        }
      }
    }

    // 2. Inline scripts
    const scripts = $('script[src]').toArray()
    logger.info(`Found ${scripts.length} scripts to inline`)
    for (let i = 0; i < scripts.length; i++) {
      const el = scripts[i]
      const src = $(el).attr('src')
      if (src) {
        const absoluteUrl = resolveUrl(src, base)
        try {
          if (onProgress) await onProgress(67 + Math.round((i / Math.max(1, scripts.length)) * 5), 'Inlining scripts', `Embedding script ${i + 1}/${scripts.length}`)
          const jsContent = await downloadAssetContent(absoluteUrl)
          if (jsContent) {
            const type = $(el).attr('type') || ''
            const typeAttr = type ? ` type="${type}"` : ''
            const sanitizedJs = sanitizeInlineScript(jsContent)
            $(el).replaceWith(`<script${typeAttr}>${sanitizedJs}</script>`)
          }
        } catch (err) {
          logger.warn(`Failed to inline script: ${absoluteUrl} - ${err.message}`)
        }
      }
    }

    // 3. Inline small images (under 1MB) as base64 data URLs
    const images = $('img[src]').toArray()
    logger.info(`Found ${images.length} images to inline`)
    for (let i = 0; i < images.length; i++) {
      const el = images[i]
      const src = $(el).attr('src')
      if (src && !src.startsWith('data:')) {
        const absoluteUrl = resolveUrl(src, base)
        try {
          if (onProgress && i % 3 === 0) {
            await onProgress(72 + Math.round((i / Math.max(1, images.length)) * 3), 'Inlining images', `Embedding image ${i + 1}/${images.length}`)
          }
          const base64Data = await downloadAssetBase64(absoluteUrl)
          if (base64Data) {
            $(el).attr('src', base64Data)
          }
        } catch (err) {
          // Keep absolute URL as fallback
        }
      }
    }

    return $.html()
  } catch (err) {
    logger.error(`Error during asset inlining: ${err.message}`)
    return html
  }
}

/**
 * Downloads text contents of an asset (CSS/JS) with timeout.
 */
async function downloadAssetContent(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      return await res.text()
    }
  } catch (err) {
    logger.debug(`Failed to download text asset: ${url} - ${err.message}`)
  }
  return null
}

/**
 * Downloads image asset and converts it to base64 Data URL.
 */
async function downloadAssetBase64(url) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const contentType = res.headers.get('content-type') || 'image/png'
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      // Limit base64 inlining to files smaller than 1MB to avoid bloated HTML
      if (buffer.length < 1024 * 1024) {
        return `data:${contentType};base64,${buffer.toString('base64')}`
      }
    }
  } catch (err) {
    logger.debug(`Failed to download image asset: ${url} - ${err.message}`)
  }
  return null
}

/**
 * Rewrites CSS relative path references (like fonts and images) to absolute targeting original URL.
 */
function makeCssUrlsAbsolute(cssText, baseUrl) {
  const base = new URL(baseUrl)
  return cssText.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, urlToken) => {
    const trimmedToken = urlToken.trim()
    if (
      trimmedToken.startsWith('http://') || 
      trimmedToken.startsWith('https://') || 
      trimmedToken.startsWith('data:') || 
      trimmedToken.startsWith('blob:')
    ) {
      return match
    }
    try {
      const absolute = new URL(trimmedToken, base).toString()
      return `url(${quote}${absolute}${quote})`
    } catch (e) {
      return match
    }
  })
}

/**
 * Escapes closing script tags inside inline Javascript content to prevent early closing tags.
 */
function sanitizeInlineScript(jsText) {
  return jsText.replace(/<\/script>/gi, '<\\/script>')
}
