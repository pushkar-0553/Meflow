import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  campaign_name: z.string().optional().nullable(),
  course_code: z.string().min(2, 'Course code is required (e.g. ITNIK, FULLSTACK, DEVOPS)'),
  content_type: z.enum([
    'PROMOTIONAL_VIDEO',
    'REEL_SHORT',
    'STUDENT_SUCCESS_STORY',
    'WEBINAR_TEASER',
    'EVENT_COVERAGE',
    'GRAPHIC_BANNER',
  ]),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
  expected_duration_minutes: z.number().int().positive().optional().nullable(),
  location: z.string().default('VCube Studio'),
  proof_required: z.boolean().default(true),
  target_role_id: z.number().int().positive().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(3),
  campaign_name: z.string().optional().nullable(),
  course_code: z.string().min(2),
  content_type: z.enum([
    'PROMOTIONAL_VIDEO',
    'REEL_SHORT',
    'STUDENT_SUCCESS_STORY',
    'WEBINAR_TEASER',
    'EVENT_COVERAGE',
    'GRAPHIC_BANNER',
  ]),
  description: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  scheduled_start: z.string().optional().nullable(),
  scheduled_end: z.string().optional().nullable(),
  expected_duration_minutes: z.number().int().positive().optional().nullable(),
  location: z.string(),
  proof_required: z.boolean(),
});

const directAssignSchema = z.object({
  user_id: z.number().int().positive(),
});

