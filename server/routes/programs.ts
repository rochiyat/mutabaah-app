import { Router } from 'express'
import * as programController from '../controllers/programController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', programController.getPrograms)
router.post('/', programController.createProgram)
router.get('/:id', programController.getProgram)
router.patch('/:id', programController.updateProgram)
router.delete('/:id', programController.deleteProgram)
router.post('/:id/participants', programController.addParticipant)
router.patch('/:id/participants/:userId', programController.updateParticipant)
router.delete('/:id/participants/:userId', programController.removeParticipant)

export default router
