import crypto from 'crypto';
import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { env } from '../config/env.js';
import { emailService } from '../services/email.service.js';
import { getEffectivePermissions } from '../services/authz.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const updateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  department: z.string().min(2, 'Department is required'),
  phone: z.string().optional().nullable(),
  role_id: z.number().int().positive('Role ID must be a positive integer'),
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});

export const userController = {
  /**
   * GET /api/users
   * List all employees with search, role filters, status filters, and active task load
   */
  async getAllUsers(req, res, next) {
    try {
      const { search, role_id, status, department, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      const conditions = [];
      const params = [];

      if (search && search.trim()) {
        conditions.push(`(LOWER(u.name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))`);
        params.push(`%${search.trim()}%`, `%${search.trim()}%`);
      }

      if (role_id) {
        conditions.push(`u.role_id = ?`);
        params.push(parseInt(role_id, 10));
      }

      if (status) {
        conditions.push(`u.status = ?`);
        params.push(status);
      }

      if (department) {
        conditions.push(`u.department = ?`);
        params.push(department);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countResult = await query(
        `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Data query with active task count
      const users = await query(
        `SELECT u.id, u.role_id, u.name, u.email, u.department, u.phone, u.status,
                u.profile_image_url, u.last_login_at, u.created_at,
                r.name AS role_name, r.code AS role_code, r.is_system_admin,
                COUNT(DISTINCT tsa.id) AS active_task_count
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN task_stage_assignments tsa ON u.id = tsa.user_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         ${whereClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offset]
      );

      return successResponse(res, {
        message: 'Employee directory retrieved successfully.',
        data: users,
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
   * GET /api/users/:id
   * Get employee detail profile with assigned role, activity, and permissions summary
   */
  async getUserById(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid user ID.' });
      }

      const users = await query(
        `SELECT u.id, u.role_id, u.name, u.email, u.department, u.phone, u.status,
                u.profile_image_url, u.last_login_at, u.created_at, u.updated_at,
                r.name AS role_name, r.code AS role_code, r.is_system_admin, r.description AS role_description,
                COUNT(DISTINCT tsa.id) AS active_task_count
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN task_stage_assignments tsa ON u.id = tsa.user_id AND tsa.status IN ('ACCEPTED', 'IN_PROGRESS')
         WHERE u.id = ?
         GROUP BY u.id`,
        [userId]
      );

      if (!users || users.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }

      const user = users[0];
      const effectivePerms = await getEffectivePermissions(user.id);

      // Fetch override count
      const overrides = await query(`SELECT COUNT(*) as count FROM user_permissions WHERE user_id = ?`, [user.id]);
      const overridesCount = overrides[0]?.count || 0;

      return successResponse(res, {
        message: `Employee profile for ${user.name}`,
        data: {
          ...user,
          effectivePermissionsCount: effectivePerms.size,
          overridesCount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:id
   * Update employee details and assigned role
   */
  async updateUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid user ID.' });
      }

      const data = updateUserSchema.parse(req.body);

      const targetUsers = await query(`SELECT id, email, role_id, status FROM users WHERE id = ?`, [userId]);
      if (!targetUsers || targetUsers.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }
      const targetUser = targetUsers[0];

      // Admin Safety Guard: Cannot remove admin role from self if current user is the root admin
      if (req.user?.id === userId && targetUser.role_id !== data.role_id) {
        const roles = await query(`SELECT is_system_admin FROM roles WHERE id = ?`, [data.role_id]);
        if (!roles[0]?.is_system_admin) {
          return errorResponse(res, {
            statusCode: 403,
            code: 'CANNOT_DEMOTE_SELF',
            message: 'You cannot remove administrative authority from your own account.',
          });
        }
      }

      // Verify target role exists
      const roles = await query(`SELECT id, name FROM roles WHERE id = ? AND is_active = TRUE`, [data.role_id]);
      if (!roles || roles.length === 0) {
        return errorResponse(res, { statusCode: 400, message: 'Selected role does not exist or is inactive.' });
      }

      await transaction(async (conn) => {
        await conn.query(
          `UPDATE users SET name = ?, department = ?, phone = ?, role_id = ? WHERE id = ?`,
          [data.name.trim(), data.department, data.phone || null, data.role_id, userId]
        );

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'USER_UPDATED', 'USER', ?, ?, ?)`,
          [req.user?.id || null, userId, JSON.stringify({ name: data.name, role: roles[0].name }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Employee '${data.name}' profile updated successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/users/:id/status
   * Activate or suspend an employee account
   */
  async toggleStatus(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid user ID.' });
      }

      const { status } = statusSchema.parse(req.body);

      // Admin Safety Guard: Cannot suspend own account
      if (req.user?.id === userId && status === 'SUSPENDED') {
        return errorResponse(res, {
          statusCode: 403,
          code: 'CANNOT_SUSPEND_SELF',
          message: 'You cannot suspend your own administrative account.',
        });
      }

      const targetUsers = await query(`SELECT id, email, status FROM users WHERE id = ?`, [userId]);
      if (!targetUsers || targetUsers.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }

      await transaction(async (conn) => {
        await conn.query(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);

        // If suspended, terminate all active sessions for that user immediately
        if (status === 'SUSPENDED') {
          await conn.query(
            `DELETE FROM sessions WHERE JSON_EXTRACT(sess, '$.user.id') = ?`,
            [userId]
          );
        }

        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, ?, 'USER', ?, ?, ?)`,
          [
            req.user?.id || null,
            status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
            userId,
            JSON.stringify({ newStatus: status }),
            req.ip,
          ]
        );
      });

      return successResponse(res, {
        message: `Employee account status set to ${status}.`,
        data: { userId, status },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/users/:id/resend-invite
   * Re-generate a fresh 48-hour onboarding token and dispatch email via Resend
   */
  async resendInvitation(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid user ID.' });
      }

      const users = await query(
        `SELECT u.id, u.name, u.email, u.status, r.name AS role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [userId]
      );

      if (!users || users.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }
      const user = users[0];

      if (user.status !== 'INVITED') {
        return errorResponse(res, {
          statusCode: 400,
          code: 'USER_ALREADY_ACTIVE',
          message: 'This employee has already completed setup and is active.',
        });
      }

      // Invalidate existing unused tokens for this user
      await query(`UPDATE invitation_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [userId]);

      // Generate fresh token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await query(
        `INSERT INTO invitation_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt]
      );

      const inviteUrl = `${env.FRONTEND_URL}/set-password?token=${rawToken}`;
      const emailResult = await emailService.sendInvitationEmail({
        to: user.email,
        name: user.name,
        roleName: user.role_name,
        inviteUrl,
      });

      return successResponse(res, {
        message: `New invitation email dispatched to ${user.email}.`,
        data: {
          userId,
          inviteUrl,
          emailDispatched: emailResult.success,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/users/:id
   * Safe removal of unassigned / pending accounts
   */
  async deleteUser(req, res, next) {
    try {
      const userId = parseInt(req.params.id, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid user ID.' });
      }

      // Admin safety: Cannot delete self
      if (req.user?.id === userId) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'CANNOT_DELETE_SELF',
          message: 'You cannot delete your own administrative account.',
        });
      }

      const users = await query(
        `SELECT u.id, u.email, u.name, r.is_system_admin FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
        [userId]
      );
      if (!users || users.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Employee not found.' });
      }
      const user = users[0];

      if (user.is_system_admin) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'ADMIN_ACCOUNT_PROTECTED',
          message: 'System Administrator accounts cannot be deleted.',
        });
      }

      // Check task history
      const assignments = await query(`SELECT id FROM task_stage_assignments WHERE user_id = ?`, [userId]);
      if (assignments && assignments.length > 0) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'USER_HAS_PRODUCTION_HISTORY',
          message: `Cannot delete employee '${user.name}' because they have ${assignments.length} production task assignment records. Please suspend the account instead to preserve audit history.`,
        });
      }

      await transaction(async (conn) => {
        await conn.query(`DELETE FROM user_permissions WHERE user_id = ?`, [userId]);
        await conn.query(`DELETE FROM invitation_tokens WHERE user_id = ?`, [userId]);
        await conn.query(`DELETE FROM password_reset_tokens WHERE user_id = ?`, [userId]);
        await conn.query(`DELETE FROM users WHERE id = ?`, [userId]);
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'USER_DELETED', 'USER', ?, ?, ?)`,
          [req.user?.id || null, userId, JSON.stringify({ email: user.email, name: user.name }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Employee account '${user.name}' deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },
};

