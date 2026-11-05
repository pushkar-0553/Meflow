import express from 'express';
import { publishingController } from '../controllers/publishing.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post(
  '/',
  requirePermission('publishing.publish'),
  publishingController.recordPublication
);

router.get(
  '/',
  requirePermission('publishing.view'),
  publishingController.listPublications
);

router.post(
  '/projects/:projectId/platform',
  requirePermission(['publishing.publish', 'publishing.manage']),
  publishingController.recordProjectPlatformPublish
);

router.post(
  '/projects/:projectId/complete',
  requirePermission(['publishing.publish', 'publishing.manage']),
  publishingController.completeProjectPublishing
);

export default router;

