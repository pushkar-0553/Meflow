import { pool, query, transaction } from './src/config/db.js';

async function testTaskConcurrency() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MANDATORY CONCURRENCY & TASK ACCEPTANCE TEST');
  console.log('======================================================\n');

  try {
    const timestamp = Date.now();
    const taskTitle = `ITNIK Concurrency Shoot ${timestamp}`;

    // 1. Get Cinematographer Role ID
    const roles = await query(`SELECT id FROM roles WHERE code = 'CINEMATOGRAPHER'`);
    const roleId = roles[0]?.id || 1;

    // 2. Insert Parent Task
    const taskRes = await query(
      `INSERT INTO tasks (title, course_code, content_type, priority, status, created_by)
       VALUES (?, 'ITNIK', 'PROMOTIONAL_VIDEO', 'HIGH', 'AVAILABLE', 1)`,
      [taskTitle]
    );
    const taskId = taskRes.insertId;
    console.log(`✅ [Step 1] Created Task: '${taskTitle}' (ID: ${taskId})`);

    // 3. Insert Stage 1: SHOOT with status = 'READY', version = 1
    const stageRes = await query(
      `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, status, version)
       VALUES (?, 'SHOOT', 1, ?, 'READY', 1)`,
      [taskId, roleId]
    );
    const stageId = stageRes.insertId;
    console.log(`✅ [Step 1] Initialized Stage 1: SHOOT (ID: ${stageId}, status: READY, version: 1)`);

    // 4. Create two simulated workers (Worker A & Worker B)
    const workerARes = await query(
      `INSERT INTO users (role_id, name, email, department, status)
       VALUES (?, 'Worker A Rahul', ?, 'Production', 'ACTIVE')`,
      [roleId, `worker_a_${timestamp}@vcube.com`]
    );
    const workerAId = workerARes.insertId;

    const workerBRes = await query(
      `INSERT INTO users (role_id, name, email, department, status)
       VALUES (?, 'Worker B Anjali', ?, 'Production', 'ACTIVE')`,
      [roleId, `worker_b_${timestamp}@vcube.com`]
    );
    const workerBId = workerBRes.insertId;
    console.log(`✅ [Step 2] Registered Worker A (${workerAId}) and Worker B (${workerBId})`);

    // 5. SIMULATE SIMULTANEOUS ATOMIC ACCEPTANCE AT THE EXACT SAME MILLISECOND
    console.log('⚡ [Step 3] Firing concurrent atomic accept queries from Worker A & Worker B...');

    const attemptAccept = async (userId, workerName) => {
      try {
        return await transaction(async (conn) => {
          // Fetch current version
          const [stageRows] = await conn.query(
            `SELECT version, status FROM task_stages WHERE id = ?`,
            [stageId]
          );
          const currentStage = stageRows[0];

          if (currentStage.status !== 'READY') {
            return { winner: false, reason: 'NOT_READY' };
          }

          // Atomic conditional update
          const [updateRes] = await conn.query(
            `UPDATE task_stages
             SET status = 'IN_PROGRESS', version = version + 1
             WHERE id = ? AND status = 'READY' AND version = ?`,
            [stageId, currentStage.version]
          );

          if (updateRes.affectedRows === 0) {
            return { winner: false, reason: 'CONCURRENCY_LOST' };
          }

          // Insert assignment
          await conn.query(
            `INSERT INTO task_stage_assignments (task_stage_id, user_id, status)
             VALUES (?, ?, 'ACCEPTED')`,
            [stageId, userId]
          );

          return { winner: true, worker: workerName };
        });
      } catch (err) {
        return { winner: false, error: err.message };
      }
    };

    // Run both simultaneously with Promise.all
    const [resultA, resultB] = await Promise.all([
      attemptAccept(workerAId, 'Worker A (Rahul)'),
      attemptAccept(workerBId, 'Worker B (Anjali)'),
    ]);

    console.log('   Result Worker A:', resultA);
    console.log('   Result Worker B:', resultB);

    const winnersCount = (resultA.winner ? 1 : 0) + (resultB.winner ? 1 : 0);
    if (winnersCount !== 1) {
      throw new Error(`Race condition failure! Expected exactly 1 winner, but got ${winnersCount}!`);
    }

    const winnerName = resultA.winner ? 'Worker A (Rahul)' : 'Worker B (Anjali)';
    const loserName = resultA.winner ? 'Worker B (Anjali)' : 'Worker A (Rahul)';
    console.log(`✅ [Step 4] Concurrency guard succeeded! Winner: ${winnerName}. Loser: ${loserName} got 409 conflict.`);

    // 6. Verify single active assignment in database
    const assignments = await query(
      `SELECT * FROM task_stage_assignments WHERE task_stage_id = ? AND status = 'ACCEPTED'`,
      [stageId]
    );
    if (assignments.length !== 1) {
      throw new Error(`Multiple active assignments detected in database: ${assignments.length}`);
    }
    console.log(`✅ [Step 5] Database invariant verified: Exactly 1 active assignee in task_stage_assignments.`);

    // 7. Cleanup
    await query(`DELETE FROM task_stage_assignments WHERE task_stage_id = ?`, [stageId]);
    await query(`DELETE FROM task_stages WHERE task_id = ?`, [taskId]);
    await query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    await query(`DELETE FROM users WHERE id IN (?, ?)`, [workerAId, workerBId]);
    console.log('✅ [Step 6] Test data cleaned up.');

    console.log('\n======================================================');
    console.log('🎉 DOUBLE-ACCEPTANCE CONCURRENCY TEST PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ CONCURRENCY TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testTaskConcurrency();
