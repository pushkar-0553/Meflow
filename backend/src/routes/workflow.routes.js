import express from 'express';
import { workflowController } from '../controllers/workflow.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

// All workflow transition endpoints require an authenticated active session
router.use(requireAuth);

/**
 * GET /api/workflow/pending-reviews
 * Retrieve all cuts currently in SUBMITTED state awaiting review
 */
router.get(
  '/pending-reviews',
  requirePermission(['approval.review', 'approval.approve']),
  workflowController.getPendingReviews
);

/**
 * POST /api/workflow/stages/:stageId/complete
 * Mark stage finished (advances to SUBMITTED if approval gate, or APPROVED and unlocks next stage)
 */
router.post(
  '/stages/:stageId/complete',
  requirePermission('work.complete'),
  workflowController.completeStage
);

/**
 * POST /api/workflow/stages/:stageId/review
 * Manager decision gate (APPROVED or CHANGES_REQUESTED)
 */
router.post(
  '/stages/:stageId/review',
  requirePermission(['approval.review', 'approval.approve']),
  workflowController.reviewStage
);

/**
 * POST /api/workflow/stages/:stageId/rollback
 * Admin/Manager rollback of a stage to READY
 */
router.post(
  '/stages/:stageId/rollback',
  requirePermission(['production.rollback', 'production.manage']),
  workflowController.rollbackStage
);

export default router;

