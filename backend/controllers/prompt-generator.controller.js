import { generateRebuildPrompt } from '../services/prompt-generator.service.js'
import { logger } from '../utils/logger.util.js'

/**
 * Express controller handler to process prompt generation requests.
 */
export const generatePromptController = async (req, res, next) => {
  try {
    const { url } = req.body
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a target URL.'
        }
      })
    }

    logger.info(`Starting prompt generation controller for target URL: ${url}`)
    const result = await generateRebuildPrompt(url)

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (err) {
    logger.error(`Error in generatePromptController: ${err.message}`)
    res.status(500).json({
      success: false,
      error: {
        message: err.message || 'An error occurred during prompt generation.'
      }
    })
  }
}
