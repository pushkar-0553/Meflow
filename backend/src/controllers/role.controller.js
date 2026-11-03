import { z } from 'zod';
import { query, transaction } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const roleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  code: z.string().min(2, 'Role code must be uppercase alphanumeric').regex(/^[A-Z0-9_]+$/, 'Code must be uppercase with underscores only (e.g. VIDEO_EDITOR)'),
  description: z.string().optional().nullable(),
  permission_ids: z.array(z.number().int().positive()).default([]),
});

const updateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  permission_ids: z.array(z.number().int().positive()).default([]),
});

export const roleController = {
  /**
   * GET /api/roles
   * List all roles with user counts and permission counts
   */
  async getAllRoles(req, res, next) {
    try {
      const roles = await query(
        `SELECT r.id, r.name, r.code, r.description, r.is_system_role, r.is_system_admin, r.is_active,
                r.created_at, r.updated_at,
                COUNT(DISTINCT u.id) AS user_count,
                COUNT(DISTINCT rp.permission_id) AS permission_count
         FROM roles r
         LEFT JOIN users u ON r.id = u.role_id AND u.status = 'ACTIVE'
         LEFT JOIN role_permissions rp ON r.id = rp.role_id
         GROUP BY r.id, r.name, r.code, r.description, r.is_system_role, r.is_system_admin, r.is_active, r.created_at, r.updated_at
         ORDER BY r.is_system_admin DESC, r.id ASC`
      );

      return successResponse(res, {
        message: 'Roles retrieved successfully.',
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/roles/:id
   * Get single role details with linked permission IDs
   */
  async getRoleById(req, res, next) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Role ID.' });
      }

      const roles = await query(`SELECT * FROM roles WHERE id = ?`, [roleId]);
      if (!roles || roles.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Role not found.' });
      }

      const role = roles[0];
      const permissions = await query(
        `SELECT p.id, p.\`key\`, p.name, p.category, p.description
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ?
         ORDER BY p.category ASC, p.id ASC`,
        [roleId]
      );

      return successResponse(res, {
        message: `Role: ${role.name}`,
        data: {
          ...role,
          permissions,
          permission_ids: permissions.map((p) => p.id),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/roles
   * Create new custom dynamic role
   */
  async createRole(req, res, next) {
    try {
      const data = roleSchema.parse(req.body);

      // Check for code/name collisions
      const existing = await query(
        `SELECT id FROM roles WHERE LOWER(name) = LOWER(?) OR UPPER(code) = UPPER(?)`,
        [data.name.trim(), data.code.trim()]
      );

      if (existing && existing.length > 0) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'ROLE_ALREADY_EXISTS',
          message: 'A role with this name or code already exists.',
        });
      }

      let createdRoleId;

      await transaction(async (conn) => {
        const [result] = await conn.query(
          `INSERT INTO roles (name, code, description, is_system_role, is_system_admin, is_active)
           VALUES (?, ?, ?, FALSE, FALSE, TRUE)`,
          [data.name.trim(), data.code.trim().toUpperCase(), data.description || null]
        );
        createdRoleId = result.insertId;

        // Map permissions
        if (data.permission_ids.length > 0) {
          const values = data.permission_ids.map((pId) => [createdRoleId, pId]);
          await conn.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
            [values]
          );
        }

        // Audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'ROLE_CREATED', 'ROLE', ?, ?, ?)`,
          [req.user?.id || null, createdRoleId, JSON.stringify({ name: data.name, code: data.code }), req.ip]
        );
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Role '${data.name}' created successfully with ${data.permission_ids.length} permissions.`,
        data: {
          id: createdRoleId,
          name: data.name,
          code: data.code.toUpperCase(),
          permission_count: data.permission_ids.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/roles/:id
   * Update role metadata and default permission template
   */
  async updateRole(req, res, next) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Role ID.' });
      }

      const data = updateRoleSchema.parse(req.body);

      const roles = await query(`SELECT * FROM roles WHERE id = ?`, [roleId]);
      if (!roles || roles.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Role not found.' });
      }
      const role = roles[0];

      // Admin Safety Guard: Cannot strip Admin role of permissions
      if (role.is_system_admin) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'ADMIN_ROLE_PROTECTED',
          message: 'The System Administrator role cannot be modified. It holds master authority by design.',
        });
      }

      await transaction(async (conn) => {
        // Update basic info
        await conn.query(
          `UPDATE roles SET name = ?, description = ? WHERE id = ?`,
          [data.name.trim(), data.description || null, roleId]
        );

        // Replace permissions
        await conn.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
        if (data.permission_ids.length > 0) {
          const values = data.permission_ids.map((pId) => [roleId, pId]);
          await conn.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ?`,
            [values]
          );
        }

        // Audit log
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'ROLE_UPDATED', 'ROLE', ?, ?, ?)`,
          [req.user?.id || null, roleId, JSON.stringify({ name: data.name, permCount: data.permission_ids.length }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Role '${data.name}' updated successfully with ${data.permission_ids.length} permissions.`,
        data: {
          id: roleId,
          name: data.name,
          permission_count: data.permission_ids.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/roles/:id/duplicate
   * Clone a role and its complete permission configuration
   */
  async duplicateRole(req, res, next) {
    try {
      const sourceRoleId = parseInt(req.params.id, 10);
      if (isNaN(sourceRoleId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Role ID.' });
      }

      const sources = await query(`SELECT * FROM roles WHERE id = ?`, [sourceRoleId]);
      if (!sources || sources.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Source role not found.' });
      }
      const source = sources[0];

      const sourcePerms = await query(`SELECT permission_id FROM role_permissions WHERE role_id = ?`, [sourceRoleId]);
      const permIds = sourcePerms.map((p) => p.permission_id);

      const newName = `${source.name} (Copy)`;
      const newCode = `${source.code}_COPY_${Date.now().toString().slice(-4)}`;

      let newRoleId;
      await transaction(async (conn) => {
        const [res] = await conn.query(
          `INSERT INTO roles (name, code, description, is_system_role, is_system_admin, is_active)
           VALUES (?, ?, ?, FALSE, FALSE, TRUE)`,
          [newName, newCode, `Duplicated from ${source.name}`]
        );
        newRoleId = res.insertId;

        if (permIds.length > 0) {
          const values = permIds.map((pId) => [newRoleId, pId]);
          await conn.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ?`, [values]);
        }
      });

      return successResponse(res, {
        statusCode: 201,
        message: `Role cloned successfully as '${newName}'.`,
        data: {
          id: newRoleId,
          name: newName,
          code: newCode,
          permission_count: permIds.length,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/roles/:id
   * Delete custom role if unassigned and not a system role
   */
  async deleteRole(req, res, next) {
    try {
      const roleId = parseInt(req.params.id, 10);
      if (isNaN(roleId)) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid Role ID.' });
      }

      const roles = await query(`SELECT * FROM roles WHERE id = ?`, [roleId]);
      if (!roles || roles.length === 0) {
        return errorResponse(res, { statusCode: 404, message: 'Role not found.' });
      }
      const role = roles[0];

      if (role.is_system_role || role.is_system_admin) {
        return errorResponse(res, {
          statusCode: 403,
          code: 'SYSTEM_ROLE_PROTECTED',
          message: 'System default roles cannot be deleted.',
        });
      }

      // Check if any employees currently hold this role
      const users = await query(`SELECT id FROM users WHERE role_id = ?`, [roleId]);
      if (users && users.length > 0) {
        return errorResponse(res, {
          statusCode: 409,
          code: 'ROLE_IN_USE',
          message: `Cannot delete role '${role.name}' because ${users.length} employee(s) are currently assigned to it. Reassign them first.`,
        });
      }

      await transaction(async (conn) => {
        await conn.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
        await conn.query(`DELETE FROM roles WHERE id = ?`, [roleId]);
        await conn.query(
          `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
           VALUES (?, 'ROLE_DELETED', 'ROLE', ?, ?, ?)`,
          [req.user?.id || null, roleId, JSON.stringify({ name: role.name, code: role.code }), req.ip]
        );
      });

      return successResponse(res, {
        message: `Role '${role.name}' deleted successfully.`,
      });
    } catch (error) {
      next(error);
    }
  },
};

