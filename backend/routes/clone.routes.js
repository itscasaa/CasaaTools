import { Router } from 'express'
import { submitClone } from '../controllers/clone.controller.js'
import { validateUrl } from '../middleware/validate-url.middleware.js'

const router = Router()

router.post('/', validateUrl, submitClone)

export default router
