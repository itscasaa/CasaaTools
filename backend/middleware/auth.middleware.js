import { verifyToken } from '../services/auth.service.js'
import { getJob } from '../services/job.service.js'

export const authMiddleware = (req, res, next) => {
  // Allow OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return next()
  }

  let token = null

  // Check Authorization header
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]
  }

  // Check query parameter (fallback for media/downloads)
  if (!token && req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
      }
    })
  }

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Akses ditolak. Token tidak valid atau kedaluwarsa.'
      }
    })
  }
}

export const checkJobOwnership = async (req, res, next) => {
  const { jobId } = req.params
  if (!jobId) {
    return next()
  }
  try {
    const job = await getJob(jobId)
    if (job && job.userId && job.userId !== req.user?.email) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Akses ditolak. Anda bukan pemilik pekerjaan ini.',
          code: 'FORBIDDEN'
        }
      })
    }
    req.job = job
    next()
  } catch (err) {
    next(err)
  }
}
