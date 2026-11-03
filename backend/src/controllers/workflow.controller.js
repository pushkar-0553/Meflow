import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const completeStageSchema = z.object({
  comments: z.string().optional().nullable(),
});

const reviewStageSchema = z.object({
  decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']),
  rework_comments: z.string().optional().nullable(),
});

export const workflowController = {
  /**
   * POST /api/workflow/stages/:stageId/complete
   * Worker marks stage complete -> triggers approval gate or automatically unlocks next stage
   */
  async completeStage(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const { comments } = completeStageSchema.parse(req.body);
      const userId = req.user?.id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      // Fetch stage and task details
      const stages = await query(
        `SELECT ts.*, t.title AS task_title, t.id AS task_id,
                tsa.user_id AS assignee_id, tsa.status AS assignment_status
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         WHERE ts.id = ?`,
        [stageId]
      );

      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Stage not found.' });
      }
      const stage = stages[0];

      // Verification: must be the assigned worker or an admin
      if (!isAdmin && stage.assignee_id !== userId) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'NOT_STAGE_ASSIGNEE',
          message: 'Only the active assignee of this stage can mark it as complete.',
        });
      }

      let nextStageUnlocked = null;
      let taskCompleted = false;

      await transaction(async (conn) => {
        // 1. If this stage is an approval gate, transition to SUBMITTED for manager review
        if (stage.is_approval_gate) {
          await conn.query(
            `UPDATE task_stages SET status = 'SUBMITTED', updated_at = NOW() WHERE id = ?`,
            [stageId]
          );

          await conn.query(
            `UPDATE tasks SET status = 'UNDER_REVIEW' WHERE id = ?`,
            [stage.task_id]
          );

          // Mark active assignment as COMPLETED / SUBMITTED
          await conn.query(
            `UPDATE task_stage_assignments SET status = 'COMPLETED', completed_at = NOW()
             WHERE task_stage_id = ? AND status IN ('ACCEPTED', 'IN_PROGRESS')`,
            [stageId]
          );

          // Notify managers
          await conn.query(
            `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
             SELECT u.id, 'APPROVAL_REQUIRED', 'Review Sign-Off Required',
                    CONCAT('Cut submitted for review on task: ', ?), 'STAGE', ?
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE (r.is_system_admin = TRUE OR r.code IN ('PRODUCTION_MGR', 'ADMIN'))
               AND u.status = 'ACTIVE'`,
            [stage.task_title, stageId]
          );

          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'STAGE_SUBMITTED_FOR_REVIEW', 'STAGE', ?, ?, ?)`,
            [userId, stageId, JSON.stringify({ taskTitle: stage.task_title, stageType: stage.stage_type }), req.ip]
          );
        } else {
          // 2. Regular non-gate stage: Mark APPROVED & automatically unlock next sequential stage
          await conn.query(
            `UPDATE task_stages
             SET status = 'APPROVED', completed_at = NOW(), updated_at = NOW()
             WHERE id = ?`,
            [stageId]
          );

          await conn.query(
            `UPDATE task_stage_assignments SET status = 'COMPLETED', completed_at = NOW()
             WHERE task_stage_id = ? AND status IN ('ACCEPTED', 'IN_PROGRESS')`,
            [stageId]
          );

          // Look for next sequential stage
          const [nextStages] = await conn.query(
            `SELECT id, stage_type, target_role_id, sequence_order
             FROM task_stages
             WHERE task_id = ? AND sequence_order = ?`,
            [stage.task_id, stage.sequence_order + 1]
          );

          if (nextStages && nextStages.length > 0) {
            const nextStage = nextStages[0];
            await conn.query(
              `UPDATE task_stages SET status = 'READY', version = version + 1 WHERE id = ?`,
              [nextStage.id]
            );
            nextStageUnlocked = nextStage.stage_type;

            // Notify eligible role members that next stage is ready in the pool
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               SELECT u.id, 'STAGE_UNLOCKED', 'New Production Stage Ready',
                      CONCAT('Stage ', ?, ' is now available for pickup in task: ', ?), 'STAGE', ?
               FROM users u
               WHERE u.role_id = ? AND u.status = 'ACTIVE'`,
              [nextStage.stage_type, stage.task_title, nextStage.id, nextStage.target_role_id]
            );
          } else {
            // No downstream stages -> Whole task is completed!
            await conn.query(
              `UPDATE tasks SET status = 'COMPLETED', updated_at = NOW() WHERE id = ?`,
              [stage.task_id]
            );
            taskCompleted = true;
          }

          await conn.query(
            `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
             VALUES (?, 'STAGE_COMPLETED', 'STAGE', ?, ?, ?)`,
            [userId, stageId, JSON.stringify({ nextStage: nextStageUnlocked, taskCompleted }), req.ip]
          );
        }
      });

      return successResponse(res, {
        message: stage.is_approval_gate
          ? `Stage '${stage.stage_type}' submitted for Manager review sign-off.`
          : nextStageUnlocked
          ? `Stage completed! Downstream stage '${nextStageUnlocked}' has automatically unlocked in the available work pool.`
          : 'Final production stage completed! Entire task marked as COMPLETED.',
        data: {
          stageId,
          isApprovalGate: stage.is_approval_gate,
          nextStageUnlocked,
          taskCompleted,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/workflow/stages/:stageId/review
   * Manager signs off with APPROVE or CHANGES_REQUESTED
   */
  async reviewStage(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const { decision, rework_comments } = reviewStageSchema.parse(req.body);
      const reviewerId = req.user?.id;

      if (decision === 'CHANGES_REQUESTED' && (!rework_comments || !rework_comments.trim())) {
        return errorResponse(res, {
          statusCode: 422,
          code: 'COMMENTS_REQUIRED',
          message: 'Structured feedback comments are mandatory when requesting rework.',
        });
      }

      const stages = await query(
        `SELECT ts.*, t.title AS task_title,
                tsa.user_id AS last_assignee_id
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id
         WHERE ts.id = ?
         ORDER BY tsa.id DESC
         LIMIT 1`,
        [stageId]
      );

      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Stage not found.' });
      }
      const stage = stages[0];

      let nextStageUnlocked = null;
      let taskCompleted = false;

      await transaction(async (conn) => {
        // 1. Record formal review decision in stage_approvals
        await conn.query(
          `INSERT INTO stage_approvals (task_stage_id, reviewer_id, decision, rework_comments)
           VALUES (?, ?, ?, ?)`,
          [stageId, reviewerId, decision, rework_comments || null]
        );

        if (decision === 'APPROVED') {
          // Mark stage APPROVED
          await conn.query(
            `UPDATE task_stages SET status = 'APPROVED', completed_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [stageId]
          );

          // Unlock next sequential stage
          const [nextStages] = await conn.query(
            `SELECT id, stage_type, target_role_id FROM task_stages
             WHERE task_id = ? AND sequence_order = ?`,
            [stage.task_id, stage.sequence_order + 1]
          );

          if (nextStages && nextStages.length > 0) {
            const nextStage = nextStages[0];
            await conn.query(
              `UPDATE task_stages SET status = 'READY', version = version + 1 WHERE id = ?`,
              [nextStage.id]
            );
            nextStageUnlocked = nextStage.stage_type;

            await conn.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?`, [stage.task_id]);

            // Notify eligible role
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               SELECT u.id, 'STAGE_UNLOCKED', 'Stage Unlocked After Approval',
                      CONCAT('Cut approved! Stage ', ?, ' is now available for pickup in task: ', ?), 'STAGE', ?
               FROM users u
               WHERE u.role_id = ? AND u.status = 'ACTIVE'`,
              [nextStage.stage_type, stage.task_title, nextStage.id, nextStage.target_role_id]
            );
          } else {
            await conn.query(`UPDATE tasks SET status = 'COMPLETED' WHERE id = ?`, [stage.task_id]);
            taskCompleted = true;
          }

          // Notify editor of approval
          if (stage.last_assignee_id) {
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               VALUES (?, 'CUT_APPROVED', 'Review Cut Approved! 🎉',
                       CONCAT('Your submission for ', ?, ' in task "', ?, '" was approved.'), 'STAGE', ?)`,
              [stage.last_assignee_id, stage.stage_type, stage.task_title, stageId]
            );
          }
        } else {
          // CHANGES_REQUESTED -> Return to Editor bucket
          await conn.query(
            `UPDATE task_stages SET status = 'CHANGES_REQUESTED', updated_at = NOW() WHERE id = ?`,
            [stageId]
          );

          await conn.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?`, [stage.task_id]);

          // Re-activate assignment for editor
          if (stage.last_assignee_id) {
            await conn.query(
              `UPDATE task_stage_assignments SET status = 'IN_PROGRESS'
               WHERE task_stage_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1`,
              [stageId, stage.last_assignee_id]
            );

            // High-priority rework notification
            await conn.query(
              `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id)
               VALUES (?, 'CHANGES_REQUESTED', 'Rework Required on Cut ⚠️',
                       CONCAT('Manager requested revisions for ', ?, ': "', ?, '"'), 'STAGE', ?)`,
              [stage.last_assignee_id, stage.stage_type, rework_comments, stageId]
            );
          }
        }

        // Audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'STAGE_REVIEWED', 'STAGE', ?, ?, ?)`,
          [reviewerId, stageId, JSON.stringify({ decision, comments: rework_comments }), req.ip]
        );
      });

      return successResponse(res, {
        message: decision === 'APPROVED'
          ? `Stage approved! Next stage '${nextStageUnlocked || 'Final'}' initialized.`
          : 'Revisions requested. Task returned to editor bucket with structured notes.',
        data: {
          stageId,
          decision,
          nextStageUnlocked,
          taskCompleted,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/workflow/pending-reviews
   * List all stages currently awaiting manager review sign-off
   */
  async getPendingReviews(req, res, next) {
    try {
      const pending = await query(
        `SELECT ts.id AS stage_id, ts.task_id, ts.stage_type, ts.sequence_order,
                ts.status, ts.updated_at AS submitted_at,
                t.title AS task_title, t.course_code, t.content_type, t.priority,
                u.id AS submitter_id, u.name AS submitter_name, u.email AS submitter_email,
                (SELECT COUNT(*) FROM proofs WHERE task_stage_id = ts.id) AS proof_count,
                (SELECT public_url FROM proofs WHERE task_stage_id = ts.id ORDER BY id DESC LIMIT 1) AS latest_proof_url,
                (SELECT proof_type FROM proofs WHERE task_stage_id = ts.id ORDER BY id DESC LIMIT 1) AS latest_proof_type
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status = 'COMPLETED'
         LEFT JOIN users u ON tsa.user_id = u.id
         WHERE ts.status = 'SUBMITTED'
         ORDER BY t.priority = 'URGENT' DESC, ts.updated_at ASC`
      );

      return successResponse(res, {
        message: 'Pending cut reviews retrieved successfully.',
        data: pending,
        meta: {
          count: pending.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/workflow/stages/:stageId/rollback
   * Admin/Manager manually reverts a stage to an earlier state
   */
  async rollbackStage(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const stages = await query(`SELECT * FROM task_stages WHERE id = ?`, [stageId]);
      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Stage not found.' });
      }
      const stage = stages[0];

      await transaction(async (conn) => {
        // Revert this stage to READY
        await conn.query(
          `UPDATE task_stages SET status = 'READY', completed_at = NULL, version = version + 1 WHERE id = ?`,
          [stageId]
        );

        // Put subsequent stages back to PENDING
        await conn.query(
          `UPDATE task_stages SET status = 'PENDING', completed_at = NULL WHERE task_id = ? AND sequence_order > ?`,
          [stage.task_id, stage.sequence_order]
        );

        await conn.query(`UPDATE tasks SET status = 'IN_PROGRESS' WHERE id = ?`, [stage.task_id]);

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, ip_address)
           VALUES (?, 'STAGE_ROLLED_BACK', 'STAGE', ?, ?)`,
          [req.user?.id || null, stageId, req.ip]
        );
      });

      return successResponse(res, {
        message: `Stage '${stage.stage_type}' rolled back to READY. Subsequent stages reset to PENDING.`,
      });
    } catch (error) {
      next(error);
    }
  },
};
