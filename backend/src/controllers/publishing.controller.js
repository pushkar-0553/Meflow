import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const recordPublicationSchema = z.object({
  task_id: z.number().int().positive(),
  platform: z.enum(['YOUTUBE', 'INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'X_TWITTER', 'WEBSITE', 'OTHER']),
  post_url: z.string().url(),
  caption: z.string().optional().nullable(),
  screenshot_proof_url: z.string().optional().nullable(),
});

export const publishingController = {
  /**
   * POST /api/publishing
   * Submit live published social post URL & metadata
   */
  async recordPublication(req, res, next) {
    try {
      const data = recordPublicationSchema.parse(req.body);
      const userId = req.user?.id;

      const tasks = await query(`SELECT * FROM tasks WHERE id = ?`, [data.task_id]);
      if (!tasks || tasks.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task not found.' });
      }
      const task = tasks[0];

      let insertedId = null;

      await transaction(async (conn) => {
        const [insertRes] = await conn.query(
          `INSERT INTO social_publications (
            task_id, published_by, platform, post_url, caption, screenshot_proof_url
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            data.task_id,
            userId,
            data.platform,
            data.post_url,
            data.caption || null,
            data.screenshot_proof_url || null,
          ]
        );
        insertedId = insertRes.insertId;

        // Mark any PUBLISHED stage as APPROVED
        await conn.query(
          `UPDATE task_stages
           SET status = 'APPROVED', completed_at = NOW(), updated_at = NOW()
           WHERE task_id = ? AND stage_type = 'PUBLISHED'`,
          [data.task_id]
        );

        // Mark whole task COMPLETED
        await conn.query(
          `UPDATE tasks SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?`,
          [data.task_id]
        );

        // Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'CONTENT_PUBLISHED', 'TASK', ?, ?, ?)`,
          [
            userId,
            data.task_id,
            JSON.stringify({
              publicationId: insertedId,
              platform: data.platform,
              postUrl: data.post_url,
              taskTitle: task.title,
            }),
            req.ip,
          ]
        );
      });

      return successResponse(
        res,
        {
          statusCode: 201,
          message: `Publication successfully recorded for ${data.platform}! Task marked COMPLETED.`,
          data: {
            id: insertedId,
            taskId: data.task_id,
            platform: data.platform,
            postUrl: data.post_url,
          },
        }
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/publishing
   * View live published posts archive
   */
  async listPublications(req, res, next) {
    try {
      const { platform } = req.query;

      let whereClause = '';
      const params = [];
      if (platform) {
        whereClause = 'WHERE sp.platform = ?';
        params.push(platform);
      }

      const publications = await query(
        `SELECT sp.id, sp.task_id, sp.platform, sp.post_url, sp.caption,
                sp.screenshot_proof_url, sp.published_at,
                t.title AS task_title, t.course_code, t.content_type,
                u.name AS publisher_name, u.email AS publisher_email
         FROM social_publications sp
         JOIN tasks t ON sp.task_id = t.id
         JOIN users u ON sp.published_by = u.id
         ${whereClause}
         ORDER BY sp.published_at DESC`,
        params
      );

      return successResponse(res, {
        message: 'Published content archive retrieved successfully.',
        data: publications,
        meta: {
          count: publications.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/publishing/projects/:projectId/platform
   * Publish video project to a specific social channel (YouTube, Instagram, Facebook, etc.)
   */
  async recordProjectPlatformPublish(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = z.object({
        platform: z.enum(['YOUTUBE', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'WEBSITE', 'OTHER']),
        post_url: z.string().url('A valid post URL is required'),
        caption: z.string().optional().nullable(),
        hashtags: z.string().optional().nullable(),
        proof_screenshot_url: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }).parse(req.body);

      const userId = req.user?.id;

      await transaction(async (conn) => {
        // Upsert platform publication record
        await conn.query(
          `INSERT INTO platform_publications (
            video_project_id, platform, status, published_by, published_at,
            post_url, caption, hashtags, proof_screenshot_url, notes
          ) VALUES (?, ?, 'PUBLISHED', ?, NOW(), ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            status = 'PUBLISHED',
            published_by = VALUES(published_by),
            published_at = NOW(),
            post_url = VALUES(post_url),
            caption = VALUES(caption),
            hashtags = VALUES(hashtags),
            proof_screenshot_url = VALUES(proof_screenshot_url),
            notes = VALUES(notes),
            updated_at = NOW()`,
          [
            projectId,
            data.platform,
            userId,
            data.post_url.trim(),
            data.caption || null,
            data.hashtags || null,
            data.proof_screenshot_url || null,
            data.notes || null,
          ]
        );

        // Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'PROJECT_PUBLISHED_TO_PLATFORM', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ platform: data.platform, url: data.post_url }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Video successfully recorded as published on ${data.platform}!`,
        data: { platform: data.platform, post_url: data.post_url },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/publishing/projects/:projectId/complete
   * Mark entire video project as COMPLETED & stage = PUBLISHED
   */
  async completeProjectPublishing(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user?.id;

      const publishedRows = await query(
        `SELECT COUNT(*) AS count FROM platform_publications
         WHERE video_project_id = ? AND status = 'PUBLISHED'`,
        [projectId]
      );

      if (publishedRows[0]?.count === 0) {
        return errorResponse(res, {
          statusCode: 400,
          message: 'At least one platform must have a verified published post URL before completing.',
        });
      }

      await transaction(async (conn) => {
        await conn.query(
          `UPDATE video_projects SET
            overall_status = 'COMPLETED',
            current_stage = 'PUBLISHED',
            completed_at = NOW(),
            updated_at = NOW()
           WHERE id = ?`,
          [projectId]
        );

        const [projects] = await conn.query(`SELECT title FROM video_projects WHERE id = ?`, [projectId]);
        const projectTitle = projects[0]?.title || 'Video Project';

        // Notify entire team
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'PROJECT_PUBLISHED_COMPLETE', '🎉 Video Production Completed & Live!',
                  CONCAT('Video project ', ?, ' has completed all 8 production stages and is officially live!'), 'VIDEO_PROJECT', ?
           FROM users u
           WHERE u.status = 'ACTIVE'`,
          [projectTitle, projectId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'VIDEO_PROJECT_FULLY_COMPLETED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ completedAt: new Date().toISOString() }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Congratulations! Video project has completed all 8 production stages and is officially live.',
        data: { overall_status: 'COMPLETED', current_stage: 'PUBLISHED' },
      });
    } catch (error) {
      next(error);
    }
  },
};

