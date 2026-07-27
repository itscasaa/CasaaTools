import { Router } from 'express'
import { createScaffoldController, downloadScaffoldController } from '../controllers/scaffold.controller.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

// Endpoint to generate structural metadata and package ZIP files
router.post('/generate', authMiddleware, createScaffoldController)

// Public direct download endpoint so native browser anchors trigger seamlessly
router.get('/download/:scaffoldId', downloadScaffoldController)

export default router
