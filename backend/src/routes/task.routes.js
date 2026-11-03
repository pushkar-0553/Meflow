import { Router } from 'express';
import { taskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('tasks.view'), taskController.getAllTasks);
router.post('/', requirePermission('tasks.create'), taskController.createTask);
router.get('/:id', requirePermission('tasks.view'), taskController.getTaskById);
router.put('/:id', requirePermission('tasks.edit'), taskController.updateTask);
router.post('/:id/cancel', requirePermission('tasks.delete'), taskController.cancelTask);
router.post('/stages/:stageId/assign', requirePermission('tasks.assign'), taskController.directAssignStage);

export default router;

