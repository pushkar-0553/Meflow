import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { getEffectivePermissions } from '../services/authz.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const userOverrideSchema = z.object({
  overrides: z.array(
    z.object({
      permission_id: z.number().int().positive(),
      effect: z.enum(['ALLOW', 'DENY']),
    })
  ),
});

export const permissionController = {
  /**
   * GET /api/permissions
   * Return complete catalog of permissions grouped by category
   */
  async getAllPermissions(req, res, next) {
    try {
      const rows = await query(
        `SELECT id, \`key\`, name, category, description
         FROM permissions
         ORDER BY category ASC, id ASC`
      );

      // Group by category
      const grouped = {};
      for (const p of rows) {
        if (!grouped[p.category]) {
          grouped[p.category] = [];
        }
        grouped[p.category].push(p);
      }

      return successResponse(res, {
        message: 'Permission catalog retrieved successfully.',
        data: {
          total: rows.length,
          categories: grouped,
          all: rows,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/users/:userId/permissions
   * Inspect a user's role permissions, user-specific overrides, and effective result
   */
  async getUserPermissions(req, res, next) {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid User ID.' });
      }

      const users = await query(
        `SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name, r.code AS role_code, r.is_system_admin
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [userId]
      );

      if (!users || users.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'User not found.' });
      }

      const user = users[0];

      // 1. Base Role Permissions
      const rolePerms = await query(
        `SELECT p.id, p.\`key\`, p.name, p.category, p.description
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ?
         ORDER BY p.category ASC, p.id ASC`,
        [user.role_id]
      );

      // 2. User Specific Overrides
      const userOverrides = await query(
        `SELECT up.permission_id, up.effect, p.\`key\`, p.name, p.category
         FROM user_permissions up
         JOIN permissions p ON up.permission_id = p.id
         WHERE up.user_id = ?`,
        [user.id]
      );

      // 3. Calculated Effective Permissions
      const effectiveSet = await getEffectivePermissions(user.id);

      return successResponse(res, {
        message: `Permissions for employee ${user.name}`,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role_id: user.role_id,
            role_name: user.role_name,
            role_code: user.role_code,
            is_system_admin: Boolean(user.is_system_admin),
          },
          rolePermissions: rolePerms,
          userOverrides: userOverrides,
          effectivePermissions: Array.from(effectiveSet),
          effectiveCount: effectiveSet.size,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/users/:userId/permissions
   * Update user-specific ALLOW/DENY overrides
   */
  async updateUserPermissions(req, res, next) {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid User ID.' });
      }

      const { overrides } = userOverrideSchema.parse(req.body);

      // Safety: Prevent stripping root admin permissions
      const targetUser = await query(`SELECT id, email, role_id FROM users WHERE id = ?`, [userId]);
      if (!targetUser || targetUser.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'User not found.' });
      }

      await transaction(async (conn) => {
        // Clear existing overrides for this user
        await conn.query(`DELETE FROM user_permissions WHERE user_id = ?`, [userId]);

        // Insert new overrides
        if (overrides.length > 0) {
          const values = overrides.map((o) => [userId, o.permission_id, o.effect]);
          await conn.query(
            `INSERT INTO user_permissions (user_id, permission_id, effect) VALUES ?`,
            [values]
          );
        }

        // Record audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'USER_PERMISSIONS_OVERRIDDEN', 'USER', ?, ?, ?)`,
          [req.user?.id || null, userId, JSON.stringify({ overrideCount: overrides.length }), req.ip]
        );
      });

      const updatedEffective = await getEffectivePermissions(userId);

      return successResponse(res, {
        message: 'User-specific permissions updated successfully.',
        data: {
          userId,
          overridesCount: overrides.length,
          effectivePermissions: Array.from(updatedEffective),
          effectiveCount: updatedEffective.size,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
