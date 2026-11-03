import { query, pool } from './src/config/db.js';
import { workloadController } from './src/controllers/workload.controller.js';

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

async function runWorkloadTest() {
  console.log('--- TESTING TEAM WORKLOAD & CAPACITY HUB (PHASE 10) ---');

  const adminRows = await query(`SELECT id, email FROM users WHERE email = 'admin@vcube.com'`);
  const admin = adminRows[0];

  // 1. Test getTeamWorkload
  console.log('\n--> Testing GET /api/workload/team...');
  const reqTeam = { user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' } };
  const resTeam = createMockRes();
  await workloadController.getTeamWorkload(reqTeam, resTeam, (err) => { if (err) throw err; });

  console.log(`Team members analyzed: ${resTeam.payload?.data?.length}`);
  console.log('Summary Meta:', resTeam.payload?.meta);
  if (!resTeam.payload?.data || resTeam.payload.data.length === 0) {
    throw new Error('No team workload records returned');
  }

  // 2. Test getRoleBreakdown
  console.log('\n--> Testing GET /api/workload/role-breakdown...');
  const reqRoles = { user: { id: admin.id, is_system_admin: true, role_code: 'ADMIN' } };
  const resRoles = createMockRes();
  await workloadController.getRoleBreakdown(reqRoles, resRoles, (err) => { if (err) throw err; });

  console.log(`Roles analyzed: ${resRoles.payload?.data?.length}`);
  if (!resRoles.payload?.data || resRoles.payload.data.length === 0) {
    throw new Error('No role breakdown records returned');
  }

  console.log('\n ALL TEAM WORKLOAD & CAPACITY TESTS PASSED 100%!');
  await pool.end();
}

runWorkloadTest().catch((err) => {
  console.error('\n❌ Workload test failed:', err);
  pool.end();
  process.exit(1);
});

