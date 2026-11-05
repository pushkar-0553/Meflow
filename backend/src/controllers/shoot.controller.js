import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const shootDetailsSchema = z.object({
  actual_shoot_date: z.string().optional().nullable(),
  actual_start_time: z.string().optional().nullable(),
  actual_end_time: z.string().optional().nullable(),
  studio_details: z.string().optional().nullable(),
  camera_gear_notes: z.string().optional().nullable(),
  shoot_notes: z.string().optional().nullable(),
  anchor_id: z.number().int().positive().optional().nullable(),
});

const addTeamMemberSchema = z.object({
  user_id: z.number().int().positive(),
  team_role: z.enum(['LEAD_CAMERAMAN', 'SECOND_CAMERA', 'ANCHOR', 'LIGHTING_ASSISTANT', 'AUDIO_TECH']),
});

const addSceneSchema = z.object({
  scene_number: z.number().int().positive(),
  title: z.string().min(2, 'Scene title is required'),
  description: z.string().optional().nullable(),
});

const logShotSchema = z.object({
  shot_number: z.number().int().positive(),
  clip_file_name: z.string().min(2, 'Clip filename is required (e.g. CLIP_001.MOV)'),
  dialogue_reference: z.string().optional().nullable(),
  take_number: z.number().int().positive().default(1),
  status: z.enum(['RECORDED', 'CONFIRMED', 'REJECTED', 'UNUSABLE', 'RETAKE_REQUIRED']).default('RECORDED'),
  notes: z.string().optional().nullable(),
});

const updateShotStatusSchema = z.object({
  status: z.enum(['RECORDED', 'CONFIRMED', 'REJECTED', 'UNUSABLE', 'RETAKE_REQUIRED']),
  notes: z.string().optional().nullable(),
});

