import express from 'express';
import { workloadController } from '../controllers/workload.controller.js';
import { requireAuth } from '../middleware/session.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get(
  '/team',
  requirePermission('workload.view_all'),
  workloadController.getTeamWorkload
);

router.get(
  '/role-breakdown',
  requirePermission('workload.view_all'),
  workloadController.getRoleBreakdown
);

export default router;
