import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const submitThumbnailSchema = z.object({
  thumbnail_url: z.string().url('A valid thumbnail image URL is required'),
  feedback_notes: z.string().optional().nullable(),
});

const reviewThumbnailSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  feedback_notes: z.string().min(2, 'Feedback comments are required'),
});

export const thumbnailController = {
  /**
   * GET /api/thumbnails/:projectId
   * Get all thumbnail versions for a video project
   */
  async getProjectThumbnails(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const thumbnails = await query(
        `SELECT tn.*, u.name AS designer_name
         FROM thumbnails tn
         LEFT JOIN users u ON tn.designer_id = u.id
         WHERE tn.video_project_id = ?
         ORDER BY tn.version_number DESC`,
        [projectId]
      );

      return successResponse(res, {
        message: 'Thumbnails retrieved successfully.',
        data: thumbnails,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/thumbnails/:projectId
   * Designer uploads/submits thumbnail URL
   */
  async submitThumbnail(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = submitThumbnailSchema.parse(req.body);
      const designerId = req.user?.id;

      let thumbnailId;
      await transaction(async (conn) => {
        // Find latest version
        const [rows] = await conn.query(
          `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_ver
           FROM thumbnails WHERE video_project_id = ?`,
          [projectId]
        );
        const nextVer = rows[0].next_ver;

        const [insertRes] = await conn.query(
          `INSERT INTO thumbnails (
            video_project_id, designer_id, thumbnail_url, version_number, status, feedback_notes
          ) VALUES (?, ?, ?, ?, 'SUBMITTED', ?)`,
          [
            projectId,
            designerId,
            data.thumbnail_url.trim(),
            nextVer,
            data.feedback_notes || null,
          ]
        );
        thumbnailId = insertRes.insertId;

        // Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'THUMBNAIL_SUBMITTED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [designerId, projectId, JSON.stringify({ version: nextVer, url: data.thumbnail_url }), req.ip]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: 'Thumbnail version submitted for review.',
        data: { id: thumbnailId, status: 'SUBMITTED' },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/thumbnails/:thumbnailId/review
   * Review gate: Approve thumbnail or request changes
   * If APPROVED -> Video transitions to Stage 8: PUBLISHING
   */
  async reviewThumbnail(req, res, next) {
    try {
      const thumbnailId = parseInt(req.params.thumbnailId, 10);
      const data = reviewThumbnailSchema.parse(req.body);
      const reviewerId = req.user?.id;

      const thumbnails = await query(
        `SELECT tn.*, vp.title AS project_title
         FROM thumbnails tn
         JOIN video_projects vp ON tn.video_project_id = vp.id
         WHERE tn.id = ?`,
        [thumbnailId]
      );
      if (!thumbnails || thumbnails.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Thumbnail not found.' });
      }
      const thumbnail = thumbnails[0];
      const projectId = thumbnail.video_project_id;

      await transaction(async (conn) => {
        if (data.decision === 'APPROVED') {
          // 1. Mark thumbnail approved
          await conn.query(
            `UPDATE thumbnails SET status = 'APPROVED', feedback_notes = ?, updated_at = NOW()
             WHERE id = ?`,
            [data.feedback_notes, thumbnailId]
          );

          // 2. Advance video project to Stage 8: PUBLISHING
          await conn.query(
            `UPDATE video_projects SET
              current_stage = 'PUBLISHING', updated_at = NOW()
             WHERE id = ?`,
            [projectId]
          );

          // 3. Pre-populate initial platform rows if not present
          const platforms = ['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];
          for (const plat of platforms) {
            await conn.query(
              `INSERT IGNORE INTO platform_publications (
                video_project_id, platform, status, thumbnail_url
              ) VALUES (?, ?, 'PENDING', ?)`,
              [projectId, plat, thumbnail.thumbnail_url]
            );
          }

          // 4. Notify social media managers
          await conn.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
             SELECT u.id, 'READY_FOR_PUBLISHING', 'Assets Ready - Publishing Stage Opened',
                    CONCAT('Thumbnail approved for ', ?, '. Video ready to be scheduled and published!'), 'VIDEO_PROJECT', ?
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE (r.code IN ('SOCIAL_MEDIA_MGR', 'SEO', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
               AND u.status = 'ACTIVE'`,
            [thumbnail.project_title, projectId]
          );

          // 5. Activity log
          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'THUMBNAIL_APPROVED_MOVED_TO_PUBLISHING', 'VIDEO_PROJECT', ?, ?, ?)`,
            [reviewerId, projectId, JSON.stringify({ thumbnailId, stage: 'PUBLISHING' }), req.ip]
          );
        } else {
          // Changes requested
          await conn.query(
            `UPDATE thumbnails SET status = 'CHANGES_REQUESTED', feedback_notes = ?, updated_at = NOW()
             WHERE id = ?`,
            [data.feedback_notes, thumbnailId]
          );

          if (thumbnail.designer_id) {
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               VALUES (?, 'THUMBNAIL_CHANGES_REQUESTED', 'Thumbnail Revision Needed',
                      CONCAT('Feedback on thumbnail for ', ?, ': ', ?), 'VIDEO_PROJECT', ?)`,
              [thumbnail.designer_id, thumbnail.project_title, data.feedback_notes, projectId]
            );
          }

          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'THUMBNAIL_REWORK_REQUESTED', 'VIDEO_PROJECT', ?, ?, ?)`,
            [reviewerId, projectId, JSON.stringify({ thumbnailId, feedback: data.feedback_notes }), req.ip]
          );
        }
      });

      return successResponse(res, {
        message:
          data.decision === 'APPROVED'
            ? 'Thumbnail approved! Project has moved to Stage 8: Multi-Platform Publishing.'
            : 'Changes requested. Designer notified.',
        data: {
          decision: data.decision,
          current_stage: data.decision === 'APPROVED' ? 'PUBLISHING' : 'THUMBNAIL_PREP',
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