export const shootController = {
  /**
   * GET /api/shoots/available
   * Fetch shoots ready for cameramen to claim
   */
  async getAvailableShoots(req, res, next) {
    try {
      const shoots = await query(
        `SELECT csh.id AS shoot_id, csh.status AS shoot_status, csh.actual_shoot_date,
                vp.id AS project_id, vp.project_code, vp.title, vp.category, vp.priority,
                vp.proposed_shoot_date, vp.proposed_shoot_time, vp.location_details,
                c.name AS course_name,
                cs.google_docs_url
         FROM cinematography_shoots csh
         JOIN video_projects vp ON csh.video_project_id = vp.id
         JOIN courses c ON vp.course_id = c.id
         LEFT JOIN content_scripts cs ON vp.id = cs.video_project_id
         WHERE csh.status = 'AVAILABLE'
           AND vp.current_stage = 'CINEMATOGRAPHY'
         ORDER BY vp.priority = 'URGENT' DESC, vp.proposed_shoot_date ASC`
      );

      return successResponse(res, {
        message: 'Available shoots retrieved successfully.',
        data: shoots,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/:projectId/accept
   * Atomic Concurrency-Safe Claim by Lead Cinematographer
   */
  async acceptShoot(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const cameramanId = req.user?.id;

      let shootId;
      await transaction(async (conn) => {
        // Atomic conditional update
        const [updateRes] = await conn.query(
          `UPDATE cinematography_shoots
           SET lead_cinematographer_id = ?, status = 'ACCEPTED', accepted_at = NOW(),
               version = version + 1, updated_at = NOW()
           WHERE video_project_id = ? AND status = 'AVAILABLE'`,
          [cameramanId, projectId]
        );

        if (updateRes.affectedRows === 0) {
          throw new Error('This shoot has already been claimed or is not available.');
        }

        const [shoots] = await conn.query(`SELECT id FROM cinematography_shoots WHERE video_project_id = ?`, [projectId]);
        shootId = shoots[0]?.id;

        // Auto-add lead cameraman to crew roster
        if (shootId) {
          await conn.query(
            `INSERT IGNORE INTO cinematography_team_members (shoot_id, user_id, team_role, assigned_by)
             VALUES (?, ?, 'LEAD_CAMERAMAN', ?)`,
            [shootId, cameramanId, cameramanId]
          );
        }

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'SHOOT_ACCEPTED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [cameramanId, projectId, JSON.stringify({ cameramanId }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Shoot assignment successfully claimed! You are assigned as Lead Cinematographer.',
      });
    } catch (error) {
      if (error.message.includes('already been claimed')) {
        return errorResponse(res, { statusCode: 409, message: error.message });
      }
      next(error);
    }
  },

  /**
   * POST /api/shoots/:projectId/start
   * Cameraman marks shoot in progress
   */
  async startShoot(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user?.id;
      const isManager = Boolean(req.user?.is_system_admin || req.user?.role_code === 'DM_HEAD');

      const shoots = await query(`SELECT * FROM cinematography_shoots WHERE video_project_id = ?`, [projectId]);
      if (!shoots || shoots.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Shoot record not found.' });
      }
      const shoot = shoots[0];

      if (shoot.lead_cinematographer_id !== userId && !isManager) {
        return errorResponse(res, { statusCode: 403, message: 'Only the assigned lead cinematographer can start the shoot.' });
      }

      await query(
        `UPDATE cinematography_shoots SET
          status = 'IN_PROGRESS',
          actual_start_time = COALESCE(actual_start_time, CURTIME()),
          actual_shoot_date = COALESCE(actual_shoot_date, CURDATE()),
          updated_at = NOW()
         WHERE id = ?`,
        [shoot.id]
      );

      return successResponse(res, { message: 'Shoot is now active and in progress.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/shoots/:projectId/details
   * Update studio location, gear notes, or shoot times
   */
  async updateShootDetails(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const data = shootDetailsSchema.parse(req.body);

      await query(
        `UPDATE cinematography_shoots SET
          actual_shoot_date = ?, actual_start_time = ?, actual_end_time = ?,
          studio_details = ?, camera_gear_notes = ?, shoot_notes = ?,
          anchor_id = ?, updated_at = NOW()
         WHERE video_project_id = ?`,
        [
          data.actual_shoot_date || null,
          data.actual_start_time || null,
          data.actual_end_time || null,
          data.studio_details || null,
          data.camera_gear_notes || null,
          data.shoot_notes || null,
          data.anchor_id || null,
          projectId,
        ]
      );

      return successResponse(res, { message: 'Shoot parameters updated successfully.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/:shootId/team
   * Assign supporting crew member (second camera, anchor, lighting tech, audio)
   */
  async addTeamMember(req, res, next) {
    try {
      const shootId = parseInt(req.params.shootId, 10);
      const data = addTeamMemberSchema.parse(req.body);
      const assignedBy = req.user?.id;

      await query(
        `INSERT INTO cinematography_team_members (shoot_id, user_id, team_role, assigned_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE team_role = VALUES(team_role);`,
        [shootId, data.user_id, data.team_role, assignedBy]
      );

      return successResponse(res, {
        statusCode: 201,
        message: 'Crew member added to the cinematography team roster.',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/shoots/:shootId/team/:memberId
   * Remove a crew member from the roster
   */
  async removeTeamMember(req, res, next) {
    try {
      const shootId = parseInt(req.params.shootId, 10);
      const memberId = parseInt(req.params.memberId, 10);

      await query(`DELETE FROM cinematography_team_members WHERE shoot_id = ? AND user_id = ?`, [shootId, memberId]);

      return successResponse(res, { message: 'Crew member removed from shoot roster.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/:shootId/scenes
   * Add a new Scene
   */
  async addScene(req, res, next) {
    try {
      const shootId = parseInt(req.params.shootId, 10);
      const data = addSceneSchema.parse(req.body);

      const result = await query(
        `INSERT INTO video_scenes (shoot_id, scene_number, title, description)
         VALUES (?, ?, ?, ?)`,
        [shootId, data.scene_number, data.title.trim(), data.description || null]
      );

      return successResponse(res, {
        statusCode: 201,
        message: `Scene ${data.scene_number} added successfully.`,
        data: {
          id: result.insertId,
          shoot_id: shootId,
          scene_number: data.scene_number,
          title: data.title,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/scenes/:sceneId/shots
   * Log an individual shot chronologically
   */
  async logShot(req, res, next) {
    try {
      const sceneId = parseInt(req.params.sceneId, 10);
      const data = logShotSchema.parse(req.body);

      const result = await query(
        `INSERT INTO video_shots (
          scene_id, shot_number, clip_file_name, dialogue_reference, take_number, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sceneId,
          data.shot_number,
          data.clip_file_name.trim().toUpperCase(),
          data.dialogue_reference || null,
          data.take_number,
          data.status,
          data.notes || null,
        ]
      );

      return successResponse(res, {
        statusCode: 201,
        message: `Shot ${data.shot_number} (${data.clip_file_name}) logged as ${data.status}.`,
        data: {
          id: result.insertId,
          scene_id: sceneId,
          shot_number: data.shot_number,
          clip_file_name: data.clip_file_name,
          status: data.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/shoots/shots/:shotId/status
   * Fast toggle status (Confirmed, Rejected, Retake Required, etc.)
   */
  async updateShotStatus(req, res, next) {
    try {
      const shotId = parseInt(req.params.shotId, 10);
      const data = updateShotStatusSchema.parse(req.body);

      await query(
        `UPDATE video_shots SET status = ?, notes = COALESCE(?, notes) WHERE id = ?`,
        [data.status, data.notes || null, shotId]
      );

      return successResponse(res, {
        message: `Shot status updated to ${data.status}.`,
        data: { id: shotId, status: data.status },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/shoots/shots/:shotId
   */
  async deleteShot(req, res, next) {
    try {
      const shotId = parseInt(req.params.shotId, 10);
      await query(`DELETE FROM video_shots WHERE id = ?`, [shotId]);
      return successResponse(res, { message: 'Shot entry removed.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/shoots/scenes/:sceneId
   */
  async deleteScene(req, res, next) {
    try {
      const sceneId = parseInt(req.params.sceneId, 10);
      await query(`DELETE FROM video_scenes WHERE id = ?`, [sceneId]);
      return successResponse(res, { message: 'Scene removed.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/:projectId/assign
   * Managerial manual assignment of lead cinematographer
   */
  async assignShoot(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const { user_id } = z.object({ user_id: z.number().int().positive() }).parse(req.body);
      const managerId = req.user?.id;

      await transaction(async (conn) => {
        await conn.query(
          `UPDATE cinematography_shoots
           SET lead_cinematographer_id = ?, status = 'ACCEPTED', accepted_at = NOW(),
               version = version + 1, updated_at = NOW()
           WHERE video_project_id = ?`,
          [user_id, projectId]
        );

        const [shoots] = await conn.query(`SELECT id FROM cinematography_shoots WHERE video_project_id = ?`, [projectId]);
        const shootId = shoots[0]?.id;

        if (shootId) {
          await conn.query(
            `INSERT INTO cinematography_team_members (shoot_id, user_id, team_role, assigned_by)
             VALUES (?, ?, 'LEAD_CAMERAMAN', ?)
             ON DUPLICATE KEY UPDATE team_role = 'LEAD_CAMERAMAN'`,
            [shootId, user_id, managerId]
          );
        }

        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           VALUES (?, 'SHOOT_ASSIGNED', 'New Shoot Assignment', 'You have been assigned as Lead Cinematographer.', 'VIDEO_PROJECT', ?)`,
          [user_id, projectId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'SHOOT_MANAGERIAL_ASSIGNED', 'VIDEO_PROJECT', ?, ?, ?)`,
          [managerId, projectId, JSON.stringify({ assignedUserId: user_id }), req.ip]
        );
      });

      return successResponse(res, { message: 'Cinematographer assigned successfully.' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/shoots/:projectId/complete
   * Complete shoot -> Progresses to Stage 4 (FOOTAGE_HANDOVER) and initializes handover record
   */
  async completeShoot(req, res, next) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user?.id;

      const shoots = await query(
        `SELECT csh.*, vp.title AS project_title
         FROM cinematography_shoots csh
         JOIN video_projects vp ON csh.video_project_id = vp.id
         WHERE csh.video_project_id = ?`,
        [projectId]
      );
      if (!shoots || shoots.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Shoot record not found.' });
      }
      const shoot = shoots[0];

      await transaction(async (conn) => {
        // 1. Mark shoot completed
        await conn.query(
          `UPDATE cinematography_shoots SET
            status = 'SHOOT_COMPLETED',
            actual_end_time = COALESCE(actual_end_time, CURTIME()),
            completed_at = NOW(),
            updated_at = NOW()
           WHERE id = ?`,
          [shoot.id]
        );

        // 2. Transition project to Stage 4: FOOTAGE_HANDOVER
        await conn.query(
          `UPDATE video_projects SET
            current_stage = 'FOOTAGE_HANDOVER', updated_at = NOW()
           WHERE id = ?`,
          [projectId]
        );

        // 3. Create initial footage handover record
        const defaultMediaId = `CHIP_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${projectId}`;
        const defaultFolder = `RAW_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_PROJ_${projectId}`;

        await conn.query(
          `INSERT INTO footage_handovers (
            video_project_id, handed_over_by, status, storage_media_identifier, footage_folder_name
          ) VALUES (?, ?, 'AWAITING_HANDOVER', ?, ?)`,
          [projectId, shoot.lead_cinematographer_id || userId, defaultMediaId, defaultFolder]
        );

        // 4. Notifications
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
           SELECT u.id, 'FOOTAGE_HANDOVER_REQUIRED', 'Shoot Completed - Footage Handover Pending',
                  CONCAT('Camera shoot complete for: ', ?), 'VIDEO_PROJECT', ?
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE (r.code IN ('EDITOR', 'CINEMATOGRAPHER', 'DM_HEAD', 'ADMIN') OR r.is_system_admin = TRUE)
             AND u.status = 'ACTIVE'`,
          [shoot.project_title, projectId]
        );

        // 5. Activity log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'SHOOT_COMPLETED_PENDING_HANDOVER', 'VIDEO_PROJECT', ?, ?, ?)`,
          [userId, projectId, JSON.stringify({ shootId: shoot.id, stage: 'FOOTAGE_HANDOVER' }), req.ip]
        );
      });

      return successResponse(res, {
        message: 'Shoot marked complete! Project has moved to Stage 4: Footage Handover.',
        data: { current_stage: 'FOOTAGE_HANDOVER' },
      });
    } catch (error) {
      next(error);
    }
  },
};
