import { query, pool } from './src/config/db.js';
import { auditController } from './src/controllers/audit.controller.js';

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

async function runAuditTest() {
  console.log('--- TESTING SYSTEM AUDIT LEDGER (PHASE 11) ---');

  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  // 1. Insert a test audit record
  const logRes = await query(
    `INSERT INTO activity_logs (actor_id, action, entity, entity_id, metadata, ip_address)
     VALUES (?, 'SECURITY_SETTINGS_UPDATED', 'SYSTEM', 1, ?, '192.168.1.100')`,
    [admin.id, JSON.stringify({ policy: 'SESSION_EXPIRATION', durationMinutes: 180 })]
  );
  const logId = logRes.insertId;
  console.log(`Created Test Audit Log ID: ${logId}`);

  // 2. Query Logs
  console.log('\n--> Testing GET /api/audit...');
  const reqLogs = {
    query: { action: 'SECURITY_SETTINGS_UPDATED', limit: '10' },
    user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' },
  };
  const resLogs = createMockRes();
  await auditController.getAuditLogs(reqLogs, resLogs, (err) => { if (err) throw err; });

  const logs = resLogs.payload?.data || [];
  console.log(`Logs found: ${logs.length}, Total in system: ${resLogs.payload?.meta?.totalCount}`);
  const ourLog = logs.find((l) => l.id.toString() === logId.toString());
  if (!ourLog) {
    throw new Error('Our created audit record was not returned');
  }
  console.log(`Found Audit Entry: Action = ${ourLog.action}, Actor = ${ourLog.actor_name} (${ourLog.actor_role_name})`);

  // 3. Query Catalog
  console.log('\n--> Testing GET /api/audit/actions-catalog...');
  const reqCatalog = { user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' } };
  const resCatalog = createMockRes();
  await auditController.getActionsCatalog(reqCatalog, resCatalog, (err) => { if (err) throw err; });

  console.log(`Catalog action types: ${resCatalog.payload?.data?.actions?.length}`);
  if (!resCatalog.payload?.data?.actions?.includes('SECURITY_SETTINGS_UPDATED')) {
    throw new Error('Action type not in catalog');
  }

  // 4. Clean up
  await query(`DELETE FROM activity_logs WHERE id = ?`, [logId]);

  console.log('\n ALL SYSTEM AUDIT LEDGER TESTS PASSED 100%!');
  await pool.end();
}

runAuditTest().catch((err) => {
  console.error('\n❌ Audit test failed:', err);
  pool.end();
  process.exit(1);
});

