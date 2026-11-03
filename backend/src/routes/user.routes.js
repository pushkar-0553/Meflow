import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('users.view'), userController.getAllUsers);
router.get('/:id', requirePermission('users.view'), userController.getUserById);
router.put('/:id', requirePermission('users.edit'), userController.updateUser);
router.patch('/:id/status', requirePermission('users.disable'), userController.toggleStatus);
router.post('/:id/resend-invite', requirePermission('users.create'), userController.resendInvitation);
router.delete('/:id', requirePermission('users.delete'), userController.deleteUser);

export default router;

