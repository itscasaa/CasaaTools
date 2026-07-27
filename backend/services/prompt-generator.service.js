import { chromium } from 'playwright'
import { playwrightConfig } from '../config/playwright.config.js'
import * as cheerio from 'cheerio'
import { performStackScan } from './stack-scanner.service.js'
import { logger } from '../utils/logger.util.js'

/**
 * Strips script tags, style sheets, svg elements (minifies them), large base64 media blocks,
 * and keeps only structural attributes (classes, ids, hierarchy, forms) to minimize token sizes
 * while fully preserving layout designs, component alignments, and Tailwind configurations.
 */
export const cleanHtmlStructure = (html) => {
  try {
    const $ = cheerio.load(html)
    
    // 1. Remove non-structural asset/styling/hydration metadata
    $('script, style, noscript, iframe, link, meta, head, comment').remove()
    
    // 2. Clean heavy inline SVG path data, but keep structure tags
    $('svg').each((_, el) => {
      $(el).empty().append('<path d="..." />')
    })
    
    // 3. Remove inline base64 image data blocks
    $('img').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src.startsWith('data:')) {
        $(el).attr('src', 'data:image/png;base64,...')
      }
    })
    
    // 4. Clean non-layout/non-styling attributes
    $('*').each((_, el) => {
      const attribs = el.attribs || {}
      const allowed = ['id', 'class', 'href', 'placeholder', 'src', 'alt', 'type', 'name', 'value']
      Object.keys(attribs).forEach(attr => {
        if (!allowed.includes(attr.toLowerCase())) {
          $(el).removeAttr(attr)
        }
      })
    })

    // 5. Build clean, dense HTML body outline string
    let cleaned = $('body').html() || $.html('body') || ''
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
    return cleaned
  } catch (err) {
    logger.error(`Error cleaning HTML structure: ${err.message}`)
    return ''
  }
}

/**
 * Loads the webpage using Playwright to extract core page meta description, headings,
 * structure, element counts, visible text, stack signatures, computed fonts, exact animation coordinates,
 * computed colors, and overlay positioning metrics.
 */
