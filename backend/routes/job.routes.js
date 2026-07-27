import { Router } from 'express'
import { 
  getJobsList, 
  getJobDetail, 
  getJobScreenshot, 
  getJobManifest, 
  downloadJobZip,
  getJobPreviewScreenshot,
  getJobVisualDiff,
  deleteJob
} from '../controllers/job.controller.js'
import { checkJobOwnership } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/', getJobsList)
router.get('/:jobId', checkJobOwnership, getJobDetail)
router.delete('/:jobId', checkJobOwnership, deleteJob)
router.get('/:jobId/screenshot', checkJobOwnership, getJobScreenshot)
router.get('/:jobId/preview-screenshot', checkJobOwnership, getJobPreviewScreenshot)
router.get('/:jobId/visual-diff', checkJobOwnership, getJobVisualDiff)
router.get('/:jobId/manifest', checkJobOwnership, getJobManifest)
router.get('/:jobId/download', checkJobOwnership, downloadJobZip)

export default router
