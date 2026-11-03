import express from 'express';
import { calendarController } from '../controllers/calendar.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/calendar/events
 * View scheduled tasks and milestones
 */
router.get(
  '/events',
  requirePermission(['calendar.view_own', 'calendar.view_all']),
  calendarController.getEvents
);

/**
 * PATCH /api/calendar/tasks/:id/reschedule
 * Reschedule date, time slot, duration, or location
 */
router.patch(
  '/tasks/:id/reschedule',
  requirePermission('calendar.manage'),
  calendarController.rescheduleTask
);

export default router;

