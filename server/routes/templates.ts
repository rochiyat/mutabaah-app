import { Router } from 'express'
import * as templateController from '../controllers/templateController'
import { authenticate } from '../middleware/auth'

const router = Router()

router.use(authenticate)

// Izin dicek di controller. Memasang template ke halaqoh: POST /api/groups/:groupId/apply-template
router.get('/', templateController.getTemplates)
router.post('/', templateController.createTemplate)
router.patch('/:id', templateController.updateTemplate)
router.delete('/:id', templateController.deleteTemplate)

export default router
