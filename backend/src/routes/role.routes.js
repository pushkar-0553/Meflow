import { Router } from 'express';
import { roleController } from '../controllers/role.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('roles.view'), roleController.getAllRoles);
router.post('/', requirePermission('roles.create'), roleController.createRole);
router.get('/:id', requirePermission('roles.view'), roleController.getRoleById);
router.put('/:id', requirePermission('roles.edit'), roleController.updateRole);
router.post('/:id/duplicate', requirePermission('roles.create'), roleController.duplicateRole);
router.delete('/:id', requirePermission('roles.delete'), roleController.deleteRole);

export default router;
