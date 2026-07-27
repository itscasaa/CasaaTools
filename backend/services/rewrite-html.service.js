import * as cheerio from 'cheerio'
import path from 'path'
import { fileExists, writeTextFile } from '../utils/file.util.js'
import { getJobOutputDir } from '../utils/path.util.js'
import { logger } from '../utils/logger.util.js'

export const urlToFilename = (urlStr, baseUrl) => {
  try {
    const urlObj = new URL(urlStr)
    const baseObj = new URL(baseUrl)
    if (urlObj.pathname === '/' || urlObj.pathname === baseObj.pathname) {
      return 'index.html'
    }
    let cleanedPath = urlObj.pathname.replace(/\/$/, '').replace(/^\//, '')
    // Replace slashes with hyphens to make it flat
    let filename = cleanedPath.replace(/\//g, '-')
    if (!filename.endsWith('.html')) {
      filename += '.html'
    }
    return filename
  } catch (e) {
    return 'index.html'
  }
}

// Simple helper to resolve relative/absolute/protocol-relative URLs against base page URL
const resolveUrl = (relativeUrl, baseUrl) => {
  if (!relativeUrl) return null
  try {
    return new URL(relativeUrl.trim(), baseUrl).toString()
  } catch (err) {
    return null
  }
}

const normalizeUrl = (urlStr) => {
  if (!urlStr) return ''
  try {
    const urlObj = new URL(urlStr)
    let pathname = urlObj.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    if (pathname.endsWith('.html')) {
      pathname = pathname.slice(0, -5)
    }
    return (urlObj.origin + pathname).toLowerCase()
  } catch (e) {
    let clean = urlStr.toLowerCase()
    if (clean.endsWith('.html')) {
      clean = clean.slice(0, -5)
    }
    return clean
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
export const rewriteHtmlForJob = async ({ jobId, html, manifest, pageUrl, baseUrl, crawledUrlsMap = new Map() }) => {
  logger.info(`Starting HTML path rewrite pipeline for job: ${jobId}`)

  const outputDir = getJobOutputDir(jobId)
  const filename = urlToFilename(pageUrl, baseUrl || pageUrl)
  const basename = filename.replace(/\.html$/, '')
  const originalHtmlPath = path.join(outputDir, `${basename}.original.html`)

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

  // Build normalized lookup maps for internal page crawling
  const normCrawledMap = new Map()
  const localHtmlLookup = {}
  if (crawledUrlsMap) {
    for (const [key, val] of crawledUrlsMap.entries()) {
      const normKey = normalizeUrl(key)
      normCrawledMap.set(normKey, val)
      localHtmlLookup[normKey] = `./${val}`
    }
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

  // a[href] (internal navigation links to other crawled pages)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const absoluteUrl = resolveUrl(href, pageUrl)
    if (absoluteUrl) {
      const normUrl = normalizeUrl(absoluteUrl)
      if (normCrawledMap.has(normUrl)) {
        const localFile = normCrawledMap.get(normUrl)
        let hash = ''
        try {
          const u = new URL(absoluteUrl)
          hash = u.hash || ''
        } catch (e) {}
        $(el).attr('href', `./${localFile}${hash}`)
      }
    }
  })

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

  // Build client-side lookup table for resources dynamically loaded by webpack/next scripts offline
  const localAssetLookup = {}
  for (const asset of manifest.assets) {
    if (asset.status === 'downloaded' && asset.localPath) {
      localAssetLookup[asset.originalUrl] = `./${asset.localPath}`
    }
  }

  const interceptorScript = `
<!-- CasaaTools Client-Side Resource Interceptor & SPA Router Sandbox -->
<script id="casaatools-resource-interceptor">
(function() {
  var baseUrl = ${JSON.stringify(pageUrl)};
  var localAssetLookup = ${JSON.stringify(localAssetLookup)};
  var localHtmlLookup = ${JSON.stringify(localHtmlLookup)};
  
  // Save original URL info
  window.__casaatools_jobId = ${JSON.stringify(jobId)};
  window.__casaatools_originalUrl = baseUrl;
  
  function normalizeUrl(urlStr) {
    if (!urlStr) return '';
    try {
      var urlObj = new URL(urlStr);
      var pathname = urlObj.pathname;
      if (pathname.length > 1 && pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      if (pathname.endsWith('.html')) {
        pathname = pathname.slice(0, -5);
      }
      return (urlObj.origin + pathname).toLowerCase();
    } catch (e) {
      var clean = urlStr.toLowerCase();
      if (clean.endsWith('.html')) {
        clean = clean.slice(0, -5);
      }
      return clean;
    }
  }

  // Intercept history.pushState and history.replaceState to redirect client-side SPA routing (e.g. Barba.js, Next, React Router)
  var originalPushState = window.history.pushState;
  window.history.pushState = function(state, title, url) {
    if (url) {
      var absoluteUrl = resolveUrl(url.toString());
      var normUrl = normalizeUrl(absoluteUrl);
      if (localHtmlLookup[normUrl]) {
        window.location.href = localHtmlLookup[normUrl];
        return;
      }
    }
    return originalPushState.apply(this, arguments);
  };

  var originalReplaceState = window.history.replaceState;
  window.history.replaceState = function(state, title, url) {
    if (url) {
      var absoluteUrl = resolveUrl(url.toString());
      var normUrl = normalizeUrl(absoluteUrl);
      if (localHtmlLookup[normUrl]) {
        window.location.href = localHtmlLookup[normUrl];
        return;
      }
    }
    return originalReplaceState.apply(this, arguments);
  };

  // Resolve relative URLs to absolute based on base target URL or local downloaded paths
  function resolveUrl(url) {
    if (!url) return url;
    if (typeof url !== 'string') return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Resolve to absolute target URL
    var absoluteUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
      try {
        absoluteUrl = new URL(url, baseUrl).href;
      } catch (e) {
        return url;
      }
    } else if (url.startsWith('//')) {
      absoluteUrl = window.location.protocol + url;
    }
    
    // Check if the absolute URL is in our local downloaded assets map
    if (localAssetLookup[absoluteUrl]) {
      return localAssetLookup[absoluteUrl];
    }
    
    // Otherwise fallback to live remote URL
    return absoluteUrl;
  }

  // Intercept clicks on links in the capture phase to bypass any client-side SPA routing (e.g. Barba.js, Next, React Router)
  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentNode;
    }
    if (target && target.tagName === 'A') {
      var href = target.getAttribute('href');
      if (href) {
        var absoluteUrl = resolveUrl(href);
        var normUrl = normalizeUrl(absoluteUrl);
        if (localHtmlLookup[normUrl]) {
          e.preventDefault();
          e.stopPropagation();
          var hash = '';
          try {
            var u = new URL(absoluteUrl);
            hash = u.hash || '';
          } catch (err) {}
          window.location.href = localHtmlLookup[normUrl] + hash;
        }
      }
    }
  }, true);

  // Rewrite browser URL pathname to match the original page pathname
  // This satisfies client-side SPA routers (Next.js/React Router) so they don't render 404
  try {
    if (window.location.pathname.startsWith('/preview/')) {
      var originalPath = new URL(baseUrl).pathname;
      window.history.replaceState(null, '', originalPath);
    }
  } catch (e) {
    // Ignore error
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

  // Inject safety fallback script to bypass blocked entrance animations if JS or hydration fails
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
  $('head').prepend(interceptorScript)
  $('head').append(fallbackScript)

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
