import { chromium } from 'playwright'
import { playwrightConfig } from '../config/playwright.config.js'
import { logger } from '../utils/logger.util.js'
import { registerNetworkCapture } from './network-capture.service.js'
import { detectPageLibraries } from './animation-detector.service.js'
import { limitsConfig } from '../config/limits.config.js'

/**
 * Launches browser, opens context/page, waits for load, and captures title, HTML content, and full-page screenshot.
 * 
 * @param {string} url - Target URL
 * @param {object} options - Custom options (launchOptions, contextOptions, timeout)
 * @returns {Promise<{ title: string, html: string, screenshotBuffer: Buffer|null, captureInfo: object, networkResources: Array }>}
 */
export const capturePage = async (url, options = {}) => {
  let browser = null
  let context = null
  let page = null

  try {
    logger.info(`Launching browser to capture: ${url}`)
    
    const launchOpts = {
      ...playwrightConfig.launchOptions,
      ...(options.launchOptions || {})
    }

    browser = await chromium.launch(launchOpts)
    
    const contextOpts = {
      ...playwrightConfig.contextOptions,
      ...(options.contextOptions || {})
    }
    context = await browser.newContext(contextOpts)
    
    page = await context.newPage()
    
    const networkResources = []
    registerNetworkCapture(page, networkResources)
    
    const timeout = options.timeout || playwrightConfig.navigation.timeout
    page.setDefaultTimeout(timeout)
    page.setDefaultNavigationTimeout(timeout)

    const captureInfo = {
      engine: 'playwright',
      browser: 'chromium',
      waitUntil: 'networkidle',
      fullPageScreenshot: true
    }

    try {
      logger.info(`Navigating to target URL: ${url} (timeout: ${timeout}ms)`)
      await page.goto(url, { waitUntil: 'networkidle', timeout })
    } catch (err) {
      const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout') || err.message.includes('Timeout')
      if (isTimeout) {
        logger.warn(`Navigation with networkidle timed out. Trying fallback to domcontentloaded for URL: ${url}`)
        captureInfo.waitUntil = 'domcontentloaded'
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
      } else {
        throw err
      }
    }

    const title = await page.title()
    logger.info(`Page loaded. Captured title: "${title}"`)

    const { onProgress } = options
    let cooldownMs = options.rebuildCooldownMs !== undefined ? options.rebuildCooldownMs : limitsConfig.REBUILD_COOLDOWN_MS
    if (typeof cooldownMs !== 'number' || isNaN(cooldownMs)) {
      cooldownMs = 15000
    }

    if (cooldownMs > 0) {
      logger.info(`Cooldown: Waiting ${cooldownMs}ms for the website assets to render completely...`)
      if (onProgress) {
        await onProgress(18, 'Cooldown delay', `Waiting ${cooldownMs / 1000} seconds for page assets to render completely.`)
      }
      await page.waitForTimeout(cooldownMs)
    }

    // Dynamic auto-scrolling to trigger lazy content
    let autoScroll = null
    const enableScroll = options.enableAutoScroll !== undefined ? options.enableAutoScroll : limitsConfig.ENABLE_AUTO_SCROLL


    if (enableScroll) {
      logger.info(`Triggering lazy auto-scroll for URL: ${url}`)
      if (onProgress) {
        await onProgress(22, 'Triggering lazy-loaded content', 'Triggering lazy-loaded images and observer sections.')
      }
      autoScroll = await autoScrollPage(page, {
        stepPx: options.autoScrollStepPx || limitsConfig.AUTO_SCROLL_STEP_PX,
        delayMs: options.autoScrollDelayMs || limitsConfig.AUTO_SCROLL_DELAY_MS,
        maxDurationMs: options.autoScrollMaxDurationMs || limitsConfig.AUTO_SCROLL_MAX_DURATION_MS,
        backToTop: options.autoScrollBackToTop !== undefined ? options.autoScrollBackToTop : limitsConfig.AUTO_SCROLL_BACK_TO_TOP
      })
      const postWait = options.postScrollWaitMs || limitsConfig.POST_SCROLL_WAIT_MS
      logger.info(`Auto-scroll finished with status: ${autoScroll.status}. Waiting ${postWait}ms post-scroll...`)
      await page.waitForTimeout(postWait)
    }

    const html = await page.content()

    let screenshotBuffer = null
    try {
      logger.info(`Capturing full-page screenshot...`)
      screenshotBuffer = await page.screenshot({ fullPage: true })
      logger.info(`Screenshot captured successfully (size: ${screenshotBuffer.length} bytes)`)
    } catch (screenshotErr) {
      logger.error(`Failed to capture full-page screenshot: ${screenshotErr.message}`)
      // If screenshot fails but HTML succeeds, proceed gracefully.
    }

    // Detect libraries while page is alive in browser
    let runtimeIntelligence = null
    try {
      runtimeIntelligence = await detectPageLibraries({ page, html, networkResources })
    } catch (detectErr) {
      logger.error(`Error in library detection: ${detectErr.message}`)
    }

    // Extract loaded browser fonts, computed typography, unique colors, fixed positions, and animation coordinates
    let domAudit = {
      loadedFonts: [],
      computedTypography: null,
      auditedColors: [],
      fixedElements: [],
      animationElements: []
    }
    
    try {
      logger.info(`Running visual and animation DOM audit inside active browser...`)
      domAudit.loadedFonts = await page.evaluate(() => {
        try {
          const families = Array.from(document.fonts.values()).map(f => f.family)
          return Array.from(new Set(families)).filter(Boolean)
        } catch (e) {
          return []
        }
      })

      domAudit.computedTypography = await page.evaluate(() => {
        const getStyle = (selector) => {
          const el = document.querySelector(selector)
          if (!el) return null
          const computed = window.getComputedStyle(el)
          return {
            fontFamily: computed.fontFamily,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            lineHeight: computed.lineHeight,
            color: computed.color,
            backgroundColor: computed.backgroundColor
          }
        }
        return {
          h1: getStyle('h1'),
          h2: getStyle('h2'),
          h3: getStyle('h3'),
          body: getStyle('body') || getStyle('p') || getStyle('main')
        }
      })

      domAudit.auditedColors = await page.evaluate(() => {
        const colors = new Set()
        const rgbToHex = (rgb) => {
          if (!rgb || rgb.startsWith('rgba(0, 0, 0, 0)')) return null
          const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/)
          if (!match) return null
          const r = parseInt(match[1]).toString(16).padStart(2, '0')
          const g = parseInt(match[2]).toString(16).padStart(2, '0')
          const b = parseInt(match[3]).toString(16).padStart(2, '0')
          return `#${r}${g}${b}`.toUpperCase()
        }

        document.querySelectorAll('body, header, footer, section, div, h1, h2, h3, p, a, button').forEach(el => {
          const style = window.getComputedStyle(el)
          if (style.color) {
            const hex = rgbToHex(style.color)
            if (hex && hex !== '#000000' && hex !== '#FFFFFF') colors.add(hex)
          }
          if (style.backgroundColor) {
            const hex = rgbToHex(style.backgroundColor)
            if (hex && hex !== '#000000' && hex !== '#FFFFFF') colors.add(hex)
          }
        })
        return Array.from(colors).slice(0, 15)
      })

      domAudit.fixedElements = await page.evaluate(() => {
        const fixed = []
        document.querySelectorAll('*').forEach(el => {
          const style = window.getComputedStyle(el)
          const pos = style.position
          if (pos === 'fixed' || pos === 'sticky') {
            const tag = el.tagName.toLowerCase()
            if (tag !== 'script' && tag !== 'style' && (el.className || el.id)) {
              fixed.push({
                tag,
                id: el.id || '',
                className: el.className || '',
                position: pos,
                zIndex: style.zIndex || 'auto',
                top: style.top || 'auto'
              })
            }
          }
        })
        return fixed.slice(0, 10)
      })

      domAudit.animationElements = await page.evaluate(() => {
        const elements = []
        document.querySelectorAll('[data-scroll], [data-scroll-speed], [data-scroll-delay]').forEach(el => {
          elements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: el.className || '',
            type: 'Scroll Animation / Parallax',
            attributes: {
              speed: el.getAttribute('data-scroll-speed') || '',
              delay: el.getAttribute('data-scroll-delay') || '',
              section: el.closest('section')?.id || ''
            },
            text: el.innerText ? el.innerText.trim().slice(0, 40) + '...' : ''
          })
        })

        document.querySelectorAll('[data-aos]').forEach(el => {
          elements.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: el.className || '',
            type: 'AOS (Animate On Scroll)',
            attributes: {
              animation: el.getAttribute('data-aos') || '',
              duration: el.getAttribute('data-aos-duration') || '',
              delay: el.getAttribute('data-aos-delay') || ''
            },
            text: el.innerText ? el.innerText.trim().slice(0, 40) + '...' : ''
          })
        })

        document.querySelectorAll('[class*="transition-"], [class*="duration-"], [class*="ease-"]').forEach(el => {
          const tag = el.tagName.toLowerCase()
          if (tag === 'a' || tag === 'button' || el.classList.contains('card') || el.classList.contains('item')) {
            elements.push({
              tag,
              id: el.id || '',
              className: el.className || '',
              type: 'Interactive CSS Transition',
              text: el.innerText ? el.innerText.trim().slice(0, 40) + '...' : ''
            })
          }
        })

        return elements.slice(0, 40)
      })
    } catch (auditErr) {
      logger.error(`Error performing active visual DOM audit: ${auditErr.message}`)
    }

    return {
      title: title || 'No Title',
      html,
      screenshotBuffer,
      captureInfo,
      networkResources,
      runtimeIntelligence,
      domAudit,
      autoScroll
    }
  } catch (error) {
    logger.error(`Error in browser.service: ${error.message}`)
    throw error
  } finally {
    if (page) {
      try {
        await page.close()
      } catch (err) {
        logger.debug(`Error closing page: ${err.message}`)
      }
    }
    if (context) {
      try {
        await context.close()
      } catch (err) {
        logger.debug(`Error closing context: ${err.message}`)
      }
    }
    if (browser) {
      try {
        await browser.close()
        logger.info(`Browser closed.`)
      } catch (err) {
        logger.error(`Error closing browser: ${err.message}`)
      }
    }
  }
}

