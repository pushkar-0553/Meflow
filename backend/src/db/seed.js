import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { logger } from '../utils/logger.js';

export const PERMISSIONS_SEED = [
  // User Management
  { key: 'users.view', name: 'View Users', category: 'User Management', description: 'View employee directory, basic details, and status' },
  { key: 'users.create', name: 'Invite/Create User', category: 'User Management', description: 'Send invitation emails to onboard new employees' },
  { key: 'users.edit', name: 'Edit User Details', category: 'User Management', description: 'Update employee profile, department, and phone' },
  { key: 'users.disable', name: 'Deactivate/Enable User', category: 'User Management', description: 'Toggle account active/suspended state' },
  { key: 'users.delete', name: 'Delete User', category: 'User Management', description: 'Permanently remove inactive accounts with no task history' },

  // Role Management
  { key: 'roles.view', name: 'View Roles', category: 'Role Management', description: 'Inspect role definitions and default permission sets' },
  { key: 'roles.create', name: 'Create Role', category: 'Role Management', description: 'Define new custom organizational roles' },
  { key: 'roles.edit', name: 'Edit Role', category: 'Role Management', description: 'Modify role descriptions and default permission sets' },
  { key: 'roles.delete', name: 'Delete Role', category: 'Role Management', description: 'Delete custom roles not currently assigned to users' },

  // Permission Management
  { key: 'permissions.view', name: 'View Permissions', category: 'Permission Management', description: 'View catalog of system permissions and dependencies' },
  { key: 'permissions.override', name: 'Manage User Overrides', category: 'Permission Management', description: 'Apply ALLOW/DENY permission overrides to specific users' },

  // Task Management
  { key: 'tasks.view', name: 'View Tasks', category: 'Task Management', description: 'View production tasks in the general directory' },
  { key: 'tasks.create', name: 'Create Task', category: 'Task Management', description: 'Initialize and configure new production tasks' },
  { key: 'tasks.edit', name: 'Edit Task', category: 'Task Management', description: 'Update title, course, priority, date, or target role' },
  { key: 'tasks.delete', name: 'Cancel/Delete Task', category: 'Task Management', description: 'Cancel or delete tasks before active execution starts' },
  { key: 'tasks.assign', name: 'Direct Task Assign', category: 'Task Management', description: 'Assign/dispatch a task stage directly to a specific user' },
  { key: 'tasks.reassign', name: 'Reassign Task', category: 'Task Management', description: 'Revoke current assignee and reassign to another worker' },

  // Work Execution (Self-Claim & Personal Bucket)
  { key: 'work.pool_view', name: 'View Available Work', category: 'Work Execution', description: 'Browse unassigned tasks in the Available Work Pool' },
  { key: 'work.accept', name: 'Accept Work', category: 'Work Execution', description: 'Claim and self-assign an available stage into My Bucket' },
  { key: 'work.reject', name: 'Decline/Release Work', category: 'Work Execution', description: 'Relinquish an accepted task back to the available pool' },
  { key: 'work.start', name: 'Start Work Stage', category: 'Work Execution', description: 'Transition a stage from ACCEPTED to IN_PROGRESS' },
  { key: 'work.complete', name: 'Complete Work Stage', category: 'Work Execution', description: 'Submit finished stage work with required proof' },

  // Production Pipeline
  { key: 'production.view_all', name: 'View All Pipelines', category: 'Production Pipeline', description: 'Inspect end-to-end production pipelines across all roles' },
  { key: 'production.manage', name: 'Manage Pipeline', category: 'Production Pipeline', description: 'Reorder stages, insert custom stages, or bypass stages' },
  { key: 'production.rollback', name: 'Rollback Stage', category: 'Production Pipeline', description: 'Manually revert a stage to an earlier state' },

  // Proof & Assets
  { key: 'proof.view', name: 'View Proofs', category: 'Proof & Assets', description: 'Inspect uploaded raw files, review cuts, and links' },
  { key: 'proof.upload', name: 'Upload Proof', category: 'Proof & Assets', description: 'Submit video links, photos, or documents as stage proof' },
  { key: 'proof.delete', name: 'Remove Proof', category: 'Proof & Assets', description: 'Delete mistakenly uploaded proof files prior to approval' },

  // Review & Approval
  { key: 'approval.review', name: 'Review Stage Work', category: 'Review & Approval', description: 'Evaluate submitted proof for First Cut / Final Cut' },
  { key: 'approval.approve', name: 'Approve Stage', category: 'Review & Approval', description: 'Grant formal sign-off to proceed to next stage' },
  { key: 'approval.reject', name: 'Request Rework', category: 'Review & Approval', description: 'Reject submitted cut with mandatory feedback notes' },

  // Social Publishing
  { key: 'publishing.view', name: 'View Published Logs', category: 'Social Publishing', description: 'Inspect archive of published posts and live URLs' },
  { key: 'publishing.publish', name: 'Record Publication', category: 'Social Publishing', description: 'Submit final post URL, platform, and screenshot proof' },
  { key: 'publishing.manage', name: 'Edit Publication Meta', category: 'Social Publishing', description: 'Update social platform links or publication tags' },

  // Calendar & Scheduling
  { key: 'calendar.view_own', name: 'View Own Calendar', category: 'Calendar & Scheduling', description: 'Access personal scheduled timeline' },
  { key: 'calendar.view_all', name: 'View All Calendars', category: 'Calendar & Scheduling', description: 'Access high-level team schedule and studio shoots' },
  { key: 'calendar.manage', name: 'Manage Calendar', category: 'Calendar & Scheduling', description: 'Reschedule shooting blocks and adjust time allocations' },

  // Workload & Team
  { key: 'workload.view_all', name: 'View Team Workload', category: 'Workload & Team', description: 'Inspect task load, active counts, and bottleneck metrics' },

  // Analytics & Reports
  { key: 'analytics.view', name: 'View Dashboard Stats', category: 'Analytics & Reports', description: 'Access production KPI counters and stage metrics' },
  { key: 'reports.view', name: 'View Reports', category: 'Analytics & Reports', description: 'Access deep-dive productivity and duration reports' },
  { key: 'reports.export', name: 'Export Reports', category: 'Analytics & Reports', description: 'Export CSV/PDF dumps of production history' },

  // Audit & Governance
  { key: 'audit.view', name: 'View Audit Logs', category: 'Audit & Governance', description: 'Inspect immutable system-wide activity and security logs' },

  // System Settings
  { key: 'settings.view', name: 'View System Settings', category: 'System Settings', description: 'Inspect storage, email, and company configurations' },
  { key: 'settings.manage', name: 'Update Settings', category: 'System Settings', description: 'Modify platform parameters and notification thresholds' },
];

