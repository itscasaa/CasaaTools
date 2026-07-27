import { Router } from 'express'
import { generatePromptController } from '../controllers/prompt-generator.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

// Submits a website URL to scan and generate a recreation prompt
router.post('/generate', authMiddleware, generatePromptController)

export default router
