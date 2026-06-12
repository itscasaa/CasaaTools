import { logger } from '../utils/logger.util.js'

// Known frontend libraries and their categories/keywords
const LIBRARY_DEFS = {
  // Animation
  gsap: { name: 'GSAP', category: 'animation', keyword: 'gsap' },
  scrollTrigger: { name: 'ScrollTrigger', category: 'animation', keyword: 'scrolltrigger' },
  lenis: { name: 'Lenis', category: 'animation', keyword: 'lenis' },
  locomotiveScroll: { name: 'Locomotive Scroll', category: 'animation', keyword: 'locomotive-scroll' },
  aos: { name: 'AOS', category: 'animation', keyword: 'aos' },
  anime: { name: 'Anime.js', category: 'animation', keyword: 'anime' },
  three: { name: 'Three.js', category: 'animation', keyword: 'three' },
  lottie: { name: 'Lottie', category: 'animation', keyword: ['lottie', 'bodymovin'] },
  framerMotion: { name: 'Framer Motion', category: 'animation', keyword: ['framer-motion', 'motion'] },
  
  // Frameworks
  react: { name: 'React', category: 'frameworks', keyword: 'react' },
  vue: { name: 'Vue', category: 'frameworks', keyword: 'vue' },
  angular: { name: 'Angular', category: 'frameworks', keyword: 'angular' },
  next: { name: 'Next.js', category: 'frameworks', keyword: '_next/static' },
  nuxt: { name: 'Nuxt', category: 'frameworks', keyword: ['_nuxt', 'nuxt.js'] },
  
  // UI / interaction
  swiper: { name: 'Swiper', category: 'ui', keyword: 'swiper' },
  splide: { name: 'Splide', category: 'ui', keyword: 'splide' },
  jquery: { name: 'jQuery', category: 'ui', keyword: 'jquery' }
}

/**
 * Detects frontend libraries and animation-related technologies.
 * Runs in two contexts:
 * 1. Runtime check (with page and networkResources) to evaluate window globals and network calls.
 * 2. Downloader check (with manifest) to scan asset paths/URLs and build final confidence summaries.
 * 
 * @param {object} params
 * @param {object} [params.page] - Playwright page instance
 * @param {string} [params.html] - Captured HTML source code
 * @param {object} [params.manifest] - Saved snapshot manifest
 * @param {Array} [params.networkResources] - Captured network requests list
 * @param {object} [params.intelligence] - Previous intelligence data to extend
 * @returns {Promise<object>} Intelligence object containing libraries and summary
 */
