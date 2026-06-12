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

const router = Router()

router.get('/', getJobsList)
router.get('/:jobId', getJobDetail)
router.delete('/:jobId', deleteJob)
router.get('/:jobId/screenshot', getJobScreenshot)
router.get('/:jobId/preview-screenshot', getJobPreviewScreenshot)
router.get('/:jobId/visual-diff', getJobVisualDiff)
router.get('/:jobId/manifest', getJobManifest)
router.get('/:jobId/download', downloadJobZip)

export default router
