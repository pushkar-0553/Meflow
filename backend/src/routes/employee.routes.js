import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/directory', requireAuth, employeeController.getDirectory);
router.get('/:employeeId', requireAuth, employeeController.getEmployeeById);
router.patch('/:employeeId', requireAuth, employeeController.updateEmployee);

export default router;

