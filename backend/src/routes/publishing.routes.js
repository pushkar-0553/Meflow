import express from 'express';
import { publishingController } from '../controllers/publishing.controller.js';
import { requireAuth } from '../middleware/session.js';
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

export default router;
