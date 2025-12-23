import { Router } from 'express'
import * as recordController from '../controllers/recordController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', recordController.getRecords)
router.post('/', recordController.createRecord)
router.patch('/:id', recordController.updateRecord)
router.delete('/:id', recordController.deleteRecord)

export default router
