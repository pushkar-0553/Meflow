import { Router } from 'express';
import { courseController } from '../controllers/course.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', courseController.getAllCourses);
router.post('/', requirePermission('roles.manage'), courseController.createCourse);

export default router;
