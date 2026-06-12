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

    // Dynamic auto-scrolling to trigger lazy content
    let autoScroll = null
    const enableScroll = options.enableAutoScroll !== undefined ? options.enableAutoScroll : limitsConfig.ENABLE_AUTO_SCROLL
    const { onProgress } = options

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

    return {
      title: title || 'No Title',
      html,
      screenshotBuffer,
      captureInfo,
      networkResources,
      runtimeIntelligence,
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
    // Scroll page inside Playwright context
    await page.evaluate(async ({ stepPx, delayMs, maxDurationMs }) => {
      // Temporarily override smooth scroll to ensure instant, predictable scrolling
      const htmlStyle = document.documentElement.style.scrollBehavior
      const bodyStyle = document.body?.style?.scrollBehavior || ''
      document.documentElement.style.scrollBehavior = 'auto'
      if (document.body) {
        document.body.style.scrollBehavior = 'auto'
      }
      
      await new Promise((resolve) => {
        let lastScrollY = window.scrollY
        let sameCount = 0
        const start = Date.now()
        
        const timer = setInterval(() => {
          window.scrollBy(0, stepPx)
          const currentScrollY = window.scrollY
          const scrollHeight = Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight)
          
          if (currentScrollY === lastScrollY) {
            sameCount++
          } else {
            sameCount = 0
          }
          
          lastScrollY = currentScrollY

          if (
            window.innerHeight + currentScrollY >= scrollHeight - 5 || 
            sameCount >= 3 || 
            (Date.now() - start) >= maxDurationMs
          ) {
            clearInterval(timer)
            // Restore styles
            document.documentElement.style.scrollBehavior = htmlStyle
            if (document.body) {
              document.body.style.scrollBehavior = bodyStyle
            }
            resolve()
          }
        }, delayMs)
      })
    }, { stepPx, delayMs, maxDurationMs })

    // Calculate final scrolled distance before scrolling back to top
    scrolledDistancePx = await page.evaluate(() => window.scrollY)

    if (backToTop) {
      await page.evaluate(() => window.scrollTo(0, 0))
      // Wait a settle delay to prevent layout jump artefacts
      await page.waitForTimeout(200)
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