export const taskController = {
  /**
   * POST /api/tasks
   * Create production task and initialize standard sequential workflow stages
   */
  async createTask(req, res, next) {
    try {
      const data = createTaskSchema.parse(req.body);

      // Load organizational roles to resolve standard stage target roles
      const roles = await query(`SELECT id, code FROM roles`);
      const roleMap = new Map(roles.map((r) => [r.code, r.id]));

      const cinematographerRoleId = data.target_role_id || roleMap.get('CINEMATOGRAPHER') || roleMap.get('ADMIN');
      const editorRoleId = roleMap.get('EDITOR') || roleMap.get('ADMIN');
      const managerRoleId = roleMap.get('PRODUCTION_MGR') || roleMap.get('ADMIN');
      const seoRoleId = roleMap.get('SEO') || roleMap.get('ADMIN');
      const socialRoleId = roleMap.get('SOCIAL_MEDIA_MGR') || roleMap.get('ADMIN');

      let createdTaskId;

      await transaction(async (conn) => {
        // 1. Insert parent task
        const [taskRes] = await conn.query(
          `INSERT INTO tasks (
            title, campaign_name, course_code, content_type, description, priority,
            status, scheduled_start, scheduled_end, expected_duration_minutes,
            location, proof_required, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, ?, ?, ?)`,
          [
            data.title.trim(),
            data.campaign_name || null,
            data.course_code.trim().toUpperCase(),
            data.content_type,
            data.description || null,
            data.priority,
            data.scheduled_start ? new Date(data.scheduled_start) : null,
            data.scheduled_end ? new Date(data.scheduled_end) : null,
            data.expected_duration_minutes || 120,
            data.location,
            data.proof_required,
            req.user?.id || 1,
          ]
        );
        createdTaskId = taskRes.insertId;

        // 2. Blueprint standard 6-stage content production pipeline
        const stageBlueprints = [
          { type: 'SHOOT', order: 1, roleId: cinematographerRoleId, status: 'READY', isGate: false },
          { type: 'RAW_FOOTAGE', order: 2, roleId: cinematographerRoleId, status: 'PENDING', isGate: false },
          { type: 'EDITING', order: 3, roleId: editorRoleId, status: 'PENDING', isGate: false },
          { type: 'FIRST_CUT', order: 4, roleId: managerRoleId, status: 'PENDING', isGate: true },
          { type: 'SEO', order: 5, roleId: seoRoleId, status: 'PENDING', isGate: false },
          { type: 'PUBLISHED', order: 6, roleId: socialRoleId, status: 'PENDING', isGate: false },
        ];

        for (const s of stageBlueprints) {
          await conn.query(
            `INSERT INTO task_stages (
              task_id, stage_type, sequence_order, target_role_id, status, is_approval_gate, version
            ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [createdTaskId, s.type, s.order, s.roleId, s.status, s.isGate]
          );
        }

        // 3. Audit Log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'TASK_CREATED', 'TASK', ?, ?, ?)`,
          [
            req.user?.id || null,
            createdTaskId,
            JSON.stringify({ title: data.title, course: data.course_code }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Production task '${data.title}' conceived with 6 sequential stages.`,
        data: {
          id: createdTaskId,
          title: data.title,
          course_code: data.course_code,
          status: 'AVAILABLE',
          initialStage: 'SHOOT (READY)',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/tasks
   * List tasks with filters, current active stage, and assignee info
   */
  async getAllTasks(req, res, next) {
    try {
      const { search, course_code, content_type, priority, status, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      const params = [];

      if (search && search.trim()) {
        conditions.push(`(LOWER(t.title) LIKE LOWER(?) OR LOWER(t.description) LIKE LOWER(?))`);
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      if (course_code) {
        conditions.push(`t.course_code = ?`);
        params.push(course_code.toUpperCase());
      }

      if (content_type) {
        conditions.push(`t.content_type = ?`);
        params.push(content_type);
      }

      if (priority) {
        conditions.push(`t.priority = ?`);
        params.push(priority);
      }

      if (status) {
        conditions.push(`t.status = ?`);
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await query(`SELECT COUNT(*) AS total FROM tasks t ${whereClause}`, params);
      const total = countResult[0]?.total || 0;

      const tasks = await query(
        `SELECT t.*, u.name AS creator_name,
                (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id AND status = 'APPROVED') AS completed_stages,
                (SELECT COUNT(*) FROM task_stages WHERE task_id = t.id) AS total_stages,
                (SELECT stage_type FROM task_stages WHERE task_id = t.id AND status IN ('READY', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED') ORDER BY sequence_order ASC LIMIT 1) AS active_stage_type,
                (SELECT status FROM task_stages WHERE task_id = t.id AND status IN ('READY', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED') ORDER BY sequence_order ASC LIMIT 1) AS active_stage_status
         FROM tasks t
         JOIN users u ON t.created_by = u.id
         ${whereClause}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return successResponse(res, {
        message: 'Production tasks retrieved successfully.',
        data: tasks,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/tasks/:id
   * Complete task detail with sequential stages, assignees, and proofs
   */
  async getTaskById(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Task ID.' });
      }

      const tasks = await query(
        `SELECT t.*, u.name AS creator_name, u.email AS creator_email
         FROM tasks t
         JOIN users u ON t.created_by = u.id
         WHERE t.id = ?`,
        [taskId]
      );

      if (!tasks || tasks.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task not found.' });
      }
      const task = tasks[0];

      // Fetch all stages in order
      const stages = await query(
        `SELECT ts.*, r.name AS target_role_name, r.code AS target_role_code,
                u.id AS assignee_id, u.name AS assignee_name, u.email AS assignee_email,
                tsa.status AS assignment_status, tsa.accepted_at, tsa.assignment_type
         FROM task_stages ts
         JOIN roles r ON ts.target_role_id = r.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         LEFT JOIN users u ON tsa.user_id = u.id
         WHERE ts.task_id = ?
         ORDER BY ts.sequence_order ASC`,
        [taskId]
      );

      // Fetch proofs for all stages of this task
      const proofs = await query(
        `SELECT p.*, u.name AS uploader_name
         FROM proofs p
         JOIN task_stages ts ON p.task_stage_id = ts.id
         JOIN users u ON p.uploaded_by = u.id
         WHERE ts.task_id = ?
         ORDER BY p.created_at DESC`,
        [taskId]
      );

      return successResponse(res, {
        message: `Task: ${task.title}`,
        data: {
          task,
          stages,
          proofs,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/tasks/:id
   * Update task core metadata
   */
  async updateTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Task ID.' });
      }

      const data = updateTaskSchema.parse(req.body);

      await query(
        `UPDATE tasks SET
          title = ?, campaign_name = ?, course_code = ?, content_type = ?,
          description = ?, priority = ?, scheduled_start = ?, scheduled_end = ?,
          expected_duration_minutes = ?, location = ?, proof_required = ?
         WHERE id = ?`,
        [
          data.title.trim(),
          data.campaign_name || null,
          data.course_code.trim().toUpperCase(),
          data.content_type,
          data.description || null,
          data.priority,
          data.scheduled_start ? new Date(data.scheduled_start) : null,
          data.scheduled_end ? new Date(data.scheduled_end) : null,
          data.expected_duration_minutes || 120,
          data.location,
          data.proof_required,
          taskId,
        ]
      );

      return successResponse(res, {
        message: `Task '${data.title}' updated successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/tasks/:id/cancel
   * Cancel task and abort any active child assignments
   */
  async cancelTask(req, res, next) {
    try {
      const taskId = parseInt(req.params.id, 10);
      if (isNaN(taskId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Task ID.' });
      }

      await transaction(async (conn) => {
        await conn.query(`UPDATE tasks SET status = 'CANCELLED' WHERE id = ?`, [taskId]);
        await conn.query(`UPDATE task_stages SET status = 'SKIPPED' WHERE task_id = ? AND status IN ('PENDING', 'READY')`, [taskId]);
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'TASK_CANCELLED', 'TASK', ?, ?)`,
          [req.user?.id || null, taskId, req.ip]
        );
      });

      return successResponse(res, {
        message: 'Task cancelled successfully.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/tasks/stages/:stageId/assign
   * Direct administrative assignment of a stage to a designated employee
   */
  async directAssignStage(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const { user_id } = directAssignSchema.parse(req.body);

      // Verify user exists and is active
      const users = await query(`SELECT id, name, email, status FROM users WHERE id = ?`, [user_id]);
      if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
        return errorResponse(res, { statusCode: 400, message: 'Assignee user does not exist or is inactive.' });
      }
      const assignee = users[0];

      // Verify stage exists
      const stages = await query(`SELECT id, task_id, status FROM task_stages WHERE id = ?`, [stageId]);
      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task stage not found.' });
      }
      const stage = stages[0];

      await transaction(async (conn) => {
        // Release any existing active assignment on this stage
        await conn.query(
          `UPDATE task_stage_assignments SET status = 'RELEASED', released_at = NOW()
           WHERE task_stage_id = ? AND status IN ('ACCEPTED', 'IN_PROGRESS')`,
          [stageId]
        );

        // Update stage status to IN_PROGRESS
        await conn.query(
          `UPDATE task_stages SET status = 'IN_PROGRESS', version = version + 1 WHERE id = ?`,
          [stageId]
        );

        // Update parent task status to IN_PROGRESS
        await conn.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?`, [stage.task_id]);

        // Insert new assignment
        await conn.query(
          `INSERT INTO task_stage_assignments (
            task_stage_id, user_id, assigned_by, assignment_type, status, accepted_at
          ) VALUES (?, ?, ?, 'ADMIN_DIRECT', 'ACCEPTED', NOW())`,
          [stageId, user_id, req.user?.id || null]
        );

        // Notify employee
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           VALUES (?, 'ASSIGNMENT_DIRECT', 'New Production Assignment', 'You have been assigned to a production stage by a manager.', 'STAGE', ?)`,
          [user_id, stageId]
        );

        // Audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'STAGE_DIRECT_ASSIGNED', 'STAGE', ?, ?, ?)`,
          [req.user?.id || null, stageId, JSON.stringify({ assignedTo: assignee.name, userId: user_id }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Stage assigned directly to ${assignee.name}.`,
      });
    } catch (error) {
      next(error);
    }
  },
};

