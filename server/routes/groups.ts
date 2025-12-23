import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import * as groupActivityController from '../controllers/groupActivityController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Group routes
router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroupById);
router.patch('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

// Member routes
router.get('/:groupId/members', groupController.getMembers);
router.post('/:groupId/members', groupController.addMember);
router.delete('/:groupId/members/:userId', groupController.removeMember);

// Group Activity routes
router.get('/:groupId/activities', groupActivityController.getGroupActivities);
router.post('/:groupId/activities', groupActivityController.addActivity);
router.patch(
  '/:groupId/activities/:activityId',
  groupActivityController.updateActivity
);
router.delete(
  '/:groupId/activities/:activityId',
  groupActivityController.removeActivity
);

export default router;
