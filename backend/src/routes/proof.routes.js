import express from 'express';
import { proofController } from '../controllers/proof.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/proofs
 * Submit a proof of work (Photo, Drive URL, Live Post, or Text Note)
 */
router.post(
  '/',
  requirePermission('proof.upload'),
  proofController.uploadProof
);

/**
 * GET /api/proofs/stage/:stageId
 * Get all proof deliverables and revisions for a stage
 */
router.get(
  '/stage/:stageId',
  requirePermission('proof.view'),
  proofController.getProofsByStage
);

/**
 * GET /api/proofs/signature
 * Get direct signed upload parameters for Cloudinary
 */
router.get(
  '/signature',
  requirePermission('proof.upload'),
  proofController.getUploadSignature
);

/**
 * DELETE /api/proofs/:id
 * Remove an uploaded proof
 */
router.delete(
  '/:id',
  requirePermission('proof.delete'),
  proofController.deleteProof
);

export default router;

