import { generateProjectScaffold, getScaffoldZipPath } from '../services/scaffold.service.js'
import { logger } from '../utils/logger.util.js'

/**
 * Endpoint to request dynamic project skeleton creation using AI
 */
export const createScaffoldController = async (req, res, next) => {
  try {
    const { projectName, description, framework, language, styling, folders } = req.body
    
    if (!projectName) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a project name.'
        }
      })
    }

    logger.info(`Starting scaffold generation controller for project: ${projectName}`)
    
    const result = await generateProjectScaffold({
      projectName,
      description,
      framework,
      language,
      styling,
      folders
    })

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (err) {
    logger.error(`Error in createScaffoldController: ${err.message}`)
    res.status(500).json({
      success: false,
      error: {
        message: err.message || 'An error occurred during project scaffolding.'
      }
    })
  }
}

/**
 * Endpoint to download generated ZIP archive
 */
export const downloadScaffoldController = async (req, res, next) => {
  try {
    const { scaffoldId } = req.params
    
    if (!scaffoldId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Scaffold ID is required for download.'
        }
      })
    }

    logger.info(`Processing project scaffold download request: ${scaffoldId}`)
    const filePath = await getScaffoldZipPath(scaffoldId)
    
    res.download(filePath, `scaffold-${scaffoldId}.zip`)
  } catch (err) {
    logger.error(`Error in downloadScaffoldController: ${err.message}`)
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        message: err.message || 'Project structure file not found.'
      }
    })
  }
}
