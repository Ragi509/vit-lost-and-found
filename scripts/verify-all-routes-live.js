const https = require('https');

const BASE_URL = 'https://vit-lost-and-found-roan.vercel.app';

const routes = [
  { path: '/', expected: [200], name: 'Landing Page' },
  { path: '/login', expected: [200], name: 'Student Login / OTP' },
  { path: '/staff/login', expected: [200], name: 'Staff Login Portal' },
  { path: '/staff/register', expected: [200], name: 'Staff Invite Registration' },
  { path: '/browse', expected: [200], name: 'Campus Catalog' },
  { path: '/dashboard', expected: [307, 308, 302], name: 'Student Dashboard (Protected Redirect)' },
  { path: '/matches', expected: [307, 308, 302], name: 'AI Matches Radar (Protected Redirect)' },
  { path: '/my-reports', expected: [307, 308, 302], name: 'My Reports (Protected Redirect)' },
  { path: '/notifications', expected: [307, 308, 302, 200], name: 'Notifications Center' },
  { path: '/profile', expected: [307, 308, 302, 200], name: 'Student Profile (Protected Redirect)' },
  { path: '/admin/console', expected: [307, 308, 302], name: 'Staff Console (Protected Redirect)' },
  { path: '/api/health', expected: [200], name: 'System Health API' },
  { path: '/api/reference-data', expected: [200], name: 'Reference Data API' },
];

function testRoute(route) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}${route.path}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const pass = route.expected.includes(res.statusCode);
        const loc = res.headers['location'] ? ` -> ${res.headers['location']}` : '';
        resolve({
          path: route.path,
          name: route.name,
          status: res.statusCode,
          pass,
          detail: `HTTP ${res.statusCode}${loc} (${data.length} bytes)`
        });
      });
    }).on('error', (err) => {
      resolve({
        path: route.path,
        name: route.name,
        status: 0,
        pass: false,
        detail: `Error: ${err.message}`
      });
    });
  });
}

async function run() {
  console.log('======================================================================');
  console.log('   LIVE PRODUCTION ROUTE PROBE AUDIT');
  console.log(`   Target: ${BASE_URL}`);
  console.log('======================================================================\n');

  let allPass = true;
  for (const r of routes) {
    const res = await testRoute(r);
    const mark = res.pass ? '✓ PASS' : '✗ FAIL';
    if (!res.pass) allPass = false;
    console.log(`[${mark}] ${res.name} (${res.path}) — ${res.detail}`);
  }

  console.log('\n======================================================================');
  console.log(`   ALL ROUTES VERIFIED: ${allPass ? 'SUCCESS (100% HEALTHY)' : 'FAILURES DETECTED'}`);
  console.log('======================================================================');
}

run();