/**
 * Gradually scrolls a Playwright page from top to bottom, then optionally scrolls back to the top.
 * Triggers lazy-loaded assets and intersection observer events dynamically.
 * 
 * @param {object} page - Playwright page instance
 * @param {object} options - Scroll settings
 * @returns {Promise<object>} Scroll metrics and status
 */
async function autoScrollPage(page, options = {}) {
  const startTime = Date.now()
  const stepPx = options.stepPx || 600
  const delayMs = options.delayMs || 250
  const maxDurationMs = options.maxDurationMs || 15000
  const backToTop = options.backToTop !== false

  let scrolledDistancePx = 0

  try {
    // 1. Temporarily disable smooth scroll behavior for native scroll
    await page.evaluate(() => {
      const htmlStyle = document.documentElement.style.scrollBehavior
      const bodyStyle = document.body?.style?.scrollBehavior || ''
      document.documentElement.style.scrollBehavior = 'auto'
      if (document.body) {
        document.body.style.scrollBehavior = 'auto'
      }
      window.__originalHtmlScrollBehavior = htmlStyle
      window.__originalBodyScrollBehavior = bodyStyle
    })

    // 2. Loop to scroll down using BOTH wheel events and window.scrollBy
    const start = Date.now()
    let lastScrollY = 0
    let sameCount = 0
    let reachedEnd = false

    while ((Date.now() - start) < maxDurationMs && !reachedEnd) {
      // Get current scroll position and page height
      const metrics = await page.evaluate(() => {
        const scrollContainer = document.querySelector('[data-scroll-container], [class*="scroll-container"], main.main-wrap')
        let customScrollY = 0
        if (scrollContainer) {
          // Check for CSS transform translation values
          const style = window.getComputedStyle(scrollContainer)
          const transform = style.transform || style.webkitTransform
          if (transform && transform !== 'none') {
            const matrix = transform.replace(/[^0-9\-.,]/g, '').split(',')
            if (matrix.length === 6) {
              customScrollY = Math.abs(parseFloat(matrix[5])) // 2D transform matrix
            } else if (matrix.length === 16) {
              customScrollY = Math.abs(parseFloat(matrix[13])) // 3D transform matrix
            }
          }
        }
        
        return {
          scrollY: window.scrollY || document.documentElement.scrollTop,
          customScrollY,
          scrollHeight: Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight),
          innerHeight: window.innerHeight
        }
      })

      // We scroll using window.scrollBy (for native scroll)
      await page.evaluate((step) => window.scrollBy(0, step), stepPx)
      
      // And we scroll using mouse wheel (for Locomotive Scroll, Lenis, etc.)
      await page.mouse.wheel(0, stepPx)

      // Wait for delayMs
      await page.waitForTimeout(delayMs)

      // Read new scroll position
      const newMetrics = await page.evaluate(() => {
        const scrollContainer = document.querySelector('[data-scroll-container], [class*="scroll-container"], main.main-wrap')
        let customScrollY = 0
        if (scrollContainer) {
          const style = window.getComputedStyle(scrollContainer)
          const transform = style.transform || style.webkitTransform
          if (transform && transform !== 'none') {
            const matrix = transform.replace(/[^0-9\-.,]/g, '').split(',')
            if (matrix.length === 6) {
              customScrollY = Math.abs(parseFloat(matrix[5]))
            } else if (matrix.length === 16) {
              customScrollY = Math.abs(parseFloat(matrix[13]))
            }
          }
        }
        return {
          scrollY: window.scrollY || document.documentElement.scrollTop,
          customScrollY,
          scrollHeight: Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight)
        }
      })

      const currentScrollY = Math.max(newMetrics.scrollY, newMetrics.customScrollY)
      const prevScrollY = Math.max(metrics.scrollY, metrics.customScrollY)

      if (currentScrollY === prevScrollY) {
        sameCount++
      } else {
        sameCount = 0
      }

      scrolledDistancePx = currentScrollY

      if (
        metrics.innerHeight + currentScrollY >= metrics.scrollHeight - 20 ||
        sameCount >= 4
      ) {
        reachedEnd = true
      }
    }

    // 3. Scroll back to top
    if (backToTop) {
      // First try calling LocomotiveScroll instance custom scrollTo if available
      await page.evaluate(() => {
        if (window.locomotiveScrollInstance && typeof window.locomotiveScrollInstance.scrollTo === 'function') {
          try {
            window.locomotiveScrollInstance.scrollTo(0, { disableLerp: true, duration: 0 })
          } catch (e) {}
        }
        if (window.lenis && typeof window.lenis.scrollTo === 'function') {
          try {
            window.lenis.scrollTo(0, { immediate: true })
          } catch (e) {}
        }
        // Fallback for native
        window.scrollTo(0, 0)
      })

      // Also simulate wheel events back to top just in case
      await page.mouse.wheel(0, -scrolledDistancePx)
      
      // Wait a settle delay to prevent layout jump artefacts
      await page.waitForTimeout(500)

      // Statically clean up scroll transform values in the active browser page to ensure it's captured in pristine top state
      await page.evaluate(() => {
        const scrollContainer = document.querySelector('[data-scroll-container], [class*="scroll-container"], main.main-wrap')
        if (scrollContainer) {
          scrollContainer.style.transform = 'none'
          scrollContainer.style.webkitTransform = 'none'
        }
        // Restore native scroll behaviors
        if (window.__originalHtmlScrollBehavior !== undefined) {
          document.documentElement.style.scrollBehavior = window.__originalHtmlScrollBehavior
        }
        if (window.__originalBodyScrollBehavior !== undefined) {
          if (document.body) {
            document.body.style.scrollBehavior = window.__originalBodyScrollBehavior
          }
        }
      })
    }

    return {
      enabled: true,
      status: 'completed',
      stepPx,
      durationMs: Date.now() - startTime,
      scrolledDistancePx,
      backToTop
    }
  } catch (err) {
    logger.error(`Auto-scroll execution failed: ${err.message}`)
    return {
      enabled: true,
      status: 'failed',
      error: {
        message: err.message || 'Auto-scroll failed but capture continued.',
        code: 'AUTO_SCROLL_FAILED'
      }
    }
  }
}