export const ROLES_SEED = [
  { name: 'Admin', code: 'ADMIN', description: 'Complete system authority and management', is_system_role: true, is_system_admin: true },
  { name: 'Cinematographer', code: 'CINEMATOGRAPHER', description: 'Handles camera shoots, lighting, and raw footage recording', is_system_role: true, is_system_admin: false },
  { name: 'Photographer', code: 'PHOTOGRAPHER', description: 'Handles stills, thumbnail shoots, and event photography', is_system_role: true, is_system_admin: false },
  { name: 'Video Editor', code: 'EDITOR', description: 'Edits raw footage, color grades, and crafts preview/final cuts', is_system_role: true, is_system_admin: false },
  { name: 'SEO Specialist', code: 'SEO', description: 'Optimizes titles, tags, descriptions, and oversees web/YouTube distribution', is_system_role: true, is_system_admin: false },
  { name: 'Graphic Designer', code: 'DESIGNER', description: 'Creates promotional banners, YouTube thumbnails, and graphics', is_system_role: true, is_system_admin: false },
  { name: 'Content Creator', code: 'CONTENT_CREATOR', description: 'Drafts scripts, briefs, and on-camera presentations', is_system_role: true, is_system_admin: false },
  { name: 'Social Media Manager', code: 'SOCIAL_MEDIA_MGR', description: 'Publishes posts across channels, tracks live engagements and performance', is_system_role: true, is_system_admin: false },
  { name: 'Production Manager', code: 'PRODUCTION_MGR', description: 'Orchestrates the pipeline, reviews cuts, and assigns bottlenecks', is_system_role: true, is_system_admin: false },
];

