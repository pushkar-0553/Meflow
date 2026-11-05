import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const submitVersionSchema = z.object({
  cut_type: z.enum(['FIRST_CUT', 'ROUGH_CUT', 'REWORK_CUT', 'FINAL_CUT']),
  cut_video_url: z.string().url('A valid video review URL is required (e.g. Drive, Frame.io, Cloudinary)'),
  duration_seconds: z.number().int().positive().optional().nullable(),
  editor_notes: z.string().optional().nullable(),
});

const reviewDecisionSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  comments: z.string().min(2, 'Review comments are required'),
  rework_notes: z.string().optional().nullable(),
});

export const editingController = {
  /**
   * GET /api/editing/available
   * Fetch projects ready for video editors to claim
   */
  async getAvailableEditing(req, res, next) {
    try {
      const records = await query(
        `SELECT ea.id AS assignment_id, ea.status AS assignment_status,
                vp.id AS project_id, vp.project_code, vp.title, vp.category, vp.priority,
                vp.proposed_shoot_date, c.name AS course_name,
                cs.google_docs_url,
                fh.storage_media_identifier, fh.footage_folder_name, fh.footage_storage_url
         FROM editing_assignments ea
         JOIN video_projects vp ON ea.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         LEFT JOIN content_scripts cs ON vp.id = cs.video_project_id
         LEFT JOIN footage_handovers fh ON vp.id = fh.video_project_id
         WHERE ea.status = 'AVAILABLE'
           AND vp.current_stage = 'VIDEO_EDITING'
         ORDER BY vp.priority = 'URGENT' DESC, vp.created_at ASC`
      );

      return successResponse(res, {
        message: 'Available editing pool retrieved successfully.',
        data: records,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/editing/:projectId/accept
   * Atomic Claim by Video Editor
   */
  async acceptEditing(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const editorId = req.user?.id;

      await transaction(async (conn) => {
        const [updateRes] = await conn.query(
          `UPDATE editing_assignments
           SET editor_id = ?, status = 'ACCEPTED', accepted_at = NOW(),
               version = version + 1, updated_at = NOW()
           WHERE video_project_id = ? AND status = 'AVAILABLE'`,
          [editorId, projectId]
        );

        if (updateRes.affectedRows === 0) {
          throw new Error('This editing assignment has already been claimed or is not available.');
        }

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'EDITING_ASSIGNMENT_CLAIMED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [editorId, projectId, JSON.stringify({ editorId }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Editing assignment successfully claimed. Ready to start editing.',
      });
    } catch (error) {
      if (error.message.includes('already been claimed')) {
        return errorResponse(res, { statusCode: 409, message: error.message });
      }
      next(error);
    }
  },

  /**
   * POST /api/editing/:projectId/assign
   * Managerial manual assignment
   */
  async assignEditor(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const { user_id } = z.object({ user_id: z.number().int().positive() }).parse(req.body);
      const managerId = req.user?.id;

      await transaction(async (conn) => {
        await conn.query(
          `INSERT INTO editing_assignments (video_project_id, editor_id, status, accepted_at)
           VALUES (?, ?, 'ACCEPTED', NOW())
           ON DUPLICATE KEY UPDATE editor_id = VALUES(editor_id), status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()`,
          [projectId, user_id]
        );

        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           VALUES (?, 'EDITING_ASSIGNED', 'New Video Editing Assignment', 'You have been assigned to edit this project.', 'VIDEO_PROJECT', ?)`,
          [user_id, projectId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'EDITING_MANAGERIAL_ASSIGNED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [managerId, projectId, JSON.stringify({ editorId: user_id }), req.ip]
        );
      });

      return successResponse(res, { message: 'Video editor assigned successfully.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/editing/:projectId/start
   * Editor marks editing actively started
   */
  async startEditing(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const editorId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const assignments = await query(`SELECT * FROM editing_assignments WHERE video_project_id = ?`, [projectId]);
      if (!assignments || assignments.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Editing assignment not found.' });
      }
      const assignment = assignments[0];

      if (assignment.editor_id !== editorId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned editor can start this task.' });
      }

      await query(
        `UPDATE editing_assignments SET
          status = 'EDITING_IN_PROGRESS',
          editing_started_at = COALESCE(editing_started_at, NOW()),
          updated_at = NOW()
         WHERE id = ?`,
        [assignment.id]
      );

      return successResponse(res, { message: 'Editing marked in progress.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/editing/:projectId/versions
   * Editor submits a versioned cut (First Cut, Rough Cut, Rework, Final Cut)
   */
  async submitVersion(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = submitVersionSchema.parse(req.body);
      const editorId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const assignments = await query(
        `SELECT ea.*, vp.title AS project_title
         FROM editing_assignments ea
         JOIN video_projects vp ON ea.video_project_id = vp.id
         WHERE ea.video_project_id = ?`,
        [projectId]
      );
      if (!assignments || assignments.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Editing assignment not found.' });
      }
      const assignment = assignments[0];

      if (assignment.editor_id !== editorId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned editor can submit cuts.' });
      }

      let versionId;
      await transaction(async (conn) => {
        // Calculate next version number
        const [verRows] = await conn.query(
          `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
           FROM editing_versions WHERE editing_assignment_id = ?`,
          [assignment.id]
        );
        const nextVersion = verRows[0].next_version;

        // Insert new version
        const [insertRes] = await conn.query(
          `INSERT INTO editing_versions (
            editing_assignment_id, version_number, cut_type, cut_video_url, duration_seconds, editor_notes
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            assignment.id,
            nextVersion,
            data.cut_type,
            data.cut_video_url.trim(),
            data.duration_seconds || null,
            data.editor_notes || null,
          ]
        );
        versionId = insertRes.insertId;

        // Update assignment status
        await conn.query(
          `UPDATE editing_assignments SET
            status = 'UNDER_REVIEW',
            updated_at = NOW()
           WHERE id = ?`,
          [assignment.id]
        );

        // Advance project stage to REVIEW_APPROVAL
        await conn.query(
          `UPDATE video_projects SET
            current_stage = 'REVIEW_APPROVAL',
            overall_status = 'UNDER_REVIEW',
            updated_at = NOW()
           WHERE id = ?`,
          [projectId]
        );

        // Notify DM Head & Content Creator
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'VIDEO_CUT_SUBMITTED', 'Video Cut Ready for Review',
                  CONCAT(?, ' (v', ?, ') submitted for review on: ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('DM_HEAD', 'CONTENT_CREATOR', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [data.cut_type, nextVersion, assignment.project_title, projectId]
        );

        // Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'VIDEO_CUT_SUBMITTED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [
            editorId,
            projectId,
            JSON.stringify({
              versionId,
              versionNumber: nextVersion,
              cutType: data.cut_type,
              url: data.cut_video_url,
            }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: `${data.cut_type} submitted for review! Video moved to Stage 6: Review & Approval.`,
        data: { version_id: versionId, current_stage: 'REVIEW_APPROVAL' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/editing/versions/:versionId/review
   * Review Gate Sign-off (Stage 6)
   * If APPROVED and FINAL_CUT -> Moves to Stage 7 (THUMBNAIL_PREP)
   * If CHANGES_REQUESTED -> Returns to editor with mandatory feedback
   */
  async reviewVersionCut(req, res, next) {
    try {
      const versionId = parseInt(req.params.versionId, 10);
      const data = reviewDecisionSchema.parse(req.body);
      const reviewerId = req.user?.id;

      const versions = await query(
        `SELECT ev.*, ea.id AS assignment_id, ea.video_project_id, ea.editor_id,
                vp.title AS project_title
         FROM editing_versions ev
         JOIN editing_assignments ea ON ev.editing_assignment_id = ea.id
         JOIN video_projects vp ON ea.video_project_id = vp.id
         WHERE ev.id = ?`,
        [versionId]
      );
      if (!versions || versions.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Editing version record not found.' });
      }
      const version = versions[0];
      const projectId = version.video_project_id;

      await transaction(async (conn) => {
        // 1. Record review decision
        await conn.query(
          `INSERT INTO video_reviews (
            editing_version_id, reviewer_id, decision, review_comments, rework_required_notes
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            versionId,
            reviewerId,
            data.decision,
            data.comments.trim(),
            data.rework_notes?.trim() || null,
          ]
        );

        if (data.decision === 'APPROVED') {
          if (version.cut_type === 'FINAL_CUT') {
            // Final Cut Approved -> Advance to Stage 7: THUMBNAIL_PREP
            await conn.query(
              `UPDATE editing_assignments SET
                status = 'COMPLETED',
                completed_at = NOW(),
                updated_at = NOW()
               WHERE id = ?`,
              [version.assignment_id]
            );

            await conn.query(
              `UPDATE video_projects SET
                current_stage = 'THUMBNAIL_PREP',
                overall_status = 'ACTIVE',
                updated_at = NOW()
               WHERE id = ?`,
              [projectId]
            );

            // Initialize thumbnail record
            await conn.query(
              `INSERT INTO thumbnails (video_project_id, thumbnail_url, version_number, status)
               VALUES (?, 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', 1, 'DRAFT')
               ON DUPLICATE KEY UPDATE updated_at = NOW()`,
              [projectId]
            );

            // Notify designers
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               SELECT u.id, 'THUMBNAIL_PREP_REQUIRED', 'Final Cut Approved - Thumbnails Required',
                      CONCAT('Final cut approved for: ', ?, '. Ready for high-CTR thumbnails and packaging.'), 'VIDEO_PROJECT', ?
               FROM users u
               JOIN roles r ON u.role_id = r.id
               WHERE (r.code IN ('DESIGNER', 'PHOTOGRAPHER', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
                 AND u.status = 'ACTIVE'`,
              [version.project_title, projectId]
            );
          } else {
            // Intermediate cut approved -> editor can proceed to next/final cut
            await conn.query(
              `UPDATE editing_assignments SET
                status = 'EDITING_IN_PROGRESS',
                updated_at = NOW()
               WHERE id = ?`,
              [version.assignment_id]
            );

            await conn.query(
              `UPDATE video_projects SET
                current_stage = 'VIDEO_EDITING',
                overall_status = 'ACTIVE',
                updated_at = NOW()
               WHERE id = ?`,
              [projectId]
            );
          }

          // Activity log
          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'VIDEO_CUT_APPROVED', 'VIDEO_PROJECT', ?, ?, ?)`,
            [
              reviewerId,
              projectId,
              JSON.stringify({
                versionId,
                cutType: version.cut_type,
                stage: version.cut_type === 'FINAL_CUT' ? 'THUMBNAIL_PREP' : 'VIDEO_EDITING',
              }),
              req.ip,
            ]
          );
        } else {
          // CHANGES_REQUESTED -> Return to editor
          await conn.query(
            `UPDATE editing_assignments SET
              status = 'CHANGES_REQUESTED',
              updated_at = NOW()
             WHERE id = ?`,
            [version.assignment_id]
          );

          await conn.query(
            `UPDATE video_projects SET
              current_stage = 'VIDEO_EDITING',
              overall_status = 'CHANGES_REQUESTED',
              updated_at = NOW()
             WHERE id = ?`,
            [projectId]
          );

          // Notify editor
          if (version.editor_id) {
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               VALUES (?, 'CUT_CHANGES_REQUESTED', 'Rework Required on Video Cut',
                      CONCAT('Rework requested on v', ?, ' of ', ?, ': ', ?), 'VIDEO_PROJECT', ?)`,
              [version.editor_id, version.version_number, version.project_title, data.comments, projectId]
            );
          }

          // Activity log
          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'VIDEO_CUT_REWORK_REQUESTED', 'VIDEO_PROJECT', ?, ?, ?)`,
            [reviewerId, projectId, JSON.stringify({ versionId, comments: data.comments }), req.ip]
          );
        }
      });

      return successResponse(res, {
        message:
          data.decision === 'APPROVED'
            ? version.cut_type === 'FINAL_CUT'
              ? 'Final cut approved! Video moved to Stage 7: Thumbnail & Assets.'
              : 'Cut approved! Editor may proceed to prepare the final cut.'
            : 'Changes requested. Rework notes dispatched to the editor.',
        data: {
          decision: data.decision,
          current_stage:
            data.decision === 'APPROVED' && version.cut_type === 'FINAL_CUT'
              ? 'THUMBNAIL_PREP'
              : 'VIDEO_EDITING',
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

