import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const workController = {
  /**
   * GET /api/work/available
   * Fetch unassigned task stages ready for pickup matching user's role
   */
  async getAvailableWork(req, res, next) {
    try {
      const userRoleId = req.user?.role_id;
      const roleCode = req.user?.role_code;
      const isAdmin = Boolean(req.user?.is_system_admin || roleCode === 'ADMIN' || roleCode === 'DM_HEAD');

      // Admins see all available work; regular staff see work targeted to their role
      const roleFilter = isAdmin ? '' : 'AND ts.target_role_id = ?';
      const roleParams = isAdmin ? [] : [userRoleId];

      const availableStages = await query(
        `SELECT ts.id AS stage_id, ts.task_id, ts.stage_type, ts.sequence_order,
                ts.status AS stage_status, ts.version, ts.created_at AS stage_created_at,
                t.title AS task_title, t.course_code, t.content_type, t.priority,
                t.scheduled_start, t.scheduled_end, t.expected_duration_minutes,
                t.location, t.proof_required,
                r.name AS target_role_name, r.code AS target_role_code,
                FALSE AS is_video_project
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         JOIN roles r ON ts.target_role_id = r.id
         WHERE ts.status = 'READY'
           AND t.status NOT IN ('CANCELLED', 'COMPLETED')
           ${roleFilter}
         ORDER BY t.priority = 'URGENT' DESC, t.priority = 'HIGH' DESC, t.scheduled_start ASC`,
        roleParams
      );

      // Fetch Video Production Stages Available for Claiming
      const videoPool = [];

      // 1. Scripting Pool (Writers & Managers)
      if (isAdmin || roleCode === 'CONTENT_WRITER') {
        const scripts = await query(
          `SELECT cs.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                  c.code AS course_code, c.name AS course_name, vp.priority,
                  'CONTENT_WRITING' AS stage_type, 'Content Writer' AS target_role_name,
                  vp.proposed_shoot_date AS scheduled_start, vp.location_details AS location,
                  'AVAILABLE' AS stage_status, TRUE AS is_video_project
           FROM content_scripts cs
           JOIN video_projects vp ON cs.video_project_id = vp.id
           JOIN courses c ON vp.course_id = c.id
           WHERE cs.status = 'AVAILABLE' AND vp.current_stage = 'CONTENT_WRITING'`
        );
        videoPool.push(...scripts);
      }

      // 2. Cinematography Shoots Pool (Cameramen & Managers)
      if (isAdmin || roleCode === 'CINEMATOGRAPHER') {
        const shoots = await query(
          `SELECT csh.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                  c.code AS course_code, c.name AS course_name, vp.priority,
                  'CINEMATOGRAPHY' AS stage_type, 'Cinematographer' AS target_role_name,
                  vp.proposed_shoot_date AS scheduled_start, vp.location_details AS location,
                  'AVAILABLE' AS stage_status, TRUE AS is_video_project
           FROM cinematography_shoots csh
           JOIN video_projects vp ON csh.video_project_id = vp.id
           JOIN courses c ON vp.course_id = c.id
           WHERE csh.status = 'AVAILABLE' AND vp.current_stage = 'CINEMATOGRAPHY'`
        );
        videoPool.push(...shoots);
      }

      // 3. Video Editing Pool (Editors & Managers)
      if (isAdmin || roleCode === 'EDITOR') {
        const edits = await query(
          `SELECT ea.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                  c.code AS course_code, c.name AS course_name, vp.priority,
                  'VIDEO_EDITING' AS stage_type, 'Video Editor' AS target_role_name,
                  vp.proposed_shoot_date AS scheduled_start, vp.location_details AS location,
                  'AVAILABLE' AS stage_status, TRUE AS is_video_project
           FROM editing_assignments ea
           JOIN video_projects vp ON ea.video_project_id = vp.id
           JOIN courses c ON vp.course_id = c.id
           WHERE ea.status = 'AVAILABLE' AND vp.current_stage = 'VIDEO_EDITING'`
        );
        videoPool.push(...edits);
      }

      // 4. Thumbnail Design Pool (Designers & Managers)
      if (isAdmin || roleCode === 'DESIGNER' || roleCode === 'PHOTOGRAPHER') {
        const thumbs = await query(
          `SELECT tn.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                  c.code AS course_code, c.name AS course_name, vp.priority,
                  'THUMBNAIL_PREP' AS stage_type, 'Graphic Designer' AS target_role_name,
                  vp.proposed_shoot_date AS scheduled_start, vp.location_details AS location,
                  'AVAILABLE' AS stage_status, TRUE AS is_video_project
           FROM thumbnails tn
           JOIN video_projects vp ON tn.video_project_id = vp.id
           JOIN courses c ON vp.course_id = c.id
           WHERE tn.status IN ('DRAFT', 'CHANGES_REQUESTED') AND vp.current_stage = 'THUMBNAIL_PREP'`
        );
        videoPool.push(...thumbs);
      }

      const combined = [...videoPool, ...availableStages];

      return successResponse(res, {
        message: 'Available work pool retrieved successfully.',
        data: combined,
        meta: {
          count: combined.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/work/:stageId/accept
   * Mandatory Concurrency-Safe Atomic Acceptance (Section 18)
   */
  async acceptWork(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const userId = req.user?.id;
      const userRoleId = req.user?.role_id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      // 1. Fetch current stage metadata and optimistic version
      const stages = await query(
        `SELECT ts.id, ts.task_id, ts.stage_type, ts.target_role_id, ts.status, ts.version, t.title
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         WHERE ts.id = ?`,
        [stageId]
      );

      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task stage not found.' });
      }
      const stage = stages[0];

      // 2. Role Eligibility Check
      if (!isAdmin && stage.target_role_id !== userRoleId) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'ROLE_MISMATCH',
          message: 'This stage requires a different specialized role.',
        });
      }

      if (stage.status !== 'READY') {
        return errorResponse(res, {
          statusCode: 409,
          code: 'STAGE_NOT_AVAILABLE',
          message: `This task stage is currently ${stage.status.toLowerCase()} and cannot be accepted.`,
        });
      }

      // 3. ATOMIC CONDITIONAL UPDATE & CONCURRENCY TRANSACTION
      let success = false;

      await transaction(async (conn) => {
        // Atomic conditional lock matching exact version & status
        const [updateRes] = await conn.query(
          `UPDATE task_stages
           SET status = 'IN_PROGRESS',
               version = version + 1,
               started_at = COALESCE(started_at, NOW()),
               updated_at = NOW()
           WHERE id = ? AND status = 'READY' AND version = ?`,
          [stageId, stage.version]
        );

        // If affectedRows === 0, another concurrent request won the race condition!
        if (updateRes.affectedRows === 0) {
          throw new Error('CONCURRENCY_CONFLICT');
        }

        // Insert assignment record (guaranteed single active assignee)
        await conn.query(
          `INSERT INTO task_stage_assignments (
            task_stage_id, user_id, assigned_by, assignment_type, status, accepted_at
          ) VALUES (?, ?, NULL, 'SELF_CLAIM', 'ACCEPTED', NOW())`,
          [stageId, userId]
        );

        // Update parent task status to IN_PROGRESS
        await conn.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?`, [stage.task_id]);

        // Audit Log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'STAGE_ACCEPTED', 'STAGE', ?, ?, ?)`,
          [userId, stageId, JSON.stringify({ taskTitle: stage.title, stageType: stage.stage_type }), req.ip]
        );

        success = true;
      }).catch((err) => {
        if (err.message === 'CONCURRENCY_CONFLICT') {
          return errorResponse(res, {
            statusCode: 409,
            code: 'TASK_ALREADY_ASSIGNED',
            message: 'This task has just been claimed by another team member.',
          });
        }
        throw err;
      });

      if (success) {
        return successResponse(res, {
          message: `You have successfully accepted '${stage.title}' (${stage.stage_type}). Moved to My Bucket.`,
          data: {
            stageId,
            taskId: stage.task_id,
            status: 'IN_PROGRESS',
          },
        });
      }
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/work/:stageId/reject
   * Release an accepted task stage back to the available pool
   */
  async rejectWork(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      const userId = req.user?.id;

      const activeAssignment = await query(
        `SELECT id FROM task_stage_assignments
         WHERE task_stage_id = ? AND user_id = ? AND status IN ('ACCEPTED', 'IN_PROGRESS')`,
        [stageId, userId]
      );

      if (!activeAssignment || activeAssignment.length === 0) {
        return errorResponse(res, {
          statusCode: 400,
          message: 'You are not the active assignee of this stage.',
        });
      }

      await transaction(async (conn) => {
        // Release assignment
        await conn.query(
          `UPDATE task_stage_assignments SET status = 'RELEASED', released_at = NOW() WHERE id = ?`,
          [activeAssignment[0].id]
        );

        // Revert stage to READY so others can claim it
        await conn.query(
          `UPDATE task_stages SET status = 'READY', version = version + 1 WHERE id = ?`,
          [stageId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'STAGE_RELEASED', 'STAGE', ?, ?)`,
          [userId, stageId, req.ip]
        );
      });

      return successResponse(res, {
        message: 'Assignment released back to the Available Work pool.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/work/:stageId/start
   * Mark stage as explicitly IN_PROGRESS
   */
  async startWork(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      const userId = req.user?.id;

      await query(
        `UPDATE task_stages SET started_at = COALESCE(started_at, NOW()) WHERE id = ?`,
        [stageId]
      );

      await query(
        `UPDATE task_stage_assignments SET status = 'IN_PROGRESS'
         WHERE task_stage_id = ? AND user_id = ? AND status = 'ACCEPTED'`,
        [stageId, userId]
      );

      return successResponse(res, {
        message: 'Work execution started. Timer recorded.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/work/my-bucket
   * Retrieve all personal assignments for authenticated employee
   */
  async getMyBucket(req, res, next) {
    try {
      const userId = req.user?.id;
      const { filter = 'all' } = req.query; // all, today, in_progress, completed, delayed

      let filterSql = '';
      if (filter === 'today') {
        filterSql = `AND DATE(t.scheduled_start) = CURDATE()`;
      } else if (filter === 'in_progress') {
        filterSql = `AND ts.status IN ('ACCEPTED', 'IN_PROGRESS')`;
      } else if (filter === 'completed') {
        filterSql = `AND ts.status = 'APPROVED'`;
      } else if (filter === 'delayed') {
        filterSql = `AND t.scheduled_end < NOW() AND ts.status NOT IN ('APPROVED', 'SUBMITTED')`;
      }

      const bucketItems = await query(
        `SELECT ts.id AS stage_id, ts.task_id, ts.stage_type, ts.sequence_order,
                ts.status AS stage_status, ts.is_approval_gate, ts.started_at, ts.completed_at,
                tsa.status AS assignment_status, tsa.accepted_at, tsa.assignment_type,
                t.title AS task_title, t.course_code, t.content_type, t.priority,
                t.scheduled_start, t.scheduled_end, t.expected_duration_minutes,
                t.location, t.proof_required,
                FALSE AS is_video_project,
                (SELECT COUNT(*) FROM proofs WHERE task_stage_id = ts.id) AS proof_count,
                (SELECT rework_comments FROM stage_approvals WHERE task_stage_id = ts.id AND decision = 'CHANGES_REQUESTED' ORDER BY id DESC LIMIT 1) AS rework_comments
         FROM task_stage_assignments tsa
         JOIN task_stages ts ON tsa.task_stage_id = ts.id
         JOIN tasks t ON ts.task_id = t.id
         WHERE tsa.user_id = ?
           AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS', 'COMPLETED')
           ${filterSql}
         ORDER BY ts.status = 'IN_PROGRESS' DESC, t.scheduled_start ASC`,
        [userId]
      );

      // Fetch Video Projects assigned to or authored by this user
      const videoItems = [];

      // 1. Scripting assignments
      const scripts = await query(
        `SELECT cs.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                c.code AS course_code, vp.category AS content_type, vp.priority,
                'CONTENT_WRITING' AS stage_type, cs.status AS stage_status,
                cs.accepted_at, vp.proposed_shoot_date AS scheduled_start,
                vp.location_details AS location, TRUE AS is_video_project,
                cs.content_notes AS notes
         FROM content_scripts cs
         JOIN video_projects vp ON cs.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         WHERE cs.writer_id = ? AND vp.overall_status NOT IN ('CANCELLED')`,
        [userId]
      );
      videoItems.push(...scripts);

      // 2. Cinematography assignments (Lead or Crew)
      const shoots = await query(
        `SELECT csh.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                c.code AS course_code, vp.category AS content_type, vp.priority,
                'CINEMATOGRAPHY' AS stage_type, csh.status AS stage_status,
                csh.accepted_at, vp.proposed_shoot_date AS scheduled_start,
                vp.location_details AS location, TRUE AS is_video_project,
                csh.shoot_notes AS notes
         FROM cinematography_shoots csh
         JOIN video_projects vp ON csh.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         WHERE (csh.lead_cinematographer_id = ? OR EXISTS (
           SELECT 1 FROM cinematography_team_members ctm WHERE ctm.shoot_id = csh.id AND ctm.user_id = ?
         ))
           AND vp.overall_status NOT IN ('CANCELLED')`,
        [userId, userId]
      );
      videoItems.push(...shoots);

      // 3. Editing assignments
      const edits = await query(
        `SELECT ea.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                c.code AS course_code, vp.category AS content_type, vp.priority,
                'VIDEO_EDITING' AS stage_type, ea.status AS stage_status,
                ea.accepted_at, vp.proposed_shoot_date AS scheduled_start,
                vp.location_details AS location, TRUE AS is_video_project,
                NULL AS notes
         FROM editing_assignments ea
         JOIN video_projects vp ON ea.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         WHERE ea.editor_id = ? AND vp.overall_status NOT IN ('CANCELLED')`,
        [userId]
      );
      videoItems.push(...edits);

      // 4. Drafts created by user in DRAFT_PLANNING
      const drafts = await query(
        `SELECT vp.id AS stage_id, vp.id AS project_id, vp.project_code, vp.title AS task_title,
                c.code AS course_code, vp.category AS content_type, vp.priority,
                'DRAFT_PLANNING' AS stage_type, 'DRAFT' AS stage_status,
                vp.created_at AS accepted_at, vp.proposed_shoot_date AS scheduled_start,
                vp.location_details AS location, TRUE AS is_video_project,
                vp.description AS notes
         FROM video_projects vp
         JOIN courses c ON vp.course_id = c.id
         WHERE vp.created_by = ? AND vp.current_stage = 'DRAFT_PLANNING'`,
        [userId]
      );
      videoItems.push(...drafts);

      const combinedBucket = [...videoItems, ...bucketItems];

      return successResponse(res, {
        message: 'Personal work bucket retrieved successfully.',
        data: combinedBucket,
        meta: {
          count: combinedBucket.length,
          filter,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

