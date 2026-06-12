import { chromium } from 'playwright'
import { playwrightConfig } from '../config/playwright.config.js'
import { appConfig } from '../config/app.config.js'
import { logger } from '../utils/logger.util.js'
import path from 'path'
import fs from 'fs-extra'
import sharp from 'sharp'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

/**
 * Runs a visual comparison between the original screenshot and a new screenshot of the rewritten local preview.
 * 
 * @param {object} params
 * @param {string} params.jobId - Unique Job ID
 * @param {string} params.outputDir - Output directory path
 * @param {string} params.originalScreenshotPath - Path to original screenshot.png
 * @returns {Promise<object>} Visual compare summary object
 */
export const runVisualCompareForJob = async ({ jobId, outputDir, originalScreenshotPath }) => {
  const finishedAt = new Date().toISOString()
  const port = appConfig.PORT || 5000
  const previewUrl = `http://localhost:${port}/preview/${jobId}`
  const previewScreenshotPath = path.join(outputDir, 'preview-screenshot.png')
  const diffPath = path.join(outputDir, 'visual-diff.png')

  let browser = null
  try {
    logger.info(`Starting visual compare for job ${jobId}`)

    // 1. Verify original screenshot exists
    if (!(await fs.pathExists(originalScreenshotPath))) {
      throw new Error(`Original screenshot not found at ${originalScreenshotPath}`)
    }

    // 2. Launch browser to capture local preview
    const launchOpts = {
      ...playwrightConfig.launchOptions
    }
    const contextOpts = {
      ...playwrightConfig.contextOptions
    }
    
    browser = await chromium.launch(launchOpts)
    const context = await browser.newContext(contextOpts)
    const page = await context.newPage()

    const timeout = playwrightConfig.navigation.timeout
    page.setDefaultTimeout(timeout)
    page.setDefaultNavigationTimeout(timeout)

    logger.info(`Navigating to local preview: ${previewUrl}`)
    try {
      await page.goto(previewUrl, { waitUntil: 'networkidle', timeout })
    } catch (gotoErr) {
      logger.warn(`Navigation with networkidle timed out. Falling back to domcontentloaded for preview.`)
      await page.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout })
    }

    // Capture local preview screenshot
    logger.info(`Capturing preview screenshot...`)
    await page.screenshot({ path: previewScreenshotPath, fullPage: true })
    
    await browser.close()
    browser = null

    // 3. Compare original vs preview
    logger.info(`Comparing screenshots: original vs preview`)
    const img1 = sharp(originalScreenshotPath)
    const img2 = sharp(previewScreenshotPath)
    
    const meta1 = await img1.metadata()
    const meta2 = await img2.metadata()

    const width = Math.max(meta1.width || 1440, meta2.width || 1440)
    const height = Math.max(meta1.height || 1200, meta2.height || 1200)

    // Helper to pad image to target dimensions without scaling
    const normalizeImage = async (filePath, meta) => {
      let processed = sharp(filePath)
      const extendOpts = {
        top: 0,
        left: 0,
        right: width - (meta.width || width),
        bottom: height - (meta.height || height),
        background: { r: 255, g: 255, b: 255, alpha: 255 }
      }
      if (extendOpts.right > 0 || extendOpts.bottom > 0) {
        processed = processed.extend(extendOpts)
      }
      return processed.png().toBuffer()
    }

    const buffer1 = await normalizeImage(originalScreenshotPath, meta1)
    const buffer2 = await normalizeImage(previewScreenshotPath, meta2)

    const png1 = PNG.sync.read(buffer1)
    const png2 = PNG.sync.read(buffer2)

    const diff = new PNG({ width, height })
    
    const differentPixels = pixelmatch(
      png1.data,
      png2.data,
      diff.data,
      width,
      height,
      { threshold: 0.1 }
    )

    const totalPixels = width * height
    const rawScore = 100 - ((differentPixels / totalPixels) * 100)
    const score = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100))

    // Save visual diff image
    const diffBuffer = PNG.sync.write(diff)
    await fs.writeFile(diffPath, diffBuffer)
    logger.info(`Visual comparison complete. Score: ${score}%, Diff pixels: ${differentPixels}`)

    return {
      status: 'completed',
      score,
      differentPixels,
      totalPixels,
      dimensions: { width, height },
      files: {
        originalScreenshot: 'screenshot.png',
        previewScreenshot: 'preview-screenshot.png',
        diff: 'visual-diff.png'
      },
      finishedAt
    }

  } catch (err) {
    logger.error(`Visual comparison failed for job ${jobId}: ${err.message}`)
    if (browser) {
      try {
        await browser.close()
      } catch (closeErr) {
        // ignore
      }
    }
    return {
      status: 'failed',
      error: {
        message: err.message || 'Visual comparison failed.',
        code: 'VISUAL_COMPARE_FAILED'
      }
    }
  }
}
