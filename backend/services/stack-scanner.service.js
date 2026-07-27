import { chromium } from 'playwright'
import { logger } from '../utils/logger.util.js'

/**
 * Performs a high-fidelity runtime scan of a website's technology stack, animation libraries,
 * and layout quality checks (like overlapping selections/elements and asset audits).
 * Evaluates globals, DOM indicators, response headers, and layout metrics inside Playwright.
 * 
 * @param {string} url - Target website URL
 * @returns {Promise<object>} The detected stack metrics
 */
export const performStackScan = async (url) => {
  logger.info(`Starting comprehensive technology stack & layout scan for URL: ${url}`)
  
  let browser = null
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    })

    const page = await context.newPage()
    
    // Track headers and loading metrics
    let serverHeader = ''
    let poweredByHeader = ''
    let totalAssetsSize = 0
    let assetCount = 0

    page.on('response', (response) => {
      if (response.url() === url || response.url() === url + '/') {
        const headers = response.headers()
        serverHeader = headers['server'] || ''
        poweredByHeader = headers['x-powered-by'] || ''
      }
      
      // Track content length of responses to calculate approximate size
      const headers = response.headers()
      const length = parseInt(headers['content-length'] || '0', 10)
      if (length > 0) {
        totalAssetsSize += length
        assetCount++
      }
    })

    // Navigate and wait for content
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    
    // Give dynamic JS animations time to hydrate/init
    await page.waitForTimeout(3000)

    // Evaluate stack properties & overlapping elements inside window context
    const runtimeAnalysis = await page.evaluate(() => {
      const checkGlobal = (name) => {
        try {
          return typeof window[name] !== 'undefined'
        } catch (e) {
          return false
        }
      }

      const checkFramerMotion = () => {
        try {
          return !!document.querySelector('[data-framer-attribute]') || 
                 !!document.querySelector('.framer-motion') || 
                 checkGlobal('__framer_motion_classes')
        } catch (e) { return false }
      }

      const checkReact = () => {
        try {
          if (document.querySelector('#root, #__next, [data-reactroot]')) return true
          const all = document.all || document.getElementsByTagName('*')
          for (let i = 0; i < all.length; i++) {
            const el = all[i]
            const keys = Object.keys(el)
            if (keys.some(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber'))) {
              return true
            }
          }
          return false
        } catch (e) { return false }
      }

      const checkTailwind = () => {
        try {
          let matches = 0
          const all = document.getElementsByTagName('*')
          for (let i = 0; i < Math.min(all.length, 100); i++) {
            const cl = all[i].className
            if (typeof cl === 'string') {
              const parts = cl.split(' ')
              if (parts.some(p => p.startsWith('bg-') || p.startsWith('text-') || p.startsWith('p-') || p.startsWith('m-') || p.startsWith('rounded-'))) {
                matches++
              }
            }
          }
          return matches > 15
        } catch (e) { return false }
      }

      const getGenerator = () => {
        const meta = document.querySelector('meta[name="generator"]')
        return meta ? meta.getAttribute('content') : ''
      }

      // Concrete layout check: locate elements with overlapping bounding boxes
      const checkOverlaps = () => {
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a, button, img'));
        const visibleElements = []
        
        elements.forEach(el => {
          const rect = el.getBoundingClientRect()
          if (rect.width > 5 && rect.height > 5) {
            const style = window.getComputedStyle(el)
            const isVisible = style.display !== 'none' && style.opacity !== '0' && style.visibility !== 'hidden'
            if (isVisible) {
              visibleElements.push({
                element: el,
                tagName: el.tagName.toLowerCase(),
                text: (el.textContent || '').trim().slice(0, 45),
                rect: {
                  left: rect.left,
                  top: rect.top,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height
                }
              })
            }
          }
        })

        const overlaps = []
        for (let i = 0; i < visibleElements.length; i++) {
          for (let j = i + 1; j < visibleElements.length; j++) {
            const a = visibleElements[i]
            const b = visibleElements[j]
            
            // Skip parent-child containments
            if (a.element.contains(b.element) || b.element.contains(a.element)) {
              continue
            }
            
            const intersectX = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left))
            const intersectY = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top))
            
            if (intersectX > 15 && intersectY > 15) {
              const overlapArea = intersectX * intersectY
              const areaA = a.rect.width * a.rect.height
              const areaB = b.rect.width * b.rect.height
              
              if (overlapArea / areaA > 0.25 || overlapArea / areaB > 0.25) {
                overlaps.push({
                  elementA: {
                    tagName: a.tagName,
                    text: a.text,
                    width: Math.round(a.rect.width),
                    height: Math.round(a.rect.height)
                  },
                  elementB: {
                    tagName: b.tagName,
                    text: b.text,
                    width: Math.round(b.rect.width),
                    height: Math.round(b.rect.height)
                  },
                  intersectWidth: Math.round(intersectX),
                  intersectHeight: Math.round(intersectY),
                  overlapArea: Math.round(overlapArea)
                })
              }
            }
          }
        }
        return overlaps.slice(0, 15) // Top 15 overlaps
      }

      // Page stats analysis
      const getPageStats = () => {
        return {
          totalLinks: document.querySelectorAll('a').length,
          totalButtons: document.querySelectorAll('button').length,
          totalImages: document.querySelectorAll('img').length,
          totalHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length
        }
      }

      return {
        // Animation Libraries
        animations: {
          gsap: checkGlobal('gsap') || checkGlobal('TweenMax'),
          scrollTrigger: checkGlobal('ScrollTrigger') || (checkGlobal('gsap') && typeof window.gsap.utils !== 'undefined' && typeof window.ScrollTrigger !== 'undefined'),
          locomotiveScroll: checkGlobal('LocomotiveScroll') || !!document.querySelector('[data-scroll-container]') || checkGlobal('locomotiveScroll'),
          lenis: checkGlobal('Lenis') || typeof window.Lenis !== 'undefined',
          aos: checkGlobal('AOS') || !!document.querySelector('[data-aos]'),
          threeJs: checkGlobal('THREE'),
          lottie: checkGlobal('lottie') || checkGlobal('bodymovin'),
          animeJs: checkGlobal('anime'),
          framerMotion: checkFramerMotion(),
          swiper: checkGlobal('Swiper') || !!document.querySelector('.swiper'),
          splide: checkGlobal('Splide') || !!document.querySelector('.splide')
        },
        // Frameworks & Utilities
        stack: {
          react: checkReact() || checkGlobal('React'),
          vue: checkGlobal('Vue') || typeof window.__VUE__ !== 'undefined' || !!document.querySelector('[data-v-]'),
          angular: checkGlobal('angular') || typeof window.ng !== 'undefined',
          nextJs: checkGlobal('next') || typeof window.__NEXT_DATA__ !== 'undefined',
          nuxtJs: typeof window.__NUXT__ !== 'undefined',
          gatsby: typeof window.___emulator !== 'undefined' || typeof window.___loader !== 'undefined',
          jquery: checkGlobal('jQuery') || checkGlobal('$'),
          tailwind: checkTailwind(),
          bootstrap: typeof window.bootstrap !== 'undefined' || !!document.querySelector('[class*="col-md-"], [class*="col-sm-"]')
        },
        generator: getGenerator(),
        overlaps: checkOverlaps(),
        stats: getPageStats()
      }
    })

    await browser.close()
    browser = null

    return {
      success: true,
      url,
      server: serverHeader,
      poweredBy: poweredByHeader,
      generator: runtimeAnalysis.generator,
      animations: runtimeAnalysis.animations,
      stack: runtimeAnalysis.stack,
      overlaps: runtimeAnalysis.overlaps,
      stats: {
        ...runtimeAnalysis.stats,
        assetCount,
        totalAssetsSizeKb: Math.round(totalAssetsSize / 1024)
      },
      scannedAt: new Date().toISOString()
    }
  } catch (err) {
    logger.error(`Stack scan failed for ${url}: ${err.message}`)
    if (browser) {
      await browser.close()
    }
    throw err
  }
}
