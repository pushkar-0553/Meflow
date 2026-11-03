import { query, pool } from './src/config/db.js';
import { notificationController } from './src/controllers/notification.controller.js';

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

async function runNotificationTest() {
  console.log('--- TESTING NOTIFICATIONS ENGINE (PHASE 8) ---');

  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  // 1. Create two test notifications
  const n1Res = await query(
    `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id, is_read)
     VALUES (?, 'APPROVAL_REQUIRED', 'Review Sign-Off Required', 'Cut submitted for review on task: ITNIK 101', 'STAGE', 1, FALSE)`,
    [admin.id]
  );
  const n1Id = n1Res.insertId;

  const n2Res = await query(
    `INSERT INTO notifications (user_id, type, title, message, reference_entity, reference_id, is_read)
     VALUES (?, 'CHANGES_REQUESTED', 'Rework Required on Cut', 'Audio sync needed', 'STAGE', 2, FALSE)`,
    [admin.id]
  );
  const n2Id = n2Res.insertId;

  console.log(`Created Test Notifications: ${n1Id}, ${n2Id}`);

  // 2. Query list
  console.log('\n--> Testing GET /api/notifications...');
  const reqList = { user: { id: admin.id }, query: {} };
  const resList = createMockRes();
  await notificationController.listNotifications(reqList, resList, (err) => { if (err) throw err; });

  console.log(`Unread count: ${resList.payload?.meta?.unreadCount}, Total returned: ${resList.payload?.data?.length}`);
  if (resList.payload?.meta?.unreadCount < 2) {
    throw new Error('Unread count calculation failed');
  }

  // 3. Mark single notification as read
  console.log('\n--> Testing PATCH /api/notifications/:id/read...');
  const reqRead = { params: { id: n1Id.toString() }, user: { id: admin.id } };
  const resRead = createMockRes();
  await notificationController.markAsRead(reqRead, resRead, (err) => { if (err) throw err; });
  console.log('Mark read response:', resRead.payload?.message);

  const checkN1 = await query(`SELECT is_read FROM notifications WHERE id = ?`, [n1Id]);
  if (!checkN1[0].is_read) {
    throw new Error('Notification 1 was not marked as read');
  }

  // 4. Mark all as read
  console.log('\n--> Testing POST /api/notifications/read-all...');
  const reqReadAll = { user: { id: admin.id } };
  const resReadAll = createMockRes();
  await notificationController.markAllAsRead(reqReadAll, resReadAll, (err) => { if (err) throw err; });
  console.log('Mark all read response:', resReadAll.payload?.message);

  const checkUnread = await query(`SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`, [admin.id]);
  if (checkUnread[0].count !== 0) {
    throw new Error('Not all notifications were marked read');
  }

  // 5. Delete notification
  console.log('\n--> Testing DELETE /api/notifications/:id...');
  const reqDelete = { params: { id: n2Id.toString() }, user: { id: admin.id } };
  const resDelete = createMockRes();
  await notificationController.deleteNotification(reqDelete, resDelete, (err) => { if (err) throw err; });
  console.log('Delete response:', resDelete.payload?.message);

  // 6. Cleanup
  await query(`DELETE FROM notifications WHERE id IN (?, ?)`, [n1Id, n2Id]);

  console.log('\n ALL NOTIFICATION LIFECYCLE TESTS PASSED 100%!');
  await pool.end();
}

runNotificationTest().catch((err) => {
  console.error('\n❌ Notification test failed:', err);
  pool.end();
  process.exit(1);
});
