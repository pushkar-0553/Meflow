import { Router } from 'express';
import { contentController } from '../controllers/content.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/available', requirePermission('content.view'), contentController.getAvailableScripts);
router.post('/:projectId/accept', requirePermission('content.accept'), contentController.acceptScriptWork);
router.post('/:projectId/start', requirePermission('content.accept'), contentController.startWriting);
router.put('/:projectId/script', requirePermission('content.submit'), contentController.updateScriptDoc);
router.post('/:projectId/submit', requirePermission('content.submit'), contentController.submitScriptForReview);
router.post('/:projectId/review', requirePermission('content.approve'), contentController.reviewScript);

export default router;

