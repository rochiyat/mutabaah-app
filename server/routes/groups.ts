import { Router } from 'express';
import * as groupController from '../controllers/groupController';
import * as groupActivityController from '../controllers/groupActivityController';
import * as meetingController from '../controllers/meetingController';
import * as noteController from '../controllers/noteController';
import * as templateController from '../controllers/templateController';
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
router.patch('/:groupId/members/:userId', groupController.updateMember);
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

router.post('/:groupId/apply-template', templateController.applyTemplate);

// Catatan / evaluasi murabbi untuk anggota (ubah & hapus: lihat /api/notes)
router.get('/:groupId/notes', noteController.getGroupNotes);
router.post('/:groupId/notes', noteController.createNote);

// Pertemuan halaqoh (detail, absensi: lihat /api/meetings)
router.get('/:groupId/meetings', meetingController.getGroupMeetings);
router.post('/:groupId/meetings', meetingController.createGroupMeeting);

export default router;
