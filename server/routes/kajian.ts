import { Router } from 'express'
import * as kajianController from '../controllers/kajianController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', kajianController.getKajianList)
router.post('/', kajianController.createKajian)
router.get('/:id', kajianController.getKajian)
router.patch('/:id', kajianController.updateKajian)
router.delete('/:id', kajianController.deleteKajian)
router.post('/:id/meetings', kajianController.createKajianMeeting)

export default router
