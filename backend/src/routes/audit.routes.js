import express from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get(
  '/',
  requirePermission('audit.view'),
  auditController.getAuditLogs
);

router.get(
  '/actions-catalog',
  requirePermission('audit.view'),
  auditController.getActionsCatalog
);

export default router;

