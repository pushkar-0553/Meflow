import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testSuites = [
  { name: 'Phase 3: RBAC & Permission Overrides', script: 'test_rbac_lifecycle.js' },
  { name: 'Phase 4: Employee Directory & Profiles', script: 'test_employee_lifecycle.js' },
  { name: 'Phase 5: Task Concurrency Locking Guard', script: 'test_task_concurrency.js' },
  { name: 'Phase 6: Workflow Transitions & Approval Gates', script: 'test_workflow_lifecycle.js' },
  { name: 'Phase 7: Proof of Work & Deliverables Storage', script: 'test_proof_lifecycle.js' },
  { name: 'Phase 8: In-App & Email Notifications', script: 'test_notification_lifecycle.js' },
  { name: 'Phase 9: Master Calendar & Scheduling', script: 'test_calendar_lifecycle.js' },
  { name: 'Phase 10: Team Workload & Capacity Hub', script: 'test_workload_lifecycle.js' },
  { name: 'Phase 11: System Audit Ledger & Activity Stream', script: 'test_audit_lifecycle.js' },
  { name: 'Publishing: Social Media Distribution & Archive', script: 'test_publishing_lifecycle.js' },
];

console.log('================================================================');
console.log('🚀 EXECUTING MASTER SUITE VERIFICATION: ALL PRODUCTION PHASES');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

for (let i = 0; i < testSuites.length; i++) {
  const suite = testSuites[i];
  console.log(`[${i + 1}/${testSuites.length}] Running: ${suite.name}...`);
  const scriptPath = path.join(__dirname, suite.script);

  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`✅ ${suite.name} -> PASSED (100%)\n`);
    passed++;
  } catch (error) {
    console.error(`❌ ${suite.name} -> FAILED`);
    failed++;
    break;
  }
}

console.log('================================================================');
if (failed === 0) {
  console.log(`🏆 ALL ${passed} PRODUCTION SUITES PASSED WITH 100% SUCCESS!`);
  console.log('   The VCube MeFlow platform is fully verified and deployment-ready.');
} else {
  console.error(`💥 Verification stopped. Passed: ${passed}, Failed: ${failed}`);
  process.exit(1);
}
console.log('================================================================\n');

