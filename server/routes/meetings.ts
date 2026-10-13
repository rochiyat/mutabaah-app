import { Router } from 'express'
import * as meetingController from '../controllers/meetingController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/:id', meetingController.getMeeting)
router.patch('/:id', meetingController.updateMeeting)
router.delete('/:id', meetingController.deleteMeeting)
router.put('/:id/attendance', meetingController.saveAttendance)
router.delete('/:id/attendance/:userId', meetingController.removeAttendance)
router.post('/:id/check-in', meetingController.checkIn)

export default router
