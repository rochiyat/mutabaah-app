import { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', requireRole('superadmin', 'admin', 'murabbi'), userController.getUsers)
router.patch('/:id/role', requireRole('superadmin', 'admin'), userController.updateRole)
router.patch('/:id/status', requireRole('superadmin', 'admin'), userController.updateStatus)

export default router
