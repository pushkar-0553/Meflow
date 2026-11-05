import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const updateScriptSchema = z.object({
  google_docs_url: z.string().url('A valid Google Docs URL is required'),
  script_version: z.number().int().positive().default(1),
  content_notes: z.string().optional().nullable(),
});

const reviewScriptSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  comments: z.string().min(2, 'Review comments are required'),
});

export const contentController = {
  /**
   * GET /api/content/available
   * Fetch all video projects available for content writers to claim
   */
  async getAvailableScripts(req, res, next) {
    try {
      const scripts = await query(
        `SELECT vp.id AS project_id, vp.project_code, vp.title, vp.category, vp.priority,
                vp.proposed_shoot_date, vp.location_details,
                c.name AS course_name, c.code AS course_code,
                u.name AS creator_name,
                cs.status AS script_status, cs.created_at AS script_created_at
         FROM content_scripts cs
         JOIN video_projects vp ON cs.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         JOIN users u ON vp.created_by = u.id
         WHERE cs.status = 'AVAILABLE'
           AND vp.overall_status NOT IN ('CANCELLED', 'COMPLETED')
         ORDER BY vp.priority = 'URGENT' DESC, vp.priority = 'HIGH' DESC, vp.created_at ASC`
      );

      return successResponse(res, {
        message: 'Available scriptwriting pool retrieved successfully.',
        data: scripts,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/content/:projectId/accept
   * Content writer claims responsibility for drafting the script
   */
  async acceptScriptWork(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (isNaN(projectId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid project ID.' });
      }

      const writerId = req.user?.id;

      // Atomic conditional update
      let updated = false;
      await transaction(async (conn) => {
        const [resUpdate] = await conn.query(
          `UPDATE content_scripts
           SET writer_id = ?, status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
           WHERE video_project_id = ? AND status = 'AVAILABLE'`,
          [writerId, projectId]
        );

        if (resUpdate.affectedRows === 0) {
          throw new Error('This script has already been claimed by another writer or is not available.');
        }

        updated = true;

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'SCRIPT_WORK_ACCEPTED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [writerId, projectId, JSON.stringify({ writerId }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Script writing assignment claimed successfully. Open the workspace to link your Google Docs draft.',
      });
    } catch (error) {
      if (error.message.includes('already been claimed')) {
        return errorResponse(res, { statusCode: 409, message: error.message });
      }
      next(error);
    }
  },

  /**
   * POST /api/content/:projectId/start
   * Writer marks writing in progress
   */
  async startWriting(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const writerId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const scripts = await query(`SELECT * FROM content_scripts WHERE video_project_id = ?`, [projectId]);
      if (!scripts || scripts.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Script record not found.' });
      }
      const script = scripts[0];

      if (script.writer_id !== writerId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned content writer can start writing.' });
      }

      await query(
        `UPDATE content_scripts SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
         WHERE video_project_id = ?`,
        [projectId]
      );

      return successResponse(res, { message: 'Status updated to Writing in Progress.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/content/:projectId/script
   * Link Google Docs URL, script version, and content notes
   */
  async updateScriptDoc(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = updateScriptSchema.parse(req.body);
      const writerId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const scripts = await query(`SELECT * FROM content_scripts WHERE video_project_id = ?`, [projectId]);
      if (!scripts || scripts.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Script record not found.' });
      }
      const script = scripts[0];

      if (script.writer_id !== writerId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned content writer can update the script document.' });
      }

      await query(
        `UPDATE content_scripts SET
          google_docs_url = ?, script_version = ?, content_notes = ?,
          status = 'SCRIPT_READY', updated_at = NOW()
         WHERE video_project_id = ?`,
        [data.google_docs_url.trim(), data.script_version, data.content_notes || null, projectId]
      );

      return successResponse(res, {
        message: 'Google Docs script link saved. You can now submit it for review!',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/content/:projectId/submit
   * Submit script for approval (Moves to SUBMITTED state)
   */
  async submitScriptForReview(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const writerId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const scripts = await query(
        `SELECT cs.*, vp.title AS project_title
         FROM content_scripts cs
         JOIN video_projects vp ON cs.video_project_id = vp.id
         WHERE cs.video_project_id = ?`,
        [projectId]
      );
      if (!scripts || scripts.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Script record not found.' });
      }
      const script = scripts[0];

      if (!script.google_docs_url) {
        return errorResponse(res, { statusCode: 400, message: 'Please link a Google Docs URL before submitting for review.' });
      }

      if (script.writer_id !== writerId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned content writer can submit the script.' });
      }

      await transaction(async (conn) => {
        await conn.query(
          `UPDATE content_scripts SET status = 'SUBMITTED', submitted_at = NOW(), updated_at = NOW()
           WHERE video_project_id = ?`,
          [projectId]
        );

        // Notify DM Head, Creator, and Admins
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'SCRIPT_REVIEW_REQUIRED', 'Script Submitted for Approval',
                  CONCAT('Script submitted for video: ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('DM_HEAD', 'CONTENT_CREATOR', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [script.project_title, projectId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'SCRIPT_SUBMITTED_FOR_REVIEW', 'VIDEO_PROJECT', ?, ?, ?)`,
          [writerId, projectId, JSON.stringify({ docsUrl: script.google_docs_url, version: script.script_version }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Script successfully submitted for managerial review.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/content/:projectId/review
   * DM Head or Creator approves or requests changes to the script
   * If APPROVED -> Video transitions to Stage 3 (CINEMATOGRAPHY) and shoot becomes AVAILABLE
   */
  async reviewScript(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = reviewScriptSchema.parse(req.body);
      const reviewerId = req.user?.id;

      const scripts = await query(
        `SELECT cs.*, vp.title AS project_title, vp.current_stage
         FROM content_scripts cs
         JOIN video_projects vp ON cs.video_project_id = vp.id
         WHERE cs.video_project_id = ?`,
        [projectId]
      );
      if (!scripts || scripts.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Script record not found.' });
      }
      const script = scripts[0];

      if (data.decision === 'APPROVED') {
        await transaction(async (conn) => {
          // 1. Mark script APPROVED
          await conn.query(
            `UPDATE content_scripts SET
              status = 'APPROVED', approved_at = NOW(), reviewer_feedback = ?, updated_at = NOW()
             WHERE video_project_id = ?`,
            [data.comments, projectId]
          );

          // 2. Transition Video Project to CINEMATOGRAPHY
          await conn.query(
            `UPDATE video_projects SET
              current_stage = 'CINEMATOGRAPHY', updated_at = NOW()
             WHERE id = ?`,
            [projectId]
          );

          // 3. Mark Cinematography shoot AVAILABLE for cameramen to claim
          await conn.query(
            `UPDATE cinematography_shoots SET status = 'AVAILABLE', updated_at = NOW()
             WHERE video_project_id = ?`,
            [projectId]
          );

          // 4. Notify Cinematographers
          await conn.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
             SELECT u.id, 'SHOOT_AVAILABLE', 'New Video Ready for Shoot',
                    CONCAT('Script approved! Video is ready for cinematography: ', ?), 'VIDEO_PROJECT', ?
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE (r.code IN ('CINEMATOGRAPHER', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
               AND u.status = 'ACTIVE'`,
            [script.project_title, projectId]
          );

          // 5. Activity log
          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'SCRIPT_APPROVED_MOVED_TO_SHOOT', 'VIDEO_PROJECT', ?, ?, ?)`,
            [reviewerId, projectId, JSON.stringify({ comments: data.comments, stage: 'CINEMATOGRAPHY' }), req.ip]
          );
        });

        return successResponse(res, {
          message: 'Script approved! Video has progressed to Stage 3: Cinematography.',
          data: { current_stage: 'CINEMATOGRAPHY' },
        });
      } else {
        // Changes Requested
        await transaction(async (conn) => {
          await conn.query(
            `UPDATE content_scripts SET
              status = 'CHANGES_REQUESTED', reviewer_feedback = ?, updated_at = NOW()
             WHERE video_project_id = ?`,
            [data.comments, projectId]
          );

          if (script.writer_id) {
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               VALUES (?, 'SCRIPT_CHANGES_REQUESTED', 'Script Changes Requested', ?, 'VIDEO_PROJECT', ?)`,
              [script.writer_id, `Feedback on script '${script.project_title}': ${data.comments}`, projectId]
            );
          }

          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'SCRIPT_REWORK_REQUESTED', 'VIDEO_PROJECT', ?, ?, ?)`,
            [reviewerId, projectId, JSON.stringify({ comments: data.comments }), req.ip]
          );
        });

        return successResponse(res, {
          message: 'Modifications requested. Feedback sent to the content writer.',
          data: { status: 'CHANGES_REQUESTED' },
        });
      }
    } catch (error) {
      next(error);
    }
  },
};
