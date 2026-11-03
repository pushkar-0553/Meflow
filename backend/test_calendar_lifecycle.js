import { query, pool } from './src/config/db.js';
import { calendarController } from './src/controllers/calendar.controller.js';

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

async function runCalendarTest() {
  console.log('--- TESTING CALENDAR & SCHEDULING (PHASE 9) ---');

  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  // 1. Create a test task with a scheduled shoot
  const scheduledTime = new Date(Date.now() + 86400000); // tomorrow
  const taskRes = await query(
    `INSERT INTO tasks (title, course_code, content_type, priority, status, scheduled_start, location, expected_duration_minutes, created_by)
     VALUES ('Calendar Scheduled Shoot', 'PYTHON_SHOOT', 'PROMOTIONAL_VIDEO', 'HIGH', 'AVAILABLE', ?, 'Studio B', 90, ?)`,
    [scheduledTime, admin.id]
  );
  const taskId = taskRes.insertId;
  console.log(`Created Scheduled Test Task: ${taskId}`);

  // 2. Query Calendar Events
  console.log('\n--> Testing GET /api/calendar/events...');
  const reqEvents = {
    query: { mode: 'all' },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
  };
  const resEvents = createMockRes();
  await calendarController.getEvents(reqEvents, resEvents, (err) => { if (err) throw err; });

  const events = resEvents.payload?.data || [];
  console.log(`Calendar events found: ${events.length}`);
  const ourTask = events.find((e) => e.task_id === taskId);
  if (!ourTask) {
    throw new Error('Our created scheduled task was not returned in calendar events');
  }
  console.log(`Found event: "${ourTask.task_title}", Location: ${ourTask.location}`);

  // 3. Reschedule Task
  console.log('\n--> Testing PATCH /api/calendar/tasks/:id/reschedule...');
  const newScheduledTime = new Date(Date.now() + 172800000); // 2 days from now
  const reqReschedule = {
    params: { id: taskId.toString() },
    body: {
      scheduled_start: newScheduledTime.toISOString(),
      expected_duration_minutes: 180,
      location: 'Green Screen Studio C',
    },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
    ip: '127.0.0.1',
  };
  const resReschedule = createMockRes();
  await calendarController.rescheduleTask(reqReschedule, resReschedule, (err) => { if (err) throw err; });

  console.log('Reschedule Response:', resReschedule.statusCode, resReschedule.payload?.message);
  if (resReschedule.statusCode !== 200) {
    throw new Error(`Reschedule failed: ${JSON.stringify(resReschedule.payload)}`);
  }

  // Verify in database
  const checkUpdated = await query(`SELECT scheduled_start, expected_duration_minutes, location FROM tasks WHERE id = ?`, [taskId]);
  console.log(`Updated Task: Location = "${checkUpdated[0].location}", Duration = ${checkUpdated[0].expected_duration_minutes} mins`);
  if (checkUpdated[0].location !== 'Green Screen Studio C' || checkUpdated[0].expected_duration_minutes !== 180) {
    throw new Error('Task updates were not persisted correctly');
  }

  // 4. Cleanup
  console.log('\n--> Cleaning up test data...');
  await query(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  await query(`DELETE FROM activity_logs WHERE entity = 'TASK' AND entity_id = ?`, [taskId]);

  console.log('\n ALL CALENDAR & SCHEDULING TESTS PASSED 100%!');
  await pool.end();
}

runCalendarTest().catch((err) => {
  console.error('\n❌ Calendar test failed:', err);
  pool.end();
  process.exit(1);
});
