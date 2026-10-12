const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const envFile = fs.existsSync('.env.local') ? '.env.local' : (fs.existsSync(path.join(__dirname, '..', '.env.local')) ? path.join(__dirname, '..', '.env.local') : null);
if (envFile) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(l => {
    const m = l.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const BASE_URL = process.env.BASE_URL || 'https://vit-lost-and-found-roan.vercel.app';
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'ruvkhuocnixoouphosku.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function requestUrl(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const reqHeaders = options.headers || {};
    let postData = null;

    if (options.body) {
      postData = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = lib.request(urlObj, {
      method: options.method || 'GET',
      headers: reqHeaders
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (_) { json = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function restReq(path, method = 'GET', body = null, key = SERVICE_KEY) {
  return new Promise((resolve, reject) => {
    const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };
    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Prefer'] = 'return=representation';
    }
    const r = https.request({ hostname: SUPABASE_HOST, path, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d || '[]'); } catch (_) { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

const createdTestIds = {
  reports: [],
  matches: [],
  verifications: [],
  notifications: [],
  storagePaths: []
};

async function runRegressionSuite() {
  console.log('======================================================================');
  console.log('   VIT LOST & FOUND — AUTOMATED END-TO-END REGRESSION SUITE');
  console.log(`   Target URL: ${BASE_URL}`);
  console.log('======================================================================\n');

  const results = [];

  function record(id, name, pass, detail) {
    results.push({ id, name, pass, detail });
    const mark = pass ? '✓ PASS' : '✗ FAIL';
    console.log(`[${mark}] ${id}: ${name} — ${detail}`);
  }

  // TEST 1: Route Protection Redirects
  try {
    const res = await requestUrl(`${BASE_URL}/dashboard`, { method: 'GET' });
    const isRedirect = res.status === 307 || res.status === 302 || res.status === 308;
    const location = res.headers['location'] || '';
    if (isRedirect && location.includes('/login')) {
      record('TC-R01', 'Route Protection Redirects', true, `Status ${res.status} redirected to ${location}`);
    } else {
      // In Next.js SSR, if it returns 200 with zero cookies it would be a failure
      record('TC-R01', 'Route Protection Redirects', isRedirect, `Expected 307 redirect to /login, got ${res.status}`);
    }
  } catch (err) {
    record('TC-R01', 'Route Protection Redirects', false, err.message);
  }

  // TEST 2: Signup Domain Validation
  try {
    const badRes = await requestUrl(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      body: { email: 'malicious.user@external-domain.com' }
    });
    const goodRes = await requestUrl(`${BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      body: { email: 'student.test24@vit.edu' }
    });
    const pass = badRes.status === 400 && goodRes.status === 200;
    record('TC-R02', 'Institutional Domain Gate', pass, `Rejected external domain (${badRes.status}), accepted @vit.edu (${goodRes.status})`);
  } catch (err) {
    record('TC-R02', 'Institutional Domain Gate', false, err.message);
  }

  // TEST 3: Report Secrets Table RLS (Zero Client Readability)
  try {
    const anonRes = await restReq('/rest/v1/report_secrets?select=*', 'GET', null, ANON_KEY);
    const pass = anonRes.status === 200 && Array.isArray(anonRes.data) && anonRes.data.length === 0;
    record('TC-R03', 'Report Secrets Table RLS', pass, `Anonymous SELECT returned empty set (Length: ${anonRes.data ? anonRes.data.length : 0})`);
  } catch (err) {
    record('TC-R03', 'Report Secrets Table RLS', false, err.message);
  }

  // TEST 4: Reference Data API
  try {
    const refRes = await requestUrl(`${BASE_URL}/api/reference-data`);
    const pass = refRes.status === 200 && Array.isArray(refRes.data.categories) && refRes.data.categories.length >= 8;
    record('TC-R04', 'Database-Backed Reference Data', pass, `Loaded ${refRes.data.categories ? refRes.data.categories.length : 0} categories from database`);
  } catch (err) {
    record('TC-R04', 'Database-Backed Reference Data', false, err.message);
  }

  // TEST 5: Health Check API (/api/health)
  try {
    const healthRes = await requestUrl(`${BASE_URL}/api/health`);
    const pass = healthRes.status === 200 && healthRes.data.services && healthRes.data.services.database.status === 'healthy';
    record('TC-R05', 'System Health Check API', pass, `Overall status: ${healthRes.data.status}, Database: ${healthRes.data.services?.database?.status}`);
  } catch (err) {
    record('TC-R05', 'System Health Check API', false, err.message);
  }

  // TEST 6: Report Creation Pipeline (Lost & Found)
  let testLostId = null;
  let testFoundId = null;
  const testUserA = 'a1111111-1111-1111-1111-111111111111'; // Ragini
  const testUserB = 'a2222222-2222-2222-2222-222222222222'; // Aditya

  try {
    const lostRes = await requestUrl(`${BASE_URL}/api/reports`, {
      method: 'POST',
      body: {
        reporterId: testUserA,
        reporterEmail: 'ragini.kengale24@vit.edu',
        type: 'lost',
        itemName: '[TEST] Casio Scientific Calculator fx-991CW',
        category: 'Academic Tools & Calculators',
        description: '[TEST] Black casio calculator with white protective slide cover, left in Room 304',
        location: 'D-Block - 3rd Floor Computer Lab 304',
        dateTime: new Date().toISOString(),
        privateSecret: 'Initials RK etched into battery lid'
      }
    });

    if (lostRes.status === 200 && lostRes.data.report?.id) {
      testLostId = lostRes.data.report.id;
      createdTestIds.reports.push(testLostId);
    }

    const foundRes = await requestUrl(`${BASE_URL}/api/reports`, {
      method: 'POST',
      body: {
        reporterId: testUserB,
        reporterEmail: 'aditya.joshi22@vit.edu',
        type: 'found',
        itemName: '[TEST] Casio fx-991CW Scientific Calculator',
        category: 'Academic Tools & Calculators',
        description: '[TEST] Black Casio calculator with cover found on desk near window',
        location: 'D-Block - 3rd Floor Computer Lab 304',
        dateTime: new Date().toISOString(),
        holdingLocation: 'Central Library Helpdesk (Ground Floor)'
      }
    });

    if (foundRes.status === 200 && foundRes.data.report?.id) {
      testFoundId = foundRes.data.report.id;
      createdTestIds.reports.push(testFoundId);
    }

    const pass = Boolean(testLostId && testFoundId);
    record('TC-R06', 'Report Creation Pipeline', pass, `Created Lost [${testLostId}] and Found [${testFoundId}] reports`);
  } catch (err) {
    record('TC-R06', 'Report Creation Pipeline', false, err.message);
  }

  // TEST 7: AI Matching & Grouped Notifications
  let testMatchId = null;
  try {
    const matchesRes = await restReq(`/rest/v1/matches?lost_report_id=eq.${testLostId}`);
    if (Array.isArray(matchesRes.data) && matchesRes.data.length > 0) {
      testMatchId = matchesRes.data[0].id;
      createdTestIds.matches.push(testMatchId);
      const conf = matchesRes.data[0].confidence_score;
      record('TC-R07', 'AI Matching Pipeline', true, `Matched candidate generated with confidence ${conf}`);
    } else {
      record('TC-R07', 'AI Matching Pipeline', false, 'No match record created between test reports');
    }
  } catch (err) {
    record('TC-R07', 'AI Matching Pipeline', false, err.message);
  }

  // TEST 8: Ownership Verification API (Escalate / Approve)
  try {
    if (testMatchId) {
      const verifRes = await requestUrl(`${BASE_URL}/api/verifications`, {
        method: 'POST',
        body: {
          matchId: testMatchId,
          claimantId: testUserA,
          submittedSecretText: 'Initials RK etched into battery lid'
        }
      });

      const pass = verifRes.status === 200 && (verifRes.data.result === 'approved' || verifRes.data.result === 'escalated');
      if (verifRes.data.verification_id) {
        createdTestIds.verifications.push(verifRes.data.verification_id);
      }
      record('TC-R08', 'Ownership Verification Pipeline', pass, `Result: ${verifRes.data.result}, Method: ${verifRes.data.comparison_method}`);
    } else {
      record('TC-R08', 'Ownership Verification Pipeline', false, 'Skipped: No match ID');
    }
  } catch (err) {
    record('TC-R08', 'Ownership Verification Pipeline', false, err.message);
  }

  // TEST 9: Escalation Gating (US-7 Age Threshold)
  try {
    if (testLostId) {
      const escRes = await requestUrl(`${BASE_URL}/api/escalations`, {
        method: 'POST',
        headers: {
          'Cookie': `vit_session=${encodeURIComponent(JSON.stringify({ id: testUserA, email: 'ragini.kengale24@vit.edu', role: 'Student' }))}`
        },
        body: { reportId: testLostId }
      });

      // Fresh report should be rejected because age < 72h OR match exists
      const pass = escRes.status === 400 && escRes.data.error;
      record('TC-R09', 'Escalation Threshold Gating', pass, `Rejected premature escalation with 400: ${escRes.data.error?.slice(0, 70)}...`);
    } else {
      record('TC-R09', 'Escalation Threshold Gating', false, 'Skipped: No test report');
    }
  } catch (err) {
    record('TC-R09', 'Escalation Threshold Gating', false, err.message);
  }

  // TEST 10: Cross-User Escalation Access Control (403)
  try {
    if (testLostId) {
      const unauthorizedEsc = await requestUrl(`${BASE_URL}/api/escalations`, {
        method: 'POST',
        headers: {
          'Cookie': `vit_session=${encodeURIComponent(JSON.stringify({ id: testUserB, email: 'aditya.joshi22@vit.edu', role: 'Student' }))}`
        },
        body: { reportId: testLostId }
      });

      const pass = unauthorizedEsc.status === 403;
      record('TC-R10', 'Cross-User Isolation Gate', pass, `Rejected cross-user escalation with HTTP ${unauthorizedEsc.status}`);
    } else {
      record('TC-R10', 'Cross-User Isolation Gate', false, 'Skipped: No test report');
    }
  } catch (err) {
    record('TC-R10', 'Cross-User Isolation Gate', false, err.message);
  }

  // TEST 11: Staff Authentication Gate
  try {
    const badStaff = await requestUrl(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      body: { email: 'security.head@vit.edu', password: 'incorrect_password_123' }
    });
    const goodStaff = await requestUrl(`${BASE_URL}/api/auth/staff-login`, {
      method: 'POST',
      body: { email: 'security.head@vit.edu', password: 'vit_admin_faculty_demo_2026' }
    });

    const pass = badStaff.status === 401 && goodStaff.status === 200;
    record('TC-R11', 'Staff Portal Password Security', pass, `Rejected invalid password (${badStaff.status}), authenticated valid staff (${goodStaff.status})`);
  } catch (err) {
    record('TC-R11', 'Staff Portal Password Security', false, err.message);
  }

  // TEST 12: Admin Claim Rejection Validation (Reason Mandatory)
  try {
    const noReasonRes = await requestUrl(`${BASE_URL}/api/admin/claims`, {
      method: 'POST',
      headers: {
        'Cookie': `vit_staff_session=${encodeURIComponent(JSON.stringify({ role: 'Staff' }))}`
      },
      body: { verificationId: 'dummy-id', action: 'reject' }
    });

    const pass = noReasonRes.status === 400 && noReasonRes.data.error?.toLowerCase().includes('reason');
    record('TC-R12', 'Admin Rejection Mandatory Reason', pass, `Enforced mandatory rejection rationale (HTTP ${noReasonRes.status})`);
  } catch (err) {
    record('TC-R12', 'Admin Rejection Mandatory Reason', false, err.message);
  }

  // CLEANUP STEP: Purge all [TEST] artifacts without touching demo records
  console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
  for (const vId of createdTestIds.verifications) {
    await restReq(`/rest/v1/verifications?id=eq.${vId}`, 'DELETE');
  }
  for (const mId of createdTestIds.matches) {
    await restReq(`/rest/v1/matches?id=eq.${mId}`, 'DELETE');
  }
  for (const rId of createdTestIds.reports) {
    await restReq(`/rest/v1/report_secrets?report_id=eq.${rId}`, 'DELETE');
    await restReq(`/rest/v1/notifications?data->>report_id=eq.${rId}`, 'DELETE');
    await restReq(`/rest/v1/reports?id=eq.${rId}`, 'DELETE');
  }
  console.log(`Cleaned up ${createdTestIds.reports.length} test reports and associated verification records.`);

  // SUMMARY
  const passedCount = results.filter(r => r.pass).length;
  console.log('\n======================================================================');
  console.log(`   REGRESSION SUITE COMPLETED: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('======================================================================');

  if (passedCount === results.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRegressionSuite().catch(err => {
  console.error('Fatal regression suite error:', err);
  process.exit(1);
});
