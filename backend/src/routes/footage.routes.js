import { Router } from 'express';
import { footageController } from '../controllers/footage.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/pending', requirePermission(['footage.receive', 'footage.handover', 'drafts.view']), footageController.getPendingHandovers);
router.post('/:projectId/handover', requirePermission(['footage.handover', 'cinematography.manage']), footageController.recordHandover);
router.post('/:projectId/receive', requirePermission(['footage.receive', 'cinematography.manage']), footageController.confirmReceipt);
router.post('/:projectId/copied', requirePermission(['footage.receive', 'cinematography.manage']), footageController.confirmCopied);
router.post('/:projectId/ready', requirePermission(['footage.receive', 'cinematography.manage']), footageController.markReadyForEditing);

export default router;

