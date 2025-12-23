import { Router } from 'express'
import * as statsController from '../controllers/statsController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/dashboard', statsController.getDashboardStats)
router.get('/weekly', statsController.getWeeklyStats)
router.get('/monthly', statsController.getMonthlyStats)

export default router
