import { Router } from 'express'
import * as noteController from '../controllers/noteController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Daftar & tulis catatan per halaqoh: lihat /api/groups/:groupId/notes
router.get('/mine', noteController.getMyNotes)
router.patch('/:id', noteController.updateNote)
router.delete('/:id', noteController.deleteNote)

export default router
