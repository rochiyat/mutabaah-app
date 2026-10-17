import { Router } from 'express'
import * as userController from '../controllers/userController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Izin pencarian dicek di controller (termasuk murabbi pendamping halaqoh)
router.get('/', userController.getUsers)
router.patch('/:id/roles', requireRole('superadmin', 'admin', 'operator'), userController.updateRoles)
router.post('/:id/reset-password', requireRole('superadmin', 'admin', 'operator'), userController.resetPassword)
router.patch('/:id/status', requireRole('superadmin', 'admin', 'operator'), userController.updateStatus)

export default router