export const extractPageContext = async (url) => {
  let browser = null
  try {
    logger.info(`Extracting page context for prompt generation: ${url}`)
    browser = await chromium.launch(playwrightConfig.launchOptions)
    const context = await browser.newContext(playwrightConfig.contextOptions)
    const page = await context.newPage()
    
    // Set navigation timeout of 15 seconds for quick retrieval
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(15000)
    
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    const title = await page.title()
    const html = await page.content()
    
    // Parse visible text and structures via Cheerio
    const $ = cheerio.load(html)
    
    // Metadata extraction
    const metaDescription = $('meta[name="description"]').attr('content') || 
                            $('meta[property="og:description"]').attr('content') || 
                            $('meta[name="twitter:description"]').attr('content') || ''
    
    // Headings collection
    const headings = []
    $('h1, h2, h3').each((_, el) => {
      const tag = el.tagName.toLowerCase()
      const text = $(el).text().trim()
      if (text) {
        headings.push(`${tag.toUpperCase()}: ${text}`)
      }
    })
    
    // Interactive count estimates
    const formsCount = $('form').length
    const inputsCount = $('input, select, textarea').length
    const buttonsCount = $('button').length
    
    // Body visible text snippet
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500)
    
    // Tech Stack scanning
    let techStack = []
    try {
      const scanResult = await performStackScan(url)
      if (scanResult && scanResult.categories) {
        Object.keys(scanResult.categories).forEach(cat => {
          techStack.push(`${cat}: ${scanResult.categories[cat].join(', ')}`)
        })
      }
    } catch (e) {
      logger.warn(`Failed to scan stack details for prompt context: ${e.message}`)
    }

    // 1. Audit and extract loaded browser font-families
    let loadedFonts = []
    try {
      loadedFonts = await page.evaluate(() => {
        try {
          const families = Array.from(document.fonts.values()).map(f => f.family)
          return Array.from(new Set(families)).filter(Boolean)
        } catch (e) {
          return []
        }
      })
    } catch (err) {
      logger.warn(`Failed to extract loaded browser fonts: ${err.message}`)
    }

    // 2. Audit and extract computed typography styles from h1, h2, body
    let computedTypography = null
    try {
      computedTypography = await page.evaluate(() => {
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
    } catch (err) {
      logger.warn(`Failed to extract computed typography: ${err.message}`)
    }

    // 3. Audit unique computed hex colors on elements
    let auditedColors = []
    try {
      auditedColors = await page.evaluate(() => {
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

        // Scan color configurations of common tags
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
        return Array.from(colors).slice(0, 15) // Limit to top 15
      })
    } catch (err) {
      logger.warn(`Failed to extract audited colors: ${err.message}`)
    }

    // 4. Audit overlay positioning metrics (fixed / sticky headers or layouts)
    let fixedElements = []
    try {
      fixedElements = await page.evaluate(() => {
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
    } catch (err) {
      logger.warn(`Failed to extract fixed layouts: ${err.message}`)
    }

    // 5. Audit animation hooks (Locomotive scroll, AOS, and custom CSS transitions)
    let animationElements = []
    try {
      animationElements = await page.evaluate(() => {
        const elements = []
        
        // Locomotive Scroll / Parallax markers
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

        // AOS triggers
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

        // Transition utility hooks on interaction components (buttons, links)
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
    } catch (err) {
      logger.warn(`Failed to extract animation elements: ${err.message}`)
    }

    return {
      title,
      metaDescription,
      headings: headings.slice(0, 20),
      formsCount,
      inputsCount,
      buttonsCount,
      bodyText,
      techStack,
      loadedFonts,
      computedTypography,
      auditedColors,
      fixedElements,
      animationElements,
      rawHtml: html
    }
  } catch (err) {
    logger.error(`Failed to extract page context for URL ${url}: ${err.message}`)
    throw new Error(`Failed to capture website details: ${err.message}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Triggers Prompt Generator LLM via 9router OpenAI-compatible completion API.
 */
export const generateRebuildPrompt = async (url) => {
  // 1. Scrape targets page layout, computed styles, colors, transitions, and framework context
  const context = await extractPageContext(url)
  
  // 2. Clean and compress HTML for high-fidelity token efficiency (approx. 20-30KB outline blueprint)
  const cleanBodyHtml = cleanHtmlStructure(context.rawHtml)
  
  // 3. Configure 9router API credentials
  const apiKey = 'sk-a9363991482934a3-3d8b3w-d866ff89'
  const apiBaseUrl = 'https://casaaraksa.duckdns.org/v1'
  const modelName = 'PromntGenerator'
  
  const systemPrompt = `# WEBSITE CLONE PROMPT GENERATOR
Version: 2.0
Role: Senior Full Stack UI Engineer + UX Researcher + Frontend Architect + Visual Design Auditor

## YOUR ROLE
You are an elite frontend reverse engineer.
Your mission is NOT to build websites.
Your mission is to inspect a website in extreme detail and generate the most accurate implementation prompt possible for another AI coding model.
The generated prompt must allow another AI to recreate the website with near pixel-perfect accuracy.
You NEVER guess.
You NEVER invent missing information.
You NEVER simplify.
You NEVER replace unknown details with assumptions.
Everything must be based on observation.
If something cannot be verified, explicitly write:
"Unknown - Not Visible"
instead of guessing.
Accuracy is more important than speed.

## ABSOLUTE RULES
Never summarize.
Never shorten descriptions.
Never omit sections.
Never use vague wording.
Forbidden words:
- modern
- clean
- beautiful
- nice
- elegant
- similar
- approximately
- looks like

Instead explain EXACTLY why.
Bad: "The hero is modern."
Good: "The hero occupies approximately 92vh of viewport height. Left aligned headline uses 64px ExtraBold font. CTA button width 172px with 16px vertical padding."

## DO NOT GUESS
Wrong: "The font is probably Inter."
Correct: "The font appears to be Inter or another geometric sans-serif. Unable to verify from rendered HTML."
Wrong: "Animation uses Framer Motion."
Correct: "Animation is a fade-in combined with translateY (~24px). Implementation library cannot be verified."`

  // Build markdown structures for audit parameters
  const fontSection = context.loadedFonts.length > 0 ? context.loadedFonts.map(f => `  * ${f}`).join('\n') : '  * Unknown - Not Visible'
  
  let typoSection = ''
  if (context.computedTypography) {
    const { h1, h2, h3, body } = context.computedTypography
    if (h1) typoSection += `  * **H1**: Font Family: ${h1.fontFamily}, Size: ${h1.fontSize}, Weight: ${h1.fontWeight}, Color: ${h1.color}\n`
    if (h2) typoSection += `  * **H2**: Font Family: ${h2.fontFamily}, Size: ${h2.fontSize}, Weight: ${h2.fontWeight}, Color: ${h2.color}\n`
    if (h3) typoSection += `  * **H3**: Font Family: ${h3.fontFamily}, Size: ${h3.fontSize}, Weight: ${h3.fontWeight}, Color: ${h3.color}\n`
    if (body) typoSection += `  * **Body / Text**: Font Family: ${body.fontFamily}, Size: ${body.fontSize}, Weight: ${body.fontWeight}, Color: ${body.color}\n`
  } else {
    typoSection = '  * Unknown - Not Visible'
  }

  const colorSection = context.auditedColors.length > 0 ? context.auditedColors.map(c => `  * ${c}`).join('\n') : '  * Unknown - Not Visible'

  let fixedSection = ''
  if (context.fixedElements && context.fixedElements.length > 0) {
    context.fixedElements.forEach((el, index) => {
      fixedSection += `  ${index + 1}. **Tag**: <${el.tag}>, **Class**: \`${el.className || '(none)'}\`, **Position**: ${el.position}, **zIndex**: ${el.zIndex}, **Top**: ${el.top}\n`
    })
  } else {
    fixedSection = '  * Unknown - Not Visible'
  }

  let animationAuditSection = ''
  if (context.animationElements && context.animationElements.length > 0) {
    context.animationElements.forEach((el, index) => {
      animationAuditSection += `  ${index + 1}. **Tag**: <${el.tag}>, **Class**: \`${el.className || '(none)'}\`, **Type**: ${el.type}\n`
      if (el.attributes && Object.keys(el.attributes).filter(k => el.attributes[k]).length > 0) {
        animationAuditSection += `     * Attributes: ${JSON.stringify(el.attributes)}\n`
      }
    })
  } else {
    animationAuditSection = '  * Unknown - Not Visible'
  }

  // Send a condensed, highly structural version of HTML (up to 45k characters / approx 8k tokens)
  const userContent = `Please perform a detailed visual and architectural audit and generate ONE implementation prompt for this URL: ${url}

Here are the details extracted from the target page:
- **Title**: ${context.title}
- **Description**: ${context.metaDescription || 'No meta description found.'}
- **Detected Tech Stack**: ${context.techStack.length > 0 ? context.techStack.join(', ') : 'Not detected'}
- **Heading Structure**:
${context.headings.map(h => `  * ${h}`).join('\n')}
- **Interactive Element Counts**:
  * Forms: ${context.formsCount}
  * Inputs: ${context.inputsCount}
  * Buttons: ${context.buttonsCount}

- **Audited Browser Font Families**:
${fontSection}

- **Computed CSS Typography (H1, H2, body/p style elements)**:
${typoSection}

- **Audited Unique Hex Colors**:
${colorSection}

- **Fixed/Sticky Layout Elements**:
${fixedSection}

- **Audited Animation Anchors & Interactive Transition Classes**:
${animationAuditSection}

- **Clean Structural HTML Body** (blueprint of layout, component structures, grids, and Tailwind CSS classes):
\`\`\`html
${cleanBodyHtml.slice(0, 45000)}
\`\`\`

Please structure the final generated prompt with these categories (fill with "UNKNOWN — NOT OBSERVABLE" if not detectable):
1. **Website Overview**: Purpose, Conversions, Brand personality, User journey.
2. **Layout Analysis**: Viewport width, container, grid columns, section order.
3. **Color System**: Hex estimations of Primary, Secondary, Background, Surfaces, Borders, States.
4. **Typography**: Estimated families, scales, weights, line-heights.
5. **Components**: Detail navbar, heroes, footers, accordion structures, testimonials, custom buttons.
6. **Interaction & Animation Audit**: Hover, focus, pressed states, scroll reveals, ease, durations.
7. **Responsive Audit**: Stacking, layout breakpoint modifications.
8. **Visual Language & Assets**: SVGs, backgrounds, icons, illustrations.
9. **Implementation Plan & Rules**: Tech stack constraints, folder structures, component hierarchy.
`

  try {
    logger.info(`Sending prompt request for URL ${url} to 9router using model ${modelName}`)
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        stream: false
      })
    })

    const rawText = await response.text()

    if (!response.ok) {
      let errMsg = 'Failed request to 9router API.'
      try {
        const errObj = JSON.parse(rawText)
        errMsg = errObj?.error?.message || errObj?.message || errMsg
      } catch (e) {}
      throw new Error(errMsg)
    }

    // Check if the response is returned as an SSE/stream (starts with data:)
    const trimmedText = rawText.trim()
    if (trimmedText.startsWith('data:')) {
      logger.info('9router returned an SSE stream. Parsing chunks...')
      const lines = trimmedText.split('\n')
      let fullContent = ''
      
      for (const line of lines) {
        const lineTrim = line.trim()
        if (lineTrim.startsWith('data:')) {
          const dataStr = lineTrim.slice(5).trim()
          if (dataStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(dataStr)
            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || ''
            fullContent += content
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
      
      if (!fullContent) {
        throw new Error('Completed stream parser returned empty text.')
      }

      return {
        success: true,
        url,
        prompt: fullContent,
        meta: {
          title: context.title,
          description: context.metaDescription,
          techStack: context.techStack
        }
      }
    }

    // Standard JSON parsing fallback
    const data = JSON.parse(trimmedText)
    if (data && data.choices && data.choices[0]) {
      return {
        success: true,
        url,
        prompt: data.choices[0].message?.content || data.choices[0].message || '',
        meta: {
          title: context.title,
          description: context.metaDescription,
          techStack: context.techStack
        }
      }
    } else {
      throw new Error('Received an empty choices list from the 9router API.')
    }
  } catch (err) {
    const errMsg = err.message
    logger.error(`9router API submission failed: ${errMsg}`)
    throw new Error(`Failed to generate prompt from AI: ${errMsg}`)
  }
}

/**
 * Refines the rewritten HTML code of a cloned website using the PromntGenerator model
 * from 9router to ensure visual symmetry, styling repair, and standard compliance.
 * Includes size thresholds and robust fallback capabilities.
 */
export const refineHtmlWithAI = async (html, url, domAudit = null) => {
  const apiKey = 'sk-a9363991482934a3-3d8b3w-d866ff89'
  const apiBaseUrl = 'https://casaaraksa.duckdns.org/v1'
  const modelName = 'PromntGenerator'

  // Safety threshold: Skip AI processing for files larger than 150KB to prevent Nginx 504 timeouts
  if (html.length > 150000) {
    logger.info(`HTML file for ${url} is too large (${Math.round(html.length / 1024)}KB) for AI layout correction. Skipping to prevent timeout...`)
    return html
  }

  const systemPrompt = `You are HTMLRefineBuilder, a world-class Senior Frontend Engineer and UI/UX Optimizer.
Your task is to review the provided reconstructed HTML code of a cloned website (target URL: ${url}), detect layout breakage, broken or empty scripts, unstyled elements, absolute remote references, visual alignment bugs, or CSS conflicts, and return a clean, fully refined, standalone, and visually identical HTML codebase.

CRITICAL ANIMATION & SCRIPT RULES:
1. INSPECT the animation scripts and CSS transitions. If Locomotive Scroll, Lenis, GSAP, or custom scroll handlers are causing heavy lag, extreme delays, or scroll lockouts:
   - Recalibrate scroll duration/ease instantiations (e.g. set scroll easing friction to responsive values).
   - Check if scroll triggers are stuck offscreen due to height offsets, and ensure trigger points calculations are refreshed.
   - For AOS elements, check if duration or delays are excessively long (like 1s to 2s) causing elements to load too slowly, and optimize duration/delay values to be snappy and immediate (e.g. max 500ms duration, min delay).
2. FIX missing load triggers: If some animated containers stay hidden (opacity: 0) because the JS initialization fails or delays are stuck, inject a fail-safe CSS style or JS event listener that guarantees all animation elements transition to visible (opacity: 1) on load.
3. KEEP all relative references to local asset paths (like "assets/js/...", "assets/css/...", "assets/images/...") intact. Do not rewrite them to absolute external URLs.
4. Preserve all existing div hierarchies, elements, forms, and custom sections. Only optimize styling classes, grid systems, flex orientations, padding, margins, script alignments, or fonts.
5. Output ONLY the updated, complete HTML code starting with <!DOCTYPE html> and ending with </html>.
6. Do NOT wrap the code in markdown blocks (e.g. do not use \`\`\`html) and do NOT write any conversational text, notes, warnings, or summaries. Output raw HTML code only.`

  let userContent = `Here is the reconstructed HTML code for ${url}. Please inspect and refine it to guarantee pixel-perfect layout visual symmetry, resolve slow/stuck transitions, optimize scroll lag, and eliminate styling bugs/conflicts:\n\n`

  if (domAudit) {
    userContent += `### ACTIVE BROWSER DOM AUDIT DIAGNOSTICS (Target Site Live Metrics):
- **Loaded Fonts**: ${JSON.stringify(domAudit.loadedFonts)}
- **Typography Styles**: ${JSON.stringify(domAudit.computedTypography)}
- **Audited Colors**: ${JSON.stringify(domAudit.auditedColors)}
- **Layout Fixed Elements**: ${JSON.stringify(domAudit.fixedElements)}
- **Original Animation Nodes**: ${JSON.stringify(domAudit.animationElements)}

Please align the HTML code transitions, scroll settings, styles, and animation triggers with these audited metrics.\n\n`
  }

  userContent += `### RECONSTRUCTED HTML CODE:\n${html}`

  try {
    logger.info(`Sending HTML refinement request for ${url} to 9router using model ${modelName} (${Math.round(html.length / 1024)}KB)`)
    
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.3,
        stream: false
      })
    })

    const rawText = await response.text()

    if (!response.ok) {
      throw new Error(`9router API returned status ${response.status}`)
    }

    const trimmed = rawText.trim()
    let chatCompletion = null
    try {
      chatCompletion = JSON.parse(trimmed)
    } catch (e) {
      // Fallback stream parse check
      if (trimmed.startsWith('data:')) {
        const lines = trimmed.split('\n')
        let fullContent = ''
        for (const line of lines) {
          const lineTrim = line.trim()
          if (lineTrim.startsWith('data:')) {
            const dataStr = lineTrim.slice(5).trim()
            if (dataStr === '[DONE]') continue
            try {
              const parsed = JSON.parse(dataStr)
              const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || ''
              fullContent += content
            } catch (e) {}
          }
        }
        
        let cleanedContent = fullContent.trim()
        if (cleanedContent.startsWith('```')) {
          const match = cleanedContent.match(/^```(?:html)?([\s\S]+)```$/)
          if (match) cleanedContent = match[1].trim()
        }
        return cleanedContent
      }
      throw new Error('AI response wrapper was not formatted in a valid JSON structure.')
    }

    if (chatCompletion && chatCompletion.choices && chatCompletion.choices[0]) {
      const content = chatCompletion.choices[0].message?.content || ''
      let cleanedContent = content.trim()
      
      if (cleanedContent.startsWith('```')) {
        const match = cleanedContent.match(/^```(?:html)?([\s\S]+)```$/)
        if (match) cleanedContent = match[1].trim()
      }
      
      logger.info(`Successfully refined HTML using AI for ${url}`)
      return cleanedContent
    } else {
      throw new Error('AI completion choices returned empty.')
    }
  } catch (err) {
    logger.error(`HTML refinement failed: ${err.message}. Defaulting back to original reconstructed HTML.`)
    return html
  }
}

