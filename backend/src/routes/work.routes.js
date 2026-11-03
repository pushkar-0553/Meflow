import { Router } from 'express';
import { workController } from '../controllers/work.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/available', requirePermission('work.pool_view'), workController.getAvailableWork);
router.post('/:stageId/accept', requirePermission('work.accept'), workController.acceptWork);
router.post('/:stageId/reject', requirePermission('work.reject'), workController.rejectWork);
router.post('/:stageId/start', requirePermission('work.start'), workController.startWork);
router.get('/my-bucket', workController.getMyBucket);

export default router;

