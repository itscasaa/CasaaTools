import { Router } from 'express'
import { validateScanUrl } from '../middleware/scan-url.middleware.js'
import { handleCodeqlContentType } from '../middleware/upload.middleware.js'
import {
  submitLighthouseScan,
  submitCodeqlScan,
  getScanDetail,
  getScansList,
  cancelScan,
  deleteScan
} from '../controllers/scan.controller.js'

const router = Router()

// POST /api/scans/lighthouse — Start a Lighthouse scan
router.post('/lighthouse', validateScanUrl, submitLighthouseScan)

// POST /api/scans/codeql — Start a CodeQL scan (supports JSON and multipart/form-data)
router.post('/codeql', handleCodeqlContentType, submitCodeqlScan)

// GET /api/scans — List all scans (paginated)
router.get('/', getScansList)

// GET /api/scans/:scanId — Get scan detail
router.get('/:scanId', getScanDetail)

// POST /api/scans/:scanId/cancel — Cancel a scan
router.post('/:scanId/cancel', cancelScan)

// DELETE /api/scans/:scanId — Delete a scan
router.delete('/:scanId', deleteScan)

export default router
