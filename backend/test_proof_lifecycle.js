import { query, pool } from './src/config/db.js';
import { proofController } from './src/controllers/proof.controller.js';

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

async function runProofTest() {
  console.log('--- TESTING PROOF OF WORK & ASSET STORAGE PIPELINE ---');

  // 1. Fetch Admin and a test worker
  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  const editorRoles = await query(`SELECT id FROM roles WHERE code = 'EDITOR'`);
  const editorRoleId = editorRoles[0]?.id;

  let workerRows = await query(`SELECT id, email FROM users WHERE email = 'proof.tester@vcube.com'`);
  let workerId;
  if (workerRows.length > 0) {
    workerId = workerRows[0].id;
  } else {
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role_id, status)
       VALUES ('Proof Tester', 'proof.tester@vcube.com', 'dummy_hash', ?, 'ACTIVE')`,
      [editorRoleId]
    );
    workerId = res.insertId;
  }

  console.log(`Using Admin ID: ${admin.id}, Worker ID: ${workerId}`);

  // 2. Create a test task and stage
  const taskRes = await query(
    `INSERT INTO tasks (title, course_code, content_type, priority, status, created_by)
     VALUES ('Proof Lifecycle Test Video', 'PROOF_TEST', 'PROMOTIONAL_VIDEO', 'MEDIUM', 'IN_PROGRESS', ?)`,
    [admin.id]
  );
  const taskId = taskRes.insertId;

  const stageRes = await query(
    `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, status)
     VALUES (?, 'FIRST_CUT', 1, ?, 'IN_PROGRESS')`,
    [taskId, editorRoleId]
  );
  const stageId = stageRes.insertId;

  // Assign to worker
  await query(
    `INSERT INTO task_stage_assignments (task_stage_id, user_id, assigned_by, assignment_type, status)
     VALUES (?, ?, ?, 'ADMIN_DIRECT', 'IN_PROGRESS')`,
    [stageId, workerId, admin.id]
  );

  console.log(`Created Test Task: ${taskId}, Stage: ${stageId}`);

  // 3. Test Upload 1: CLOUD_DRIVE_URL
  console.log('\n--> Testing Proof 1: External Cloud Drive / Video Link...');
  const req1 = {
    body: {
      task_stage_id: stageId,
      proof_type: 'CLOUD_DRIVE_URL',
      title: 'First Cut Review Video',
      public_url: 'https://drive.google.com/file/d/12345sampleCut/view',
      notes: 'Color graded v1 rendered in 4K ProRes.',
    },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const res1 = createMockRes();
  await proofController.uploadProof(req1, res1, (err) => { if (err) throw err; });

  console.log('Proof 1 Response:', res1.statusCode, res1.payload?.message);
  if (res1.statusCode !== 201 || res1.payload?.data?.revisionNumber !== 1) {
    throw new Error(`Proof 1 failed: ${JSON.stringify(res1.payload)}`);
  }
  const proof1Id = res1.payload.data.id;

  // 4. Test Upload 2: TEXT_NOTE
  console.log('\n--> Testing Proof 2: Production Text Note / Equipment Hand-off...');
  const req2 = {
    body: {
      task_stage_id: stageId,
      proof_type: 'TEXT_NOTE',
      title: 'Wrap Notes',
      notes: 'All memory cards backed up to NAS Server #3. Lighting reset complete.',
    },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const res2 = createMockRes();
  await proofController.uploadProof(req2, res2, (err) => { if (err) throw err; });

  console.log('Proof 2 Response:', res2.statusCode, res2.payload?.message);
  if (res2.statusCode !== 201 || res2.payload?.data?.revisionNumber !== 2) {
    throw new Error(`Proof 2 failed: ${JSON.stringify(res2.payload)}`);
  }

  // 5. Test Upload 3: DIRECT_FILE (Image photo or camera wrap screenshot)
  console.log('\n--> Testing Proof 3: Direct Photo / Camera Wrap Still...');
  const req3 = {
    body: {
      task_stage_id: stageId,
      proof_type: 'DIRECT_FILE',
      title: 'Studio Set Wrap Photo',
      public_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 2048500,
      notes: 'Set cleared and locked.',
    },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const res3 = createMockRes();
  await proofController.uploadProof(req3, res3, (err) => { if (err) throw err; });

  console.log('Proof 3 Response:', res3.statusCode, res3.payload?.message);
  if (res3.statusCode !== 201 || res3.payload?.data?.revisionNumber !== 3) {
    throw new Error(`Proof 3 failed: ${JSON.stringify(res3.payload)}`);
  }
  const proof3Id = res3.payload.data.id;

  // 6. Test Retrieval: GET /api/proofs/stage/:stageId
  console.log('\n--> Testing Stage Proofs Retrieval...');
  const reqGet = {
    params: { stageId: stageId.toString() },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
  };
  const resGet = createMockRes();
  await proofController.getProofsByStage(reqGet, resGet, (err) => { if (err) throw err; });

  const retrievedProofs = resGet.payload?.data || [];
  console.log(`Proofs retrieved: ${retrievedProofs.length}`);
  if (retrievedProofs.length !== 3) {
    throw new Error(`Expected 3 proofs, found ${retrievedProofs.length}`);
  }
  console.log(`Revision order: ${retrievedProofs.map((p) => `Rev ${p.revision_number} (${p.proof_type})`).join(' -> ')}`);

  // 7. Test Deletion
  console.log('\n--> Testing Proof Deletion...');
  const reqDelete = {
    params: { id: proof3Id.toString() },
    user: { id: workerId, is_system_admin: false, role_code: 'EDITOR' },
    ip: '127.0.0.1',
  };
  const resDelete = createMockRes();
  await proofController.deleteProof(reqDelete, resDelete, (err) => { if (err) throw err; });
  console.log('Delete Response:', resDelete.statusCode, resDelete.payload?.message);

  const remaining = await query(`SELECT COUNT(*) AS count FROM proofs WHERE task_stage_id = ?`, [stageId]);
  if (remaining[0].count !== 2) {
    throw new Error(`Expected 2 proofs after deletion, found ${remaining[0].count}`);
  }

  // 8. Clean up test data
  console.log('\n--> Cleaning up test data...');
  await query(`DELETE FROM proofs WHERE uploaded_by = ?`, [workerId]);
  await query(`DELETE FROM task_stage_assignments WHERE user_id = ?`, [workerId]);
  await query(`DELETE FROM task_stages WHERE task_id = ?`, [taskId]);
  await query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  await query(`DELETE FROM activity_logs WHERE actor_id = ?`, [workerId]);
  await query(`DELETE FROM users WHERE email = 'proof.tester@vcube.com'`);

  console.log('\n ALL PROOF OF WORK & ASSET STORAGE TESTS PASSED 100%!');
  await pool.end();
}

runProofTest().catch((err) => {
  console.error('\n❌ Proof test failed:', err);
  pool.end();
  process.exit(1);
});
