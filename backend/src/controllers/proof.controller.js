import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { storageService } from '../services/storage.service.js';

const uploadProofSchema = z.object({
  task_stage_id: z.number().int().positive(),
  proof_type: z.enum(['CLOUD_DRIVE_URL', 'DIRECT_FILE', 'SOCIAL_POST_URL', 'TEXT_NOTE']),
  title: z.string().max(150).optional().nullable(),
  public_url: z.string().max(1000).optional().nullable(),
  file_data: z.string().optional().nullable(), // base64 dataURI if photo
  mime_type: z.string().max(100).optional().nullable(),
  file_size_bytes: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const proofController = {
  /**
   * POST /api/proofs
   * Submit a new proof (Photo, Cloud Drive URL, Social Post URL, or Text Note)
   */
  async uploadProof(req, res, next) {
    try {
      const data = uploadProofSchema.parse(req.body);
      const userId = req.user?.id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      // 1. Verify stage existence & authorization
      const stages = await query(
        `SELECT ts.*, t.title AS task_title,
                tsa.user_id AS assignee_id, tsa.status AS assignment_status
         FROM task_stages ts
         JOIN tasks t ON ts.task_id = t.id
         LEFT JOIN task_stage_assignments tsa ON ts.id = tsa.task_stage_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         WHERE ts.id = ?`,
        [data.task_stage_id]
      );

      if (!stages || stages.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Task stage not found.' });
      }
      const stage = stages[0];

      // Verification: must be assignee or admin
      if (!isAdmin && stage.assignee_id !== userId) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'NOT_STAGE_ASSIGNEE',
          message: 'Only the active assignee or an administrator can submit proof for this stage.',
        });
      }

      let finalPublicUrl = data.public_url;
      let finalFileKey = null;
      let finalFileSize = data.file_size_bytes || null;
      let finalMimeType = data.mime_type || null;

      // 2. Handle Direct Image / Photo File Upload via Cloudinary
      if (data.proof_type === 'DIRECT_FILE') {
        if (!data.file_data && !data.public_url) {
          return errorResponse(res, {
            statusCode: 422,
            code: 'FILE_REQUIRED',
            message: 'Image file data or a valid asset URL is required for DIRECT_FILE proof.',
          });
        }

        if (data.file_data) {
          const uploadResult = await storageService.uploadImage(data.file_data, {
            folder: `meflow/tasks/${stage.task_id}/stage_${stage.id}`,
          });
          finalPublicUrl = uploadResult.url;
          finalFileKey = uploadResult.publicId;
          finalFileSize = uploadResult.bytes || finalFileSize;
          finalMimeType = uploadResult.format ? `image/${uploadResult.format}` : 'image/jpeg';
        }
      } else if (data.proof_type === 'TEXT_NOTE') {
        if (!data.notes || !data.notes.trim()) {
          return errorResponse(res, {
            statusCode: 422,
            code: 'NOTE_REQUIRED',
            message: 'Text notes are required when submitting TEXT_NOTE proof.',
          });
        }
        finalPublicUrl = finalPublicUrl || `note://task_${stage.task_id}/stage_${stage.id}`;
      } else {
        // CLOUD_DRIVE_URL or SOCIAL_POST_URL
        if (!data.public_url || !data.public_url.trim()) {
          return errorResponse(res, {
            statusCode: 422,
            code: 'URL_REQUIRED',
            message: 'A valid external link is required (Google Drive, Frame.io, or Live Post URL).',
          });
        }
      }

      let insertedId = null;
      let nextRevision = 1;

      // 3. Atomic transaction: compute next revision & insert proof
      await transaction(async (conn) => {
        const [revRows] = await conn.query(
          `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next_rev
           FROM proofs
           WHERE task_stage_id = ?`,
          [data.task_stage_id]
        );
        nextRevision = revRows[0]?.next_rev || 1;

        const [insertRes] = await conn.query(
          `INSERT INTO proofs (
            task_stage_id, uploaded_by, proof_type, title, file_key,
            public_url, mime_type, file_size_bytes, revision_number, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.task_stage_id,
            userId,
            data.proof_type,
            data.title || `${stage.stage_type} Proof (Rev ${nextRevision})`,
            finalFileKey,
            finalPublicUrl,
            finalMimeType,
            finalFileSize,
            nextRevision,
            data.notes || null,
          ]
        );
        insertedId = insertRes.insertId;

        // Log in immutable activity ledger
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'PROOF_UPLOADED', 'STAGE', ?, ?, ?)`,
          [
            userId,
            data.task_stage_id,
            JSON.stringify({
              proofId: insertedId,
              proofType: data.proof_type,
              revision: nextRevision,
              taskTitle: stage.task_title,
            }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Proof of work recorded successfully as Revision ${nextRevision}.`,
        data: {
          id: insertedId,
          taskStageId: data.task_stage_id,
          proofType: data.proof_type,
          revisionNumber: nextRevision,
          publicUrl: finalPublicUrl,
          notes: data.notes,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/proofs/stage/:stageId
   * Retrieve all proof submissions and revisions for a given task stage
   */
  async getProofsByStage(req, res, next) {
    try {
      const stageId = parseInt(req.params.stageId, 10);
      if (isNaN(stageId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Stage ID.' });
      }

      const proofs = await query(
        `SELECT p.id, p.task_stage_id, p.uploaded_by, p.proof_type, p.title,
                p.file_key, p.public_url, p.mime_type, p.file_size_bytes,
                p.revision_number, p.notes, p.created_at,
                u.name AS uploader_name, u.email AS uploader_email, r.name AS uploader_role
         FROM proofs p
         JOIN users u ON p.uploaded_by = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE p.task_stage_id = ?
         ORDER BY p.revision_number ASC, p.id ASC`,
        [stageId]
      );

      return successResponse(res, {
        message: 'Stage proofs retrieved successfully.',
        data: proofs,
        meta: {
          count: proofs.length,
          stageId,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/proofs/signature
   * Retrieve signed parameters for direct client uploads to Cloudinary
   */
  async getUploadSignature(req, res, next) {
    try {
      const { folder } = req.query;
      const signatureData = storageService.generateUploadSignature(folder || 'meflow_proofs');
      return successResponse(res, {
        message: 'Direct upload parameters generated.',
        data: signatureData,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/proofs/:id
   * Remove an erroneous proof prior to stage completion or as an Admin
   */
  async deleteProof(req, res, next) {
    try {
      const proofId = parseInt(req.params.id, 10);
      if (isNaN(proofId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Proof ID.' });
      }

      const userId = req.user?.id;
      const isAdmin = Boolean(req.user?.is_system_admin || req.user?.role_code === 'ADMIN');

      const proofs = await query(
        `SELECT p.*, ts.status AS stage_status
         FROM proofs p
         JOIN task_stages ts ON p.task_stage_id = ts.id
         WHERE p.id = ?`,
        [proofId]
      );

      if (!proofs || proofs.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Proof asset not found.' });
      }
      const proof = proofs[0];

      // Non-admins can only delete their own proofs and only if stage is NOT already approved
      if (!isAdmin) {
        if (proof.uploaded_by !== userId) {
          return errorResponse(res, {
            statusCode: 403,
            code: 'NOT_PROOF_OWNER',
            message: 'You can only delete proof assets uploaded by your account.',
          });
        }
        if (proof.stage_status === 'APPROVED') {
          return errorResponse(res, {
            statusCode: 403,
            code: 'STAGE_ALREADY_APPROVED',
            message: 'Cannot delete proof for an already approved production stage.',
          });
        }
      }

      await query(`DELETE FROM proofs WHERE id = ?`, [proofId]);

      await query(
        `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
         VALUES (?, 'PROOF_DELETED', 'STAGE', ?, ?, ?)`,
        [userId, proof.task_stage_id, JSON.stringify({ proofId, revision: proof.revision_number }), req.ip]
      );

      return successResponse(res, {
        message: 'Proof asset deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  },
};
