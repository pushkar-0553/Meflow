import { pool, query, transaction } from './src/config/db.js';
import { getEffectivePermissions } from './src/services/authz.service.js';
import { logger } from './src/utils/logger.js';

async function runRbacTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MANDATORY RBAC SPECIFICATION VERIFICATION TEST');
  console.log('======================================================\n');

  try {
    // Step 0: Fetch permission map
    const perms = await query(`SELECT id, \`key\` FROM permissions`);
    const permMap = new Map(perms.map((p) => [p.key, p.id]));

    const taskViewId = permMap.get('tasks.view');
    const workAcceptId = permMap.get('work.accept');
    const proofUploadId = permMap.get('proof.upload');
    const taskAssignId = permMap.get('tasks.assign');
    const prodViewId = permMap.get('production.view_all');

    if (!taskViewId || !workAcceptId || !proofUploadId || !taskAssignId || !prodViewId) {
      throw new Error('Required permission keys not found in database seed.');
    }

    // Step 1: Create Custom Role 'Test Apprentice Editor'
    const timestamp = Date.now();
    const roleName = `Test Apprentice Editor ${timestamp}`;
    const roleCode = `TEST_APPRENTICE_${timestamp}`;
    const roleResult = await query(
      `INSERT INTO roles (name, code, description, is_system_role, is_system_admin, is_active)
       VALUES (?, ?, 'Test role for RBAC lifecycle', FALSE, FALSE, TRUE)`,
      [roleName, roleCode]
    );
    const roleId = roleResult.insertId;
    console.log(`✅ [Step 1] Created test role with ID: ${roleId} (${roleCode})`);

    // Assign 3 initial default permissions to role: tasks.view, work.accept, proof.upload
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?), (?, ?), (?, ?)`,
      [roleId, taskViewId, roleId, workAcceptId, roleId, proofUploadId]
    );
    console.log('✅ [Step 1] Assigned 3 baseline permissions to role: tasks.view, work.accept, proof.upload');

    // Step 2: Create User A (Rahul) and User B (Anjali) with Test Apprentice Editor role
    const userARes = await query(
      `INSERT INTO users (role_id, name, email, department, status)
       VALUES (?, 'Rahul Tester', ?, 'Editing', 'ACTIVE')`,
      [roleId, `test_rahul_${timestamp}@vcube.com`]
    );
    const userAId = userARes.insertId;

    const userBRes = await query(
      `INSERT INTO users (role_id, name, email, department, status)
       VALUES (?, 'Anjali Tester', ?, 'Editing', 'ACTIVE')`,
      [roleId, `test_anjali_${timestamp}@vcube.com`]
    );
    const userBId = userBRes.insertId;
    console.log(`✅ [Step 2] Created User A (Rahul, ID: ${userAId}) and User B (Anjali, ID: ${userBId})`);

    // Step 3: Verify initial effective permissions for both users
    const effA1 = await getEffectivePermissions(userAId);
    const effB1 = await getEffectivePermissions(userBId);

    const checkInitial = (set, name) => {
      const hasView = set.has('tasks.view');
      const hasAccept = set.has('work.accept');
      const hasUpload = set.has('proof.upload');
      const hasAssign = set.has('tasks.assign');
      console.log(`   ${name} Effective Permissions (${set.size}): [${Array.from(set).join(', ')}]`);
      if (!hasView || !hasAccept || !hasUpload || hasAssign || set.size !== 3) {
        throw new Error(`Initial permission mismatch for ${name}`);
      }
    };
    checkInitial(effA1, 'Rahul (User A)');
    checkInitial(effB1, 'Anjali (User B)');
    console.log('✅ [Step 3] Both users correctly inherited exactly the 3 default role permissions.');

    // Step 4: Add User-Specific ALLOW override for tasks.assign ONLY to User A (Rahul)
    await query(
      `INSERT INTO user_permissions (user_id, permission_id, effect) VALUES (?, ?, 'ALLOW')`,
      [userAId, taskAssignId]
    );
    console.log('✅ [Step 4] Added user override: tasks.assign (ALLOW) to Rahul only.');

    const effA2 = await getEffectivePermissions(userAId);
    const effB2 = await getEffectivePermissions(userBId);

    if (!effA2.has('tasks.assign') || effA2.size !== 4) {
      throw new Error('Rahul failed to receive user-specific tasks.assign override!');
    }
    if (effB2.has('tasks.assign') || effB2.size !== 3) {
      throw new Error('Leak detected! Anjali received tasks.assign which was only granted to Rahul!');
    }
    console.log('✅ [Step 4] Verified Rahul received tasks.assign, and Anjali did NOT receive it.');

    // Step 5: Add User-Specific DENY override for proof.upload to User B (Anjali)
    await query(
      `INSERT INTO user_permissions (user_id, permission_id, effect) VALUES (?, ?, 'DENY')`,
      [userBId, proofUploadId]
    );
    console.log('✅ [Step 5] Added user restriction: proof.upload (DENY) to Anjali.');

    const effB3 = await getEffectivePermissions(userBId);
    if (effB3.has('proof.upload') || effB3.size !== 2) {
      throw new Error('Anjali DENY override failed to strip proof.upload!');
    }
    console.log('✅ [Step 5] Verified Anjali is stripped of proof.upload (Effective: 2).');

    // Step 6: Update the Role default permissions (Add production.view_all to the Role)
    await query(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
      [roleId, prodViewId]
    );
    console.log('✅ [Step 6] Modified Role default permissions: added production.view_all to role.');

    const effA3 = await getEffectivePermissions(userAId);
    const effB4 = await getEffectivePermissions(userBId);

    // Verify Rahul: 3 base + 1 new base (production.view_all) + 1 personal override (tasks.assign) = 5
    if (!effA3.has('production.view_all') || !effA3.has('tasks.assign') || effA3.size !== 5) {
      throw new Error(`Rahul did not inherit updated role permission while keeping personal override! Got: ${Array.from(effA3)}`);
    }

    // Verify Anjali: 3 base + 1 new base (production.view_all) - 1 personal deny (proof.upload) = 3
    if (!effB4.has('production.view_all') || effB4.has('proof.upload') || effB4.size !== 3) {
      throw new Error(`Anjali did not inherit updated role permission while keeping personal deny! Got: ${Array.from(effB4)}`);
    }
    console.log(`   Rahul Final Permissions (${effA3.size}): [${Array.from(effA3).join(', ')}]`);
    console.log(`   Anjali Final Permissions (${effB4.size}): [${Array.from(effB4).join(', ')}]`);
    console.log('✅ [Step 6] Verified dynamic role propagation & override retention for all users.');

    // Step 7: Clean up test records
    await query(`DELETE FROM user_permissions WHERE user_id IN (?, ?)`, [userAId, userBId]);
    await query(`DELETE FROM users WHERE id IN (?, ?)`, [userAId, userBId]);
    await query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    await query(`DELETE FROM roles WHERE id = ?`, [roleId]);
    console.log('✅ [Step 7] Cleaned up temporary test records from TiDB.');

    console.log('\n======================================================');
    console.log('🎉 ALL RBAC & USER OVERRIDE ASSERTIONS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ RBAC TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runRbacTests();
