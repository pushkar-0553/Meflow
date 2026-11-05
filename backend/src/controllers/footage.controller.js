import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const logHandoverSchema = z.object({
  storage_media_identifier: z.string().min(2, 'Storage media identifier is required (e.g. SD_CARD_A1, SSD_SANDISK_02)'),
  footage_folder_name: z.string().min(2, 'Footage folder name is required'),
  footage_storage_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const footageController = {
  /**
   * GET /api/footage/pending
   * Fetch all pending handovers for editors and camera crew
   */
  async getPendingHandovers(req, res, next) {
    try {
      const records = await query(
        `SELECT fh.*, vp.project_code, vp.title AS project_title, vp.current_stage,
                c.name AS course_name,
                u_giver.name AS handed_over_by_name,
                u_recv.name AS received_by_name
         FROM footage_handovers fh
         JOIN video_projects vp ON fh.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         LEFT JOIN users u_giver ON fh.handed_over_by = u_giver.id
         LEFT JOIN users u_recv ON fh.received_by = u_recv.id
         WHERE fh.status NOT IN ('READY_FOR_EDITING')
         ORDER BY fh.created_at DESC`
      );

      return successResponse(res, {
        message: 'Pending footage handovers retrieved successfully.',
        data: records,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/footage/:projectId/handover
   * Cameraman logs chip handover
   */
  async recordHandover(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = logHandoverSchema.parse(req.body);
      const userId = req.user?.id;

      let handoverId;
      await transaction(async (conn) => {
        const [existing] = await conn.query(
          `SELECT id, status FROM footage_handovers WHERE video_project_id = ? ORDER BY id DESC LIMIT 1`,
          [projectId]
        );

        if (existing.length > 0) {
          handoverId = existing[0].id;
          await conn.query(
            `UPDATE footage_handovers SET
              storage_media_identifier = ?,
              footage_folder_name = ?,
              footage_storage_url = ?,
              notes = ?,
              handed_over_by = ?,
              status = 'HANDED_OVER',
              handed_over_at = NOW(),
              updated_at = NOW()
             WHERE id = ?`,
            [
              data.storage_media_identifier.trim(),
              data.footage_folder_name.trim(),
              data.footage_storage_url?.trim() || null,
              data.notes?.trim() || null,
              userId,
              handoverId,
            ]
          );
        } else {
          const [insertRes] = await conn.query(
            `INSERT INTO footage_handovers (
              video_project_id, handed_over_by, status, storage_media_identifier,
              footage_folder_name, footage_storage_url, notes, handed_over_at
            ) VALUES (?, ?, 'HANDED_OVER', ?, ?, ?, ?, NOW())`,
            [
              projectId,
              userId,
              data.storage_media_identifier.trim(),
              data.footage_folder_name.trim(),
              data.footage_storage_url?.trim() || null,
              data.notes?.trim() || null,
            ]
          );
          handoverId = insertRes.insertId;
        }

        // Notify Editors
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'FOOTAGE_HANDED_OVER', 'Footage Ready for Pickup',
                  CONCAT('Storage media ', ?, ' has been handed over for project ID ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('EDITOR', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [data.storage_media_identifier, projectId, projectId]
        );

        // Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'FOOTAGE_HANDED_OVER', 'VIDEO_PROJECT', ?, ?, ?)`,
          [
            userId,
            projectId,
            JSON.stringify({
              media: data.storage_media_identifier,
              folder: data.footage_folder_name,
            }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        message: 'Footage handover recorded. Media is ready for editor receipt confirmation.',
        data: { handover_id: handoverId, status: 'HANDED_OVER' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/footage/:projectId/receive
   * Editor confirms receipt of physical storage media
   */
  async confirmReceipt(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const editorId = req.user?.id;

      await transaction(async (conn) => {
        const [handover] = await conn.query(
          `SELECT id, storage_media_identifier FROM footage_handovers WHERE video_project_id = ? ORDER BY id DESC LIMIT 1`,
          [projectId]
        );
        if (!handover || handover.length === 0) {
          throw new Error('No footage handover record found for this project.');
        }

        await conn.query(
          `UPDATE footage_handovers SET
            received_by = ?,
            status = 'RECEIVED_BY_EDITOR',
            received_at = NOW(),
            updated_at = NOW()
           WHERE id = ?`,
          [editorId, handover[0].id]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'FOOTAGE_RECEIVED_BY_EDITOR', 'VIDEO_PROJECT', ?, ?, ?)`,
          [editorId, projectId, JSON.stringify({ media: handover[0].storage_media_identifier }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Physical media receipt confirmed by editor.',
        data: { status: 'RECEIVED_BY_EDITOR' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/footage/:projectId/copied
   * Editor confirms footage has been copied to editing workstation / local storage
   */
  async confirmCopied(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const editorId = req.user?.id;

      await transaction(async (conn) => {
        const [handover] = await conn.query(
          `SELECT id FROM footage_handovers WHERE video_project_id = ? ORDER BY id DESC LIMIT 1`,
          [projectId]
        );
        if (!handover || handover.length === 0) {
          throw new Error('No footage handover record found.');
        }

        await conn.query(
          `UPDATE footage_handovers SET
            status = 'FOOTAGE_COPIED',
            updated_at = NOW()
           WHERE id = ?`,
          [handover[0].id]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'FOOTAGE_BACKED_UP_COPIED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [editorId, projectId, JSON.stringify({ handoverId: handover[0].id }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Footage copied and safely backed up.',
        data: { status: 'FOOTAGE_COPIED' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/footage/:projectId/ready
   * Complete handover -> Advances video project to Stage 5: VIDEO_EDITING
   * and initializes editing_assignments with status AVAILABLE
   */
  async markReadyForEditing(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user?.id;

      await transaction(async (conn) => {
        // 1. Update handover status
        await conn.query(
          `UPDATE footage_handovers SET
            status = 'READY_FOR_EDITING',
            updated_at = NOW()
           WHERE video_project_id = ?`,
          [projectId]
        );

        // 2. Advance video project current_stage to VIDEO_EDITING
        await conn.query(
          `UPDATE video_projects SET
            current_stage = 'VIDEO_EDITING',
            updated_at = NOW()
           WHERE id = ?`,
          [projectId]
        );

        // 3. Initialize or update editing_assignments record as AVAILABLE
        await conn.query(
          `INSERT INTO editing_assignments (video_project_id, status)
           VALUES (?, 'AVAILABLE')
           ON DUPLICATE KEY UPDATE status = 'AVAILABLE', updated_at = NOW()`,
          [projectId]
        );

        // 4. Notify video editors
        const [projects] = await conn.query(`SELECT title FROM video_projects WHERE id = ?`, [projectId]);
        const projectTitle = projects[0]?.title || 'Video';

        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'EDITING_AVAILABLE', 'New Video Ready for Editing',
                  CONCAT('Footage verified! Project ready for editing: ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('EDITOR', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [projectTitle, projectId]
        );

        // 5. Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'STAGE_ADVANCED_TO_EDITING', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ stage: 'VIDEO_EDITING' }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Footage verified! Video project has advanced to Stage 5: Video Editing.',
        data: { current_stage: 'VIDEO_EDITING' },
      });
    } catch (error) {
      next(error);
    }
  },
};

