import express from 'express'
import { 
  registerUser, 
  loginUser, 
  getUserById, 
  updateUserProfile, 
  updateUserPassword 
} from '../services/auth.service.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = express.Router()

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    const result = await registerUser(name, email, password)
    res.status(201).json({
      success: true,
      data: result
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message
      }
    })
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await loginUser(email, password)
    res.status(200).json({
      success: true,
      data: result
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message
      }
    })
  }
})

// Get Current User Profile
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Pengguna tidak ditemukan.'
        }
      })
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    })
  } catch (err) {
    next(err)
  }
})

// Update Profile
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name, email } = req.body
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Nama dan email harus diisi.'
        }
      })
    }

    const updatedUser = await updateUserProfile(req.user.id, name, email)

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt
        }
      }
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message
      }
    })
  }
})

// Update Password
router.put('/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Kata sandi saat ini dan kata sandi baru harus diisi.'
        }
      })
    }

    await updateUserPassword(req.user.id, currentPassword, newPassword)

    res.status(200).json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.'
    })
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message
      }
    })
  }
})

export default router
