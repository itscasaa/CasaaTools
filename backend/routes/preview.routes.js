import { Router } from 'express'
import { getPreview, getPreviewAsset } from '../controllers/preview.controller.js'

const router = Router()

router.get('/:jobId', getPreview)
router.get('/:jobId/assets/*', getPreviewAsset)

export default router