// Initial role mapping (keys for non-admin roles)
const ROLE_PERMISSIONS_MAPPING = {
  CINEMATOGRAPHER: [
    'tasks.view', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'calendar.view_own'
  ],
  PHOTOGRAPHER: [
    'tasks.view', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'calendar.view_own'
  ],
  EDITOR: [
    'tasks.view', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'calendar.view_own'
  ],
  SEO: [
    'tasks.view', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'publishing.view', 'publishing.publish', 'publishing.manage', 'calendar.view_own'
  ],
  DESIGNER: [
    'tasks.view', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'calendar.view_own'
  ],
  CONTENT_CREATOR: [
    'tasks.view', 'tasks.create', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'proof.delete', 'calendar.view_own'
  ],
  SOCIAL_MEDIA_MGR: [
    'tasks.view', 'production.view_all', 'work.pool_view', 'work.accept', 'work.reject', 'work.start', 'work.complete',
    'proof.view', 'proof.upload', 'approval.review', 'publishing.view', 'publishing.publish', 'publishing.manage',
    'calendar.view_own', 'calendar.view_all', 'workload.view_all'
  ],
  PRODUCTION_MGR: [
    'users.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.reassign',
    'production.view_all', 'production.manage', 'production.rollback', 'work.pool_view', 'work.accept',
    'work.reject', 'work.start', 'work.complete', 'proof.view', 'proof.upload', 'proof.delete',
    'approval.review', 'approval.approve', 'approval.reject', 'publishing.view', 'publishing.publish',
    'calendar.view_own', 'calendar.view_all', 'calendar.manage', 'workload.view_all', 'analytics.view',
    'reports.view', 'reports.export', 'audit.view'
  ]
};

export async function runSeeds() {
  logger.info('Starting database seeding...');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Seed Permissions
    const permMap = new Map();
    for (const p of PERMISSIONS_SEED) {
      await connection.query(
        `INSERT INTO permissions (\`key\`, name, category, description)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), description=VALUES(description);`,
        [p.key, p.name, p.category, p.description]
      );
    }
    const [allPerms] = await connection.query(`SELECT id, \`key\` FROM permissions;`);
    for (const perm of allPerms) {
      permMap.set(perm.key, perm.id);
    }
    logger.success(`Seeded ${allPerms.length} permissions.`);

    // 2. Seed Roles
    const roleMap = new Map();
    for (const r of ROLES_SEED) {
      await connection.query(
        `INSERT INTO roles (name, code, description, is_system_role, is_system_admin, is_active)
         VALUES (?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), is_system_admin=VALUES(is_system_admin);`,
        [r.name, r.code, r.description, r.is_system_role, r.is_system_admin]
      );
    }
    const [allRoles] = await connection.query(`SELECT id, code FROM roles;`);
    for (const role of allRoles) {
      roleMap.set(role.code, role.id);
    }
    logger.success(`Seeded ${allRoles.length} roles.`);

    // 3. Map Default Role Permissions
    for (const [roleCode, permKeys] of Object.entries(ROLE_PERMISSIONS_MAPPING)) {
      const roleId = roleMap.get(roleCode);
      if (!roleId) continue;

      for (const key of permKeys) {
        const permId = permMap.get(key);
        if (!permId) continue;

        await connection.query(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?);`,
          [roleId, permId]
        );
      }
    }
    logger.success('Mapped default role permissions.');

    // 4. Seed Default Administrator Account
    const adminRoleId = roleMap.get('ADMIN');
    const defaultAdminEmail = 'admin@vcube.com';
    const defaultPasswordHash = await bcrypt.hash('Admin@12345', 12);

    await connection.query(
      `INSERT INTO users (role_id, name, email, password_hash, department, status)
       VALUES (?, 'System Administrator', ?, ?, 'Operations', 'ACTIVE')
       ON DUPLICATE KEY UPDATE role_id=VALUES(role_id), status='ACTIVE';`,
      [adminRoleId, defaultAdminEmail, defaultPasswordHash]
    );
    logger.success(`Default Administrator verified (${defaultAdminEmail} / Admin@12345).`);

    await connection.commit();
    logger.success('All database seeds completed successfully!');
    return { success: true };
  } catch (error) {
    await connection.rollback();
    logger.error('Database seeding failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Direct execution from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  runSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

