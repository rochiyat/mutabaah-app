import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middleware/auth'
import { rateLimit } from '../middleware/rateLimit'

const router = Router()

const MINUTE = 60 * 1000

// Batas per IP, melengkapi kunci per akun di authController.login
const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  max: 20,
  message: 'Terlalu banyak percobaan login dari perangkat ini.',
})
const registerLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  max: 10,
  message: 'Terlalu banyak pendaftaran dari perangkat ini.',
})
const changePasswordLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  max: 10,
  message: 'Terlalu banyak percobaan ganti password.',
})

router.post('/register', registerLimiter, authController.register)
router.post('/login', loginLimiter, authController.login)
router.get('/me', authenticate, authController.getCurrentUser)
router.patch('/profile', authenticate, authController.updateProfile)
router.post('/change-password', changePasswordLimiter, authenticate, authController.changePassword)

export default router
