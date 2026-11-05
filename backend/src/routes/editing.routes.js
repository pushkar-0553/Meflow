import { Router } from 'express';
import { editingController } from '../controllers/editing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/available', requirePermission(['editing.accept', 'drafts.view']), editingController.getAvailableEditing);
router.post('/:projectId/accept', requirePermission(['editing.accept', 'production.manage']), editingController.acceptEditing);
router.post('/:projectId/assign', requirePermission('production.manage'), editingController.assignEditor);
router.post('/:projectId/start', requirePermission(['editing.accept', 'production.manage']), editingController.startEditing);
router.post('/:projectId/versions', requirePermission(['editing.submit', 'production.manage']), editingController.submitVersion);
router.post('/versions/:versionId/review', requirePermission(['review.approve', 'production.manage']), editingController.reviewVersionCut);

export default router;
