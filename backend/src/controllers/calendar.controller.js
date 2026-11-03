import { z } from 'zod';
import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const rescheduleSchema = z.object({
  scheduled_start: z.string().datetime(),
  scheduled_end: z.string().datetime().optional().nullable(),
  expected_duration_minutes: z.number().int().positive().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
});

export const calendarController = {
  /**
   * GET /api/calendar/events
   * Query scheduled shoots, edits, and milestones within date bounds
   */
  async getEvents(req, res, next) {
    try {
      const { start_date, end_date, role_id, mode = 'all' } = req.query;
      const userId = req.user?.id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      const params = [];
      let whereConditions = [];

      // Filter by personal assignments if mode === 'personal' or if user is non-admin without calendar.view_all
      if (mode === 'personal' || (!isAdmin && !req.effectivePermissions?.has('calendar.view_all'))) {
        whereConditions.push(`(tsa.user_id = ? OR t.created_by = ?)`);
        params.push(userId, userId);
      }

      // Date Range filter
      if (start_date) {
        whereConditions.push(`t.scheduled_start >= ?`);
        params.push(start_date);
      }
      if (end_date) {
        whereConditions.push(`t.scheduled_start <= ?`);
        params.push(end_date);
      }

      // Role filter
      if (role_id) {
        whereConditions.push(`ts.target_role_id = ?`);
        params.push(parseInt(role_id, 10));
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const events = await query(
        `SELECT DISTINCT
            t.id AS task_id, t.title AS task_title, t.course_code, t.content_type,
            t.priority, t.status AS task_status, t.location,
            t.scheduled_start, t.scheduled_end, t.expected_duration_minutes,
            ts.id AS current_stage_id, ts.stage_type, ts.status AS stage_status,
            r.name AS target_role_name,
            u.id AS assignee_id, u.name AS assignee_name
         FROM tasks t
         LEFT JOIN task_stages ts ON t.id = ts.task_id AND ts.status IN ('READY', 'IN_PROGRESS', 'SUBMITTED')
         LEFT JOIN roles r ON ts.target_role_id = r.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         LEFT JOIN users u ON tsa.user_id = u.id
         ${whereClause}
         ORDER BY t.scheduled_start ASC`,
        params
      );

      return successResponse(res, {
        message: 'Calendar schedule retrieved successfully.',
        data: events,
        meta: {
          count: events.length,
          mode,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/calendar/tasks/:id/reschedule
   * Update task shooting date, time slot, duration, or studio location
   */
  async rescheduleTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Task ID.' });
      }

      const data = rescheduleSchema.parse(req.body);
      const userId = req.user?.id;

      const tasks = await query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
      if (!tasks || tasks.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task not found.' });
      }
      const task = tasks[0];

      const start = new Date(data.scheduled_start);
      let end = data.scheduled_end ? new Date(data.scheduled_end) : null;
      if (!end && data.expected_duration_minutes) {
        end = new Date(start.getTime() + data.expected_duration_minutes * 60000);
      }

      await query(
        `UPDATE tasks
         SET scheduled_start = ?, scheduled_end = ?,
             expected_duration_minutes = COALESCE(?, expected_duration_minutes),
             location = COALESCE(?, location), updated_at = NOW()
         WHERE id = ?`,
        [start, end, data.expected_duration_minutes || null, data.location || null, taskId]
      );

      // Notify active assignees of the schedule change
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
         SELECT tsa.user_id, 'TASK_RESCHEDULED', 'Production Schedule Updated',
                CONCAT('Task "', ?, '" has been rescheduled to ', DATE_FORMAT(?, '%b %d, %Y %h:%i %p')),
                'TASK', ?
         FROM task_stages ts
         JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         WHERE ts.task_id = ?`,
        [task.title, start, taskId, taskId]
      );

      // Audit log
      await query(
        `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
         VALUES (?, 'TASK_RESCHEDULED', 'TASK', ?, ?, ?)`,
        [
          userId,
          taskId,
          JSON.stringify({
            previousStart: task.scheduled_start,
            newStart: start,
            location: data.location || task.location,
          }),
          req.ip,
        ]
      );

      return successResponse(res, {
        message: 'Task production schedule updated successfully.',
        data: {
          taskId,
          scheduledStart: start,
          scheduledEnd: end,
          location: data.location || task.location,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

