import { Router } from 'express';
import { shootController } from '../controllers/shoot.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/available', requirePermission(['cinematography.accept', 'cinematography.manage', 'drafts.view']), shootController.getAvailableShoots);
router.post('/:projectId/accept', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.acceptShoot);
router.post('/:projectId/assign', requirePermission('cinematography.manage'), shootController.assignShoot);
router.post('/:projectId/start', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.startShoot);
router.put('/:projectId/details', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.updateShootDetails);
router.post('/:shootId/team', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.addTeamMember);
router.delete('/:shootId/team/:memberId', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.removeTeamMember);
router.post('/:shootId/scenes', requirePermission(['shots.log', 'cinematography.manage']), shootController.addScene);
router.delete('/scenes/:sceneId', requirePermission(['shots.log', 'cinematography.manage']), shootController.deleteScene);
router.post('/scenes/:sceneId/shots', requirePermission(['shots.log', 'cinematography.manage']), shootController.logShot);
router.patch('/shots/:shotId/status', requirePermission(['shots.log', 'cinematography.manage']), shootController.updateShotStatus);
router.delete('/shots/:shotId', requirePermission(['shots.log', 'cinematography.manage']), shootController.deleteShot);
router.post('/:projectId/complete', requirePermission(['cinematography.accept', 'cinematography.manage']), shootController.completeShoot);

export default router;
