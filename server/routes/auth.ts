import { Router } from 'express'
import * as authController from '../controllers/authController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/me', authenticate, authController.getCurrentUser)
router.post('/change-password', authenticate, authController.changePassword)

export default router
