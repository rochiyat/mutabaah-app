import { Router } from 'express'
import * as auditController from '../controllers/auditController'
import { authenticate, requireRole } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Log aktivitas pengurus hanya untuk superadmin & admin
router.get('/', requireRole('superadmin', 'admin'), auditController.getAuditLogs)

export default router
