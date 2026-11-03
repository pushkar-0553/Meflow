import { query, pool } from './src/config/db.js';
import { workflowController } from './src/controllers/workflow.controller.js';

// Mock Express response
function createMockRes() {
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
  };
  return res;
}

async function runWorkflowTest() {
  console.log('--- TESTING WORKFLOW TRANSITIONS & APPROVAL GATE PIPELINE ---');

  // 1. Fetch Admin and a Worker user
  const adminRows = await query(`SELECT id, email, role_id FROM users WHERE email = 'admin@vcube.com'`);
  if (!adminRows || adminRows.length === 0) {
    throw new Error('Admin user not found');
  }
  const admin = adminRows[0];

  const editorRoles = await query(`SELECT id FROM roles WHERE code = 'EDITOR'`);
  const editorRoleId = editorRoles[0]?.id;

  const cinematographerRoles = await query(`SELECT id FROM roles WHERE code = 'CINEMATOGRAPHER'`);
  const shootRoleId = cinematographerRoles[0]?.id;

  // Find or create test worker
  let workerRows = await query(`SELECT id, email FROM users WHERE email = 'editor.test@vcube.com'`);
  let workerId;
  if (workerRows.length > 0) {
    workerId = workerRows[0].id;
  } else {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role_id, status)
       VALUES ('Workflow Test Editor', 'editor.test@vcube.com', 'dummy_hash', ?, 'ACTIVE')`,
      [editorRoleId]
    );
    workerId = res.insertId;
  }

  console.log(`Using Admin ID: ${admin.id}, Worker ID: ${workerId}`);

  // 2. Create a fresh test task with 3 stages
  const taskRes = await query(
    `INSERT INTO tasks (title, course_code, content_type, priority, status, created_by)
     VALUES ('Workflow Gate Test Video', 'REACT_PROMO', 'PROMOTIONAL_VIDEO', 'HIGH', 'IN_PROGRESS', ?)`,
    [admin.id]
  );
  const taskId = taskRes.insertId;
  console.log(`Created Test Task ID: ${taskId}`);

  // Stage 1: SHOOT (seq 1, not approval gate, READY)
  const s1Res = await query(
    `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, is_approval_gate, status)
     VALUES (?, 'SHOOT', 1, ?, FALSE, 'READY')`,
    [taskId, shootRoleId]
  );
  const s1Id = s1Res.insertId;

  // Stage 2: FIRST_CUT (seq 2, IS approval gate, PENDING)
  const s2Res = await query(
    `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, is_approval_gate, status)
     VALUES (?, 'FIRST_CUT', 2, ?, TRUE, 'PENDING')`,
    [taskId, editorRoleId]
  );
  const s2Id = s2Res.insertId;

  // Stage 3: FINAL_CUT (seq 3, not approval gate, PENDING)
  const s3Res = await query(
    `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, is_approval_gate, status)
     VALUES (?, 'FINAL_CUT', 3, ?, FALSE, 'PENDING')`,
    [taskId, editorRoleId]
  );
  const s3Id = s3Res.insertId;

  console.log(`Stages Initialized -> Stage 1: ${s1Id} (READY), Stage 2: ${s2Id} (PENDING, Gate), Stage 3: ${s3Id} (PENDING)`);

  // Assign Stage 1 to worker
  await query(
    `INSERT INTO task_stage_assignments (task_stage_id, user_id, assigned_by, assignment_type, status)
     VALUES (?, ?, ?, 'ADMIN_DIRECT', 'IN_PROGRESS')`,
    [s1Id, workerId, admin.id]
  );

  // STEP 3: Complete Stage 1 (SHOOT) -> Should auto-unlock Stage 2 (FIRST_CUT)
  console.log('\n--> Executing Stage 1 completion...');
  const req1 = {
    params: { stageId: s1Id.toString() },
    body: { comments: 'Shoot wrapped successfully' },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const res1 = createMockRes();
  await workflowController.completeStage(req1, res1, (err) => { if (err) throw err; });

  console.log('Stage 1 Complete Response:', res1.statusCode, res1.payload?.message);
  if (res1.statusCode !== 200) {
    throw new Error(`Failed to complete Stage 1: ${JSON.stringify(res1.payload)}`);
  }

  // Verify Stage 1 is APPROVED and Stage 2 is READY
  const s1Check = await query(`SELECT status FROM task_stages WHERE id = ?`, [s1Id]);
  const s2Check = await query(`SELECT status FROM task_stages WHERE id = ?`, [s2Id]);
  console.log(`Verification: Stage 1 status = ${s1Check[0].status}, Stage 2 status = ${s2Check[0].status}`);
  if (s1Check[0].status !== 'APPROVED' || s2Check[0].status !== 'READY') {
    throw new Error('Auto-unlock failed: Stage 2 did not transition to READY');
  }

  // STEP 4: Worker accepts and starts Stage 2 (FIRST_CUT)
  await query(
    `INSERT INTO task_stage_assignments (task_stage_id, user_id, assigned_by, assignment_type, status)
     VALUES (?, ?, ?, 'SELF_CLAIM', 'IN_PROGRESS')`,
    [s2Id, workerId, workerId]
  );
  await query(`UPDATE task_stages SET status = 'IN_PROGRESS' WHERE id = ?`, [s2Id]);

  // STEP 5: Worker completes Stage 2 (Approval Gate) -> Should transition to SUBMITTED
  console.log('\n--> Submitting Stage 2 (Approval Gate) for review...');
  const req2 = {
    params: { stageId: s2Id.toString() },
    body: { comments: 'Uploaded rough cut v1 to Frame.io' },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const res2 = createMockRes();
  await workflowController.completeStage(req2, res2, (err) => { if (err) throw err; });

  console.log('Stage 2 Submit Response:', res2.statusCode, res2.payload?.message);
  const s2SubmittedCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s2Id]);
  const taskCheck1 = await query(`SELECT status FROM tasks WHERE id = ?`, [taskId]);
  console.log(`Verification: Stage 2 status = ${s2SubmittedCheck[0].status}, Task status = ${taskCheck1[0].status}`);
  if (s2SubmittedCheck[0].status !== 'SUBMITTED' || taskCheck1[0].status !== 'UNDER_REVIEW') {
    throw new Error('Approval gate failed: Stage 2 is not SUBMITTED or task is not UNDER_REVIEW');
  }

  // STEP 6: Check pending reviews list
  console.log('\n--> Querying pending reviews endpoint...');
  const reqPending = { user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' } };
  const resPending = createMockRes();
  await workflowController.getPendingReviews(reqPending, resPending, (err) => { if (err) throw err; });
  console.log(`Pending reviews found: ${resPending.payload?.data?.length}`);
  const foundOurCut = resPending.payload?.data?.some((item) => item.stage_id === s2Id);
  if (!foundOurCut) {
    throw new Error('Pending review list did not include our submitted stage');
  }

  // STEP 7: Manager requests changes (Rework Loop)
  console.log('\n--> Manager reviewing cut: REQUESTING CHANGES...');
  const reqReviewRework = {
    params: { stageId: s2Id.toString() },
    body: {
      decision: 'CHANGES_REQUESTED',
      rework_comments: 'Audio sync needed on speaker intro at 00:45. Enhance lower thirds.',
    },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
    ip: '127.0.0.1',
  };
  const resReviewRework = createMockRes();
  await workflowController.reviewStage(reqReviewRework, resReviewRework, (err) => { if (err) throw err; });
  console.log('Rework Decision Response:', resReviewRework.statusCode, resReviewRework.payload?.message);

  const s2ReworkCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s2Id]);
  const approvalRows = await query(`SELECT * FROM stage_approvals WHERE task_stage_id = ?`, [s2Id]);
  console.log(`Verification: Stage 2 status = ${s2ReworkCheck[0].status}`);
  console.log(`Recorded approval decision: ${approvalRows[0]?.decision}, Comments: "${approvalRows[0]?.rework_comments}"`);
  if (s2ReworkCheck[0].status !== 'CHANGES_REQUESTED') {
    throw new Error('Rework state transition failed');
  }

  // STEP 8: Worker addresses feedback and resubmits
  console.log('\n--> Worker resubmitting cut after fixes...');
  const reqResubmit = {
    params: { stageId: s2Id.toString() },
    body: { comments: 'Replaced audio track and fixed lower thirds.' },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const resResubmit = createMockRes();
  await workflowController.completeStage(reqResubmit, resResubmit, (err) => { if (err) throw err; });
  console.log('Resubmit Response:', resResubmit.statusCode, resResubmit.payload?.message);

  // STEP 9: Manager approves cut -> Stage 3 (FINAL_CUT) should unlock
  console.log('\n--> Manager approving cut...');
  const reqApprove = {
    params: { stageId: s2Id.toString() },
    body: { decision: 'APPROVED', rework_comments: null },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
    ip: '127.0.0.1',
  };
  const resApprove = createMockRes();
  await workflowController.reviewStage(reqApprove, resApprove, (err) => { if (err) throw err; });
  console.log('Approve Decision Response:', resApprove.statusCode, resApprove.payload?.message);

  const s2ApprovedCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s2Id]);
  const s3UnlockedCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s3Id]);
  console.log(`Verification: Stage 2 status = ${s2ApprovedCheck[0].status}, Stage 3 status = ${s3UnlockedCheck[0].status}`);
  if (s2ApprovedCheck[0].status !== 'APPROVED' || s3UnlockedCheck[0].status !== 'READY') {
    throw new Error('Approval unlock failed: Stage 3 is not READY');
  }

  // STEP 10: Rollback Stage 2
  console.log('\n--> Testing stage rollback on Stage 2...');
  const reqRollback = {
    params: { stageId: s2Id.toString() },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
    ip: '127.0.0.1',
  };
  const resRollback = createMockRes();
  await workflowController.rollbackStage(reqRollback, resRollback, (err) => { if (err) throw err; });
  console.log('Rollback Response:', resRollback.statusCode, resRollback.payload?.message);

  const s2RollbackCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s2Id]);
  const s3RollbackCheck = await query(`SELECT status FROM task_stages WHERE id = ?`, [s3Id]);
  console.log(`Verification: Stage 2 status = ${s2RollbackCheck[0].status}, Stage 3 status = ${s3RollbackCheck[0].status}`);
  if (s2RollbackCheck[0].status !== 'READY' || s3RollbackCheck[0].status !== 'PENDING') {
    throw new Error('Rollback failed: Stage 2 is not READY or Stage 3 is not PENDING');
  }

  // Cleanup test task
  console.log('\n--> Cleaning up test data...');
  await query(`DELETE FROM stage_approvals WHERE task_stage_id IN (?, ?, ?)`, [s1Id, s2Id, s3Id]);
  await query(`DELETE FROM task_stage_assignments WHERE task_stage_id IN (?, ?, ?)`, [s1Id, s2Id, s3Id]);
  await query(`DELETE FROM task_stages WHERE task_id = ?`, [taskId]);
  await query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  await query(`DELETE FROM users WHERE email = 'editor.test@vcube.com'`);

  console.log('\n ALL WORKFLOW TRANSITION & APPROVAL GATE TESTS PASSED 100%!');
  await pool.end();
}

runWorkflowTest().catch((err) => {
  console.error('\n❌ Workflow test failed:', err);
  pool.end();
  process.exit(1);
});
