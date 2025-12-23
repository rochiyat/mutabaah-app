import { Router } from 'express'
import * as activityController from '../controllers/activityController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', activityController.getActivities)
router.post('/', activityController.createActivity)
router.patch('/:id', activityController.updateActivity)
router.delete('/:id', activityController.deleteActivity)

export default router