export const detectPageLibraries = async ({ page, html, manifest, networkResources, intelligence }) => {
  logger.info(`Running animation & library detector...`)

  const detectedKeys = {}

  // Helper to add or merge detections
  const addDetection = (key, source, note) => {
    if (!LIBRARY_DEFS[key]) return
    if (!detectedKeys[key]) {
      detectedKeys[key] = { sources: new Set(), notes: [] }
    }
    detectedKeys[key].sources.add(source)
    if (note && !detectedKeys[key].notes.includes(note)) {
      detectedKeys[key].notes.push(note)
    }
  }

  // 1. Unpack any pre-existing intelligence (e.g. from runtime check)
  if (intelligence && intelligence.libraries) {
    for (const category of ['animation', 'frameworks', 'ui']) {
      if (intelligence.libraries[category]) {
        for (const lib of intelligence.libraries[category]) {
          const key = Object.keys(LIBRARY_DEFS).find(k => LIBRARY_DEFS[k].name === lib.name)
          if (key) {
            lib.sources.forEach(src => addDetection(key, src, lib.notes))
          }
        }
      }
    }
  }

  // 2. Scan window globals and HTML markers inside Playwright if available
  if (page) {
    try {
      const detection = await page.evaluate(() => {
        const hasId = (id) => !!document.getElementById(id)
        const hasSelector = (sel) => !!document.querySelector(sel)

        // Check if DOM elements have properties indicating React or Vue
        let hasReact = hasSelector('[data-reactroot]') || !!window.React
        let hasVue = !!window.Vue || !!window.VueDevtools
        
        if (!hasReact || !hasVue) {
          const testElements = [
            document.getElementById('root'),
            document.getElementById('__next'),
            document.getElementById('app'),
            document.querySelector('body > div'),
            document.querySelector('div')
          ].filter(Boolean)

          for (const el of testElements) {
            const keys = Object.keys(el)
            if (!hasReact && keys.some(k => k.startsWith('__reactContainer') || k.startsWith('__reactFiber') || k.startsWith('__reactEvents'))) {
              hasReact = true
            }
            if (!hasVue && (el.__vue_app__ || el.__vueParentComponent || keys.some(k => k.startsWith('__vue')))) {
              hasVue = true
            }
          }
        }

        const globals = {
          gsap: !!window.gsap,
          scrollTrigger: !!window.ScrollTrigger || !!(window.gsap && window.gsap.plugins && window.gsap.plugins.ScrollTrigger),
          lenis: !!window.Lenis || !!window.lenis,
          locomotiveScroll: !!window.LocomotiveScroll,
          aos: !!window.AOS,
          anime: !!window.anime,
          three: !!window.THREE,
          lottie: !!window.lottie || !!window.bodymovin,
          swiper: !!window.Swiper,
          splide: !!window.Splide,
          framerMotion: !!window.Motion || !!window.framerMotion,
          jquery: !!window.jQuery || !!window.$,
          react: hasReact,
          vue: hasVue,
          angular: !!window.angular
        }

        const markers = {
          next: hasId('__next') || !!window.__NEXT_DATA__,
          nuxt: hasId('__nuxt') || !!window.__NUXT__,
          aos: hasSelector('[data-aos]'),
          swiper: hasSelector('.swiper') || hasSelector('[class*="swiper-"]'),
          splide: hasSelector('.splide') || hasSelector('[class*="splide__"]'),
          react: hasReact,
          vue: hasVue
        }

        return { globals, markers }
      })

      // Add globals to detections
      for (const [key, val] of Object.entries(detection.globals)) {
        if (val) {
          addDetection(key, 'window', `window.${key} detected in page context`)
        }
      }

      // Add HTML markers to detections
      for (const [key, val] of Object.entries(detection.markers)) {
        if (val) {
          addDetection(key, 'html-marker', `DOM selector match for ${LIBRARY_DEFS[key]?.name || key}`)
        }
      }

    } catch (err) {
      logger.warn(`Failed to query page runtime variables: ${err.message}`)
    }
  }

  // 3. Scan network resource URLs if available
  if (networkResources && Array.isArray(networkResources)) {
    for (const res of networkResources) {
      if (!res.url) continue
      const urlLower = res.url.toLowerCase()
      for (const [key, def] of Object.entries(LIBRARY_DEFS)) {
        const keywords = Array.isArray(def.keyword) ? def.keyword : [def.keyword]
        for (const kw of keywords) {
          if (urlLower.includes(kw.toLowerCase())) {
            addDetection(key, 'network-url', `Network request matches keyword "${kw}"`)
          }
        }
      }
    }
  }

  // 4. Scan raw HTML string markers if available
  if (html) {
    if (html.includes('id="__next"')) addDetection('next', 'html-marker', 'id="__next" found in HTML source')
    if (html.includes('id="__nuxt"')) addDetection('nuxt', 'html-marker', 'id="__nuxt" found in HTML source')
    if (html.includes('data-aos=')) addDetection('aos', 'html-marker', 'data-aos attribute found in HTML tags')
    if (html.includes('swiper-')) addDetection('swiper', 'html-marker', 'swiper CSS classes found in HTML')
    if (html.includes('splide')) addDetection('splide', 'html-marker', 'splide CSS classes found in HTML')
  }

  // 5. Scan manifest assets original URLs and local filenames if available
  if (manifest && manifest.assets) {
    for (const asset of manifest.assets) {
      const urlLower = (asset.originalUrl || '').toLowerCase()
      const fileLower = (asset.localPath || '').toLowerCase()

      for (const [key, def] of Object.entries(LIBRARY_DEFS)) {
        const keywords = Array.isArray(def.keyword) ? def.keyword : [def.keyword]
        for (const kw of keywords) {
          const kwLower = kw.toLowerCase()
          if (urlLower.includes(kwLower)) {
            addDetection(key, 'script-url', `Asset source URL contains keyword "${kw}"`)
          }
          if (fileLower && fileLower.includes(kwLower)) {
            addDetection(key, 'filename', `Asset filename contains keyword "${kw}"`)
          }
        }
      }
    }
  }

  // Compile final results list
  const libraries = {
    animation: [],
    frameworks: [],
    ui: []
  }

  for (const [key, def] of Object.entries(LIBRARY_DEFS)) {
    const data = detectedKeys[key]
    if (data && data.sources.size > 0) {
      const sourcesArray = Array.from(data.sources)
      
      // Resolve highest confidence level
      let confidence = 'low'
      if (sourcesArray.includes('window')) {
        confidence = 'high'
      } else if (
        sourcesArray.includes('script-url') ||
        sourcesArray.includes('network-url') ||
        sourcesArray.includes('html-marker')
      ) {
        confidence = 'medium'
      }

      const notes = data.notes.join('; ') || `Detected via ${sourcesArray.join(', ')}`

      libraries[def.category].push({
        name: def.name,
        detected: true,
        confidence,
        sources: sourcesArray,
        notes
      })
    }
  }

  const animationLibrariesCount = libraries.animation.length
  const frameworksCount = libraries.frameworks.length
  const uiLibrariesCount = libraries.ui.length
  const totalDetected = animationLibrariesCount + frameworksCount + uiLibrariesCount

  const summary = {
    totalDetected,
    animationLibraries: animationLibrariesCount,
    frameworks: frameworksCount,
    uiLibraries: uiLibrariesCount
  }

  const detectedNames = [
    ...libraries.animation.map(l => l.name),
    ...libraries.frameworks.map(l => l.name),
    ...libraries.ui.map(l => l.name)
  ]

  logger.info(`Detected ${totalDetected} library markers: ${detectedNames.join(', ')}`)

  return {
    libraries,
    summary,
    detectedNames
  }
}
