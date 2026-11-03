import { query, pool } from './src/config/db.js';
import { publishingController } from './src/controllers/publishing.controller.js';

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

async function runPublishingTest() {
  console.log('--- TESTING SOCIAL MEDIA PUBLISHING LIFECYCLE ---');

  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  const roles = await query(`SELECT id FROM roles WHERE code = 'SOCIAL_MEDIA_MGR'`);
  const roleId = roles[0]?.id || 1;

  // 1. Create a task with a PUBLISHED stage
  const taskRes = await query(
    `INSERT INTO tasks (title, course_code, content_type, priority, status, created_by)
     VALUES ('Full Stack React Bootcamp Reel', 'REACT_BOOTCAMP', 'REEL_SHORT', 'HIGH', 'IN_PROGRESS', ?)`,
    [admin.id]
  );
  const taskId = taskRes.insertId;

  const stageRes = await query(
    `INSERT INTO task_stages (task_id, stage_type, sequence_order, target_role_id, status)
     VALUES (?, 'PUBLISHED', 1, ?, 'READY')`,
    [taskId, roleId]
  );
  const stageId = stageRes.insertId;

  console.log(`Created Test Task ID: ${taskId}, Stage ID: ${stageId}`);

  // 2. Record Publication
  console.log('\n--> Testing POST /api/publishing...');
  const reqPub = {
    body: {
      task_id: taskId,
      platform: 'YOUTUBE',
      post_url: 'https://youtube.com/shorts/sampleReel123',
      caption: 'Top 5 React 19 features you must know! #react #webdev',
    },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
    ip: '127.0.0.1',
  };
  const resPub = createMockRes();
  await publishingController.recordPublication(reqPub, resPub, (err) => { if (err) throw err; });

  console.log('Record Publication Response:', resPub.statusCode, resPub.payload?.message);
  if (resPub.statusCode !== 201) {
    throw new Error(`Publishing failed: ${JSON.stringify(resPub.payload)}`);
  }
  const publicationId = resPub.payload.data.id;

  // Verify in database: stage should be APPROVED, task should be COMPLETED
  const checkTask = await query(`SELECT status FROM tasks WHERE id = ?`, [taskId]);
  const checkStage = await query(`SELECT status FROM task_stages WHERE id = ?`, [stageId]);
  console.log(`Verification: Task status = ${checkTask[0].status}, Stage status = ${checkStage[0].status}`);
  if (checkTask[0].status !== 'COMPLETED' || checkStage[0].status !== 'APPROVED') {
    throw new Error('Task was not marked COMPLETED or stage not APPROVED');
  }

  // 3. Query Publications Archive
  console.log('\n--> Testing GET /api/publishing...');
  const reqList = { query: { platform: 'YOUTUBE' }, user: { id: admin.id } };
  const resList = createMockRes();
  await publishingController.listPublications(reqList, resList, (err) => { if (err) throw err; });

  const publications = resList.payload?.data || [];
  console.log(`Publications found: ${publications.length}`);
  const ourPub = publications.find((p) => p.id === publicationId);
  if (!ourPub) {
    throw new Error('Our created publication was not found in the archive');
  }
  console.log(`Found Publication: ${ourPub.platform} - "${ourPub.caption}" by ${ourPub.publisher_name}`);

  // 4. Clean up
  console.log('\n--> Cleaning up test data...');
  await query(`DELETE FROM social_publications WHERE id = ?`, [publicationId]);
  await query(`DELETE FROM task_stages WHERE id = ?`, [stageId]);
  await query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  await query(`DELETE FROM activity_logs WHERE entity = 'TASK' AND entity_id = ?`, [taskId]);

  console.log('\n ALL SOCIAL MEDIA PUBLISHING TESTS PASSED 100%!');
  await pool.end();
}

runPublishingTest().catch((err) => {
  console.error('\n❌ Publishing test failed:', err);
  pool.end();
  process.exit(1);
});

