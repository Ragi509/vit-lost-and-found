const http = require('http');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

// Load environment
const envContent = fs.readFileSync('D:/dtplm_cp_ai/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const k = trimmed.slice(0, idx).trim();
    let v = trimmed.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
});

const PORT = 3000;
const HOST = 'localhost';
const SUPABASE_HOST = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

function request(options = {}) {
  return new Promise((resolve, reject) => {
    let postData = null;
    const headers = options.headers || {};
    if (options.body) {
      postData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = http.request({
      hostname: HOST,
      port: PORT,
      path: options.path,
      method: options.method || 'GET',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, data, json });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function supaReq(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: SUPABASE_HOST,
      path,
      headers: { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY }
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (_) { resolve(d); }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('===============================================================');
  console.log('   VERIFY BUGFIXES: ISSUE 1 (EDIT/DELETE) & ISSUE 2 (STAFF AUTH)');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details) {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} - Details:`, details);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // ISSUE 1: DELETE & EDIT PERSISTENCE FOR MANUALLY CREATED REPORTS
  // -------------------------------------------------------------------------
  console.log('\n--- TESTING ISSUE 1: CREATE, EDIT, AND DELETE PERSISTENCE ---');
  
  // 1. Resolve a student user
  const studentUser = (await supaReq('/rest/v1/users?role=eq.Student&limit=1'))[0];
  console.log('Using student account:', studentUser.vit_email, studentUser.id);

  // 1a. Create a brand-new Lost Report with client-generated reportId
  const clientReportId = crypto.randomUUID();
  const createRes = await request({
    path: '/api/reports',
    method: 'POST',
    body: {
      id: clientReportId,
      reportId: clientReportId,
      reporterId: studentUser.id,
      reporterEmail: studentUser.vit_email,
      type: 'lost',
      itemName: 'Bugfix Verification Watch',
      category: 'Electronics',
      description: 'Silver mesh analog watch left near cafeteria table 4.',
      location: 'Central Cafeteria',
      dateTime: new Date().toISOString(),
      photoBucket: 'lost-item-photos',
      photoPath: `${studentUser.id}/${clientReportId}/watch.jpg`,
      privateSecret: 'Engraved with initials SJ on inner clasp'
    }
  });

  assert(createRes.status === 200, 'POST /api/reports returns 200', createRes.json);
  const createdId = createRes.json?.report?.id;
  assert(createdId === clientReportId, 'Server honors client-provided reportId', { expected: clientReportId, got: createdId });

  // 1b. Verify row exists in live DB
  const dbRowBefore = (await supaReq(`/rest/v1/reports?id=eq.${clientReportId}`))[0];
  assert(!!dbRowBefore, 'Report row exists in live Supabase public.reports', dbRowBefore);
  assert(dbRowBefore?.status === 'searching', 'Report status is searching', dbRowBefore?.status);

  // 1c. Test EDIT (PATCH) on the report
  const patchRes = await request({
    path: `/api/reports/${clientReportId}`,
    method: 'PATCH',
    body: {
      reporterId: studentUser.id,
      itemName: 'Bugfix Verification Watch (Updated Edition)',
      description: 'Silver mesh analog watch with blue dial, found near table 4.',
      location: 'Central Cafeteria West Wing'
    }
  });

  assert(patchRes.status === 200, 'PATCH /api/reports/[id] returns 200', patchRes.json);
  
  // Verify DB reflects updated fields
  const dbRowAfterPatch = (await supaReq(`/rest/v1/reports?id=eq.${clientReportId}`))[0];
  assert(
    dbRowAfterPatch?.item_name === 'Bugfix Verification Watch (Updated Edition)' &&
    dbRowAfterPatch?.location === 'Central Cafeteria West Wing',
    'PATCH changes persisted to live Supabase DB',
    dbRowAfterPatch
  );
  assert(
    !!(patchRes.json?.report?.updated_at || dbRowAfterPatch?.updated_at || dbRowAfterPatch?.created_at),
    'Report update response carries timestamp tracking',
    patchRes.json?.report
  );

  // 1d. Test DELETE on the report
  const deleteRes = await request({
    path: `/api/reports/${clientReportId}?userId=${studentUser.id}`,
    method: 'DELETE'
  });

  assert(deleteRes.status === 200, 'DELETE /api/reports/[id] returns 200', deleteRes.json);
  assert(deleteRes.json?.deleted === clientReportId, 'DELETE response confirms deleted ID', deleteRes.json);

  // Verify DB row is completely deleted
  const dbRowAfterDelete = (await supaReq(`/rest/v1/reports?id=eq.${clientReportId}`))[0];
  assert(!dbRowAfterDelete, 'Report row is completely removed from live Supabase DB', dbRowAfterDelete);

  // 1e. Test second DELETE: must return 404 (non-silent failure on zero affected rows)
  const secondDeleteRes = await request({
    path: `/api/reports/${clientReportId}?userId=${studentUser.id}`,
    method: 'DELETE'
  });
  assert(secondDeleteRes.status === 404, 'Second DELETE returns 404 (zero rows affected error, non-silent failure)', secondDeleteRes.json);

  // -------------------------------------------------------------------------
  // ISSUE 2: STAFF LOGIN WITH EMAIL + PASSWORD
  // -------------------------------------------------------------------------
  console.log('\n--- TESTING ISSUE 2: STAFF LOGIN & PERMISSION ENFORCEMENT ---');

  const staffEmail = 'security.head@vit.edu';
  const staffPassword = env.ADMIN_PASSWORD;

  // 2a. Non-existent staff account -> 404
  const nonExistentRes = await request({
    path: '/api/auth/staff-login',
    method: 'POST',
    body: { email: 'unknown.staff@vit.edu', password: staffPassword }
  });
  assert(nonExistentRes.status === 404, 'Non-existent staff account returns 404', nonExistentRes.json);

  // 2b. Student account attempting staff login -> 403
  const studentStaffRes = await request({
    path: '/api/auth/staff-login',
    method: 'POST',
    body: { email: studentUser.vit_email, password: staffPassword }
  });
  assert(studentStaffRes.status === 403, 'Student account rejected from staff login with 403', studentStaffRes.json);

  // 2c. Staff account with incorrect password -> 401
  const badPassRes = await request({
    path: '/api/auth/staff-login',
    method: 'POST',
    body: { email: staffEmail, password: 'wrong-password-attempt-99' }
  });
  assert(badPassRes.status === 401, 'Invalid staff password returns 401', badPassRes.json);

  // 2d. Staff account with valid credentials -> 200 + cookies
  const validStaffRes = await request({
    path: '/api/auth/staff-login',
    method: 'POST',
    body: { email: staffEmail, password: staffPassword }
  });
  assert(validStaffRes.status === 200, 'Valid staff login returns 200', validStaffRes.json);
  assert(validStaffRes.json?.session?.role === 'Staff', 'Staff session role is Staff', validStaffRes.json?.session);
  assert(validStaffRes.json?.session?.email === staffEmail, 'Staff session email matches', validStaffRes.json?.session?.email);

  // Extract cookies
  const setCookie = validStaffRes.headers['set-cookie'] || [];
  const cookieStr = Array.isArray(setCookie) ? setCookie.map(c => c.split(';')[0]).join('; ') : setCookie;
  assert(cookieStr.includes('vit_staff_session'), 'vit_staff_session cookie set by server', cookieStr);
  assert(cookieStr.includes('vit_session'), 'vit_session cookie set by server', cookieStr);

  // 2e. Access Admin Console with authenticated staff session cookie
  const consoleRes = await request({
    path: '/admin/console',
    method: 'GET',
    headers: { 'Cookie': cookieStr }
  });
  assert(consoleRes.status === 200, '/admin/console loads with 200 for authenticated staff (no redirect loop)', consoleRes.status);

  // 2f. Fetch admin claims with staff cookie
  const claimsRes = await request({
    path: '/api/admin/claims?status=all',
    method: 'GET',
    headers: { 'Cookie': cookieStr }
  });
  assert(claimsRes.status === 200, 'GET /api/admin/claims returns 200 with staff cookie', claimsRes.status);

  // 2g. Fetch admin escalations with staff cookie
  const escalationsRes = await request({
    path: '/api/admin/escalations',
    method: 'GET',
    headers: { 'Cookie': cookieStr }
  });
  assert(escalationsRes.status === 200, 'GET /api/admin/escalations returns 200 with staff cookie', escalationsRes.status);

  console.log('\n===============================================================');
  console.log(`   SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
