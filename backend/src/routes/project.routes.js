import { Router } from 'express';
import { projectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

// Drafts & Video Projects CRUD
router.post('/drafts', requirePermission('drafts.create'), projectController.createDraft);
router.get('/drafts', requirePermission('drafts.view'), projectController.getDrafts);
router.get('/:id', requirePermission('drafts.view'), projectController.getProjectById);
router.put('/drafts/:id', requirePermission('drafts.view'), projectController.updateDraft);
router.post('/drafts/:id/submit', requirePermission('drafts.submit'), projectController.submitDraftForContent);
router.get('/:id/timeline', requirePermission('drafts.view'), projectController.getProjectTimeline);

export default router;
