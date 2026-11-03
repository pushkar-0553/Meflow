import { query } from '../config/db.js';

/**
 * Calculates effective permissions for a user:
 * Effective = (Role Permissions U User ALLOW Overrides) \ User DENY Overrides
 * Admin accounts unconditionally receive all available permissions.
 */
export async function getEffectivePermissions(userId) {
  // 1. Fetch user status and role details
  const users = await query(
    `SELECT u.id, u.role_id, u.status, r.code AS role_code, r.is_system_admin
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ?`,
    [userId]
  );

  if (!users || users.length === 0 || users[0].status !== 'ACTIVE') {
    return new Set();
  }

  const user = users[0];

  // 2. Admin Safety Bypass: System Admins have full master permission set
  if (user.is_system_admin || user.role_code === 'ADMIN') {
    const allPerms = await query(`SELECT \`key\` FROM permissions;`);
    return new Set(allPerms.map((p) => p.key));
  }

  // 3. Fetch Base Role Permissions
  const rolePerms = await query(
    `SELECT p.\`key\`
     FROM role_permissions rp
     JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ?`,
    [user.role_id]
  );

  const effective = new Set(rolePerms.map((p) => p.key));

  // 4. Fetch User-Specific Overrides (ALLOW & DENY)
  const overrides = await query(
    `SELECT p.\`key\`, up.effect
     FROM user_permissions up
     JOIN permissions p ON up.permission_id = p.id
     WHERE up.user_id = ?`,
    [user.id]
  );

  for (const override of overrides) {
    if (override.effect === 'ALLOW') {
      effective.add(override.key);
    } else if (override.effect === 'DENY') {
      effective.delete(override.key);
    }
  }

  return effective;
}
