import { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Izin pencarian dicek di controller (termasuk murabbi pendamping halaqoh)
router.get('/', userController.getUsers)
router.patch('/:id/role', requireRole('superadmin', 'admin'), userController.updateRole)
router.patch('/:id/status', requireRole('superadmin', 'admin'), userController.updateStatus)

export default router
