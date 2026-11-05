import { Router } from 'express';
import { thumbnailController } from '../controllers/thumbnail.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/:projectId', requirePermission(['thumbnail.manage', 'drafts.view']), thumbnailController.getProjectThumbnails);
router.post('/:projectId', requirePermission(['thumbnail.manage', 'drafts.view']), thumbnailController.submitThumbnail);
router.post('/:thumbnailId/review', requirePermission(['thumbnail.manage', 'review.approve']), thumbnailController.reviewThumbnail);

export default router;
