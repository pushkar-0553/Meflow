import { Router } from 'express';
import { permissionController } from '../controllers/permission.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', permissionController.getAllPermissions);
router.get('/users/:userId', requirePermission('permissions.view'), permissionController.getUserPermissions);
router.put('/users/:userId', requirePermission('permissions.override'), permissionController.updateUserPermissions);

export default router;

