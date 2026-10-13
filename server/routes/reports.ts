import { Router } from 'express'
import * as reportController from '../controllers/reportController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Semua endpoint menerima ?start=yyyy-MM-dd&end=yyyy-MM-dd (default bulan ini) dan ?format=xlsx
router.get('/groups/:groupId/mutabaah', reportController.groupMutabaah)
router.get('/groups/:groupId/attendance', reportController.groupAttendance)
router.get('/kajian/:id/attendance', reportController.kajianAttendance)
router.get('/users/:userId/mutabaah', reportController.userMutabaah)

export default router
