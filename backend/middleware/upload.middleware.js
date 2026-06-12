import multer from 'multer'
import path from 'path'
import { scannerConfig } from '../config/scanner.config.js'

const storage = multer.memoryStorage()

/**
 * Multer middleware for single ZIP file upload.
 * Field name: 'projectZip'
 * Enforces file size limit and .zip extension.
 */
export const uploadZip = multer({
  storage,
  limits: {
    fileSize: scannerConfig.MAX_ZIP_SIZE_MB * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ext !== '.zip') {
      const err = new Error('Hanya file .zip yang diizinkan')
      err.code = 'INVALID_FILE_TYPE'
      return cb(err, false)
    }
    cb(null, true)
  }
}).single('projectZip')

/**
 * Middleware that conditionally applies multer for multipart/form-data requests.
 * For JSON requests, it passes through without modification.
 * Handles multer errors (file size, file type) with proper error responses.
 */
export function handleCodeqlContentType(req, res, next) {
  const contentType = req.headers['content-type'] || ''
  if (contentType.includes('multipart/form-data')) {
    uploadZip(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: {
              message: `Ukuran file melebihi batas ${scannerConfig.MAX_ZIP_SIZE_MB}MB`,
              code: 'FILE_TOO_LARGE'
            }
          })
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({
            success: false,
            error: {
              message: err.message,
              code: 'INVALID_FILE_TYPE'
            }
          })
        }
        return next(err)
      }
      next()
    })
  } else {
    next()
  }
}
