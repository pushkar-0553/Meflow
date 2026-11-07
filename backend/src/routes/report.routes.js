import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { reportShareController } from '../controllers/reportShare.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Standard authenticated reports
router.get('/daily', requireAuth, reportController.getDailyReport);
router.get('/weekly', requireAuth, reportController.getWeeklyReport);
router.get('/monthly', requireAuth, reportController.getMonthlyReport);
router.get('/annual', requireAuth, reportController.getAnnualReport);
router.get('/eod', requireAuth, reportController.getEodReport);
router.get('/employee/:employeeId', requireAuth, reportController.getEmployeeReport);

// Dynamic Report Sharing
router.post('/share', requireAuth, reportShareController.createShare);
router.get('/share/:token', optionalAuth, reportShareController.getSharedReport);
router.delete('/share/:shareId', requireAuth, reportShareController.revokeShare);
router.get('/share/:shareId/access-logs', requireAuth, reportShareController.getAccessLogs);

export default router;

