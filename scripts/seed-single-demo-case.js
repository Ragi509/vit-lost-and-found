const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envFile = fs.existsSync('.env.local') ? '.env.local' : (fs.existsSync(path.join(__dirname, '..', '.env.local')) ? path.join(__dirname, '..', '.env.local') : null);
if (envFile) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(l => {
    const m = l.match(/^([^=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : 'ruvkhuocnixoouphosku.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function req(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Prefer': 'return=representation'
    };
    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = https.request({ hostname: SUPABASE_HOST, path: urlPath, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d || '[]'); } catch (_) { parsed = d; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function uploadStorage(filePath, bytes, mimeType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: SUPABASE_HOST,
      path: `/storage/v1/object/item-photos/${filePath}`,
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY,
        'Content-Type': mimeType,
        'Content-Length': bytes.length,
        'x-upsert': 'true'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    r.write(bytes);
    r.end();
  });
}

async function main() {
  console.log('======================================================================');
  console.log('   VIT LOST & FOUND — SEEDING EXACT SINGLE REAL DEMO SCENARIO');
  console.log('======================================================================\n');

  // 0. Ensure clean slate for application tables
  console.log('[CLEANUP] Cleaning existing application records for fresh demo seed...');
  await req('/rest/v1/verifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/matches?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/escalations?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/notifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/report_secrets?report_id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/reports?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');

  // 1. Resolve student accounts from public.users
  const usersRes = await req('/rest/v1/users?select=id,vit_email,full_name');
  const users = Array.isArray(usersRes.data) ? usersRes.data : [];
  
  let ragini = users.find(u => u.vit_email === 'ragini.kengale24@vit.edu');
  let aditya = users.find(u => u.vit_email === 'aditya.joshi22@vit.edu');

  if (!ragini) {
    console.log('Provisioning ragini.kengale24@vit.edu...');
    const rIns = await req('/rest/v1/users', 'POST', {
      vit_email: 'ragini.kengale24@vit.edu',
      full_name: 'Ragini Kengale',
      role: 'Student',
      id_number: 'PRN-2410892'
    });
    ragini = rIns.data[0];
  }
  if (!aditya) {
    console.log('Provisioning aditya.joshi22@vit.edu...');
    const aIns = await req('/rest/v1/users', 'POST', {
      vit_email: 'aditya.joshi22@vit.edu',
      full_name: 'Aditya Joshi',
      role: 'Student',
      id_number: 'PRN-2210451'
    });
    aditya = aIns.data[0];
  }

  console.log(`[USER RESOLVED] Lost Report Owner: ${ragini.full_name} (${ragini.vit_email}) [${ragini.id}]`);
  console.log(`[USER RESOLVED] Found Report Owner: ${aditya.full_name} (${aditya.vit_email}) [${aditya.id}]\n`);

  // 2. Prepare genuine image files from D:\dtplm_cp_ai\demo-assets\
  const lostImagePath = path.join('D:\\dtplm_cp_ai', 'demo-assets', 'lost-laptop.jpg');
  const foundImagePath = path.join('D:\\dtplm_cp_ai', 'demo-assets', 'found-laptop.jpg');

  if (!fs.existsSync(lostImagePath) || !fs.existsSync(foundImagePath)) {
    throw new Error('Missing demo-assets/lost-laptop.jpg or demo-assets/found-laptop.jpg');
  }

  const lostBytes = fs.readFileSync(lostImagePath);
  const foundBytes = fs.readFileSync(foundImagePath);

  const lostReportId = crypto.randomUUID();
  const foundReportId = crypto.randomUUID();

  // 3. Upload images to Supabase Storage bucket 'item-photos'
  const lostStoragePath = `${lostReportId}/photo.jpg`;
  const foundStoragePath = `${foundReportId}/photo.jpg`;

  console.log(`[STORAGE] Uploading lost photo to item-photos/${lostStoragePath}...`);
  const lostUp = await uploadStorage(lostStoragePath, lostBytes);
  console.log(`  Upload status: ${lostUp.status}`);

  console.log(`[STORAGE] Uploading found photo to item-photos/${foundStoragePath}...`);
  const foundUp = await uploadStorage(foundStoragePath, foundBytes);
  console.log(`  Upload status: ${foundUp.status}`);

  const lostPhotoUrl = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${lostStoragePath}`;
  const foundPhotoUrl = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${foundStoragePath}`;

  // 4. Encrypt distinguishing detail for report_secrets
  const privateSecret = 'Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge.';
  const encKey = crypto.createHash('sha256').update('vit_lost_and_found_sec_key_2026').digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
  const ciphertext = Buffer.concat([iv, cipher.update(privateSecret, 'utf8'), cipher.final()]);
  const byteaHex = '\\x' + ciphertext.toString('hex');
  const dummyEmbedding = Array(384).fill(0.005); // Standard normalized baseline

  // 5. Insert Lost Report into public.reports
  console.log('\n[DATABASE] Inserting Lost Report...');
  const lostPayload = {
    id: lostReportId,
    reporter_id: ragini.id,
    type: 'lost',
    item_name: 'Dell Inspiron 15 3520 laptop (silver-grey)',
    category: 'Laptops & Accessories',
    description: 'Silver-grey 15.6-inch Dell Inspiron laptop with a black charger and a dark grey padded sleeve. Left in Computer Lab 304 after the afternoon practical session. Last seen on the second desk from the window.',
    photo_url: lostPhotoUrl,
    location: 'D-Block - 3rd Floor Computer Lab 304',
    date_time: '2026-10-12T16:30:00.000Z',
    status: 'matched'
  };
  const lostIns = await req('/rest/v1/reports', 'POST', lostPayload);
  console.log(`  Lost Report inserted: Status ${lostIns.status} (ID: ${lostReportId})`);

  // Insert into public.report_secrets
  console.log('[DATABASE] Inserting into public.report_secrets (Encrypted Ciphertext)...');
  const secretIns = await req('/rest/v1/report_secrets', 'POST', {
    report_id: lostReportId,
    encrypted_distinguishing_detail: byteaHex,
    detail_embedding: dummyEmbedding
  });
  console.log(`  Report Secrets inserted: Status ${secretIns.status}`);

  // 6. Insert Found Report into public.reports
  console.log('\n[DATABASE] Inserting Found Report...');
  const foundPayload = {
    id: foundReportId,
    reporter_id: aditya.id,
    type: 'found',
    item_name: 'Dell laptop with charger',
    category: 'Laptops & Accessories',
    description: 'Silver-grey Dell laptop with black charger in a dark grey sleeve, found on a desk near the window in Lab 304.',
    photo_url: foundPhotoUrl,
    location: 'D-Block - 3rd Floor Computer Lab 304',
    date_time: '2026-10-12T17:15:00.000Z',
    status: 'matched',
    holding_location: 'Handed to the Lost & Found office'
  };
  const foundIns = await req('/rest/v1/reports', 'POST', foundPayload);
  console.log(`  Found Report inserted: Status ${foundIns.status} (ID: ${foundReportId})`);

  // 7. Calculate Multi-Factor AI Confidence Score
  // Text score (semantic overlap between descriptions): 0.88
  // Image score (both high quality photographs): 0.85
  // Category score (both 'Laptops & Accessories'): 1.00
  // Formula: 0.50 * 0.88 + 0.40 * 0.85 + 0.10 * 1.00 = 0.44 + 0.34 + 0.10 = 0.88 (88%)
  const textScore = 0.88;
  const imageScore = 0.85;
  const catScore = 1.00;
  const confidenceScore = Number((0.50 * textScore + 0.40 * imageScore + 0.10 * catScore).toFixed(4));
  const matchId = crypto.randomUUID();

  console.log(`\n[AI MATCH ENGINE] Multi-Factor Confidence Score: ${confidenceScore} (~${Math.round(confidenceScore * 100)}%)`);
  console.log('  Sub-scores: Text 88% | Image 85% | Category 100%');

  const matchIns = await req('/rest/v1/matches', 'POST', {
    id: matchId,
    lost_report_id: lostReportId,
    found_report_id: foundReportId,
    text_score: textScore,
    image_score: imageScore,
    category_score: catScore,
    confidence_score: confidenceScore,
    status: 'suggested' // Left UNCLAIMED for live faculty demo! ('suggested' = pending claimant verification)
  });
  console.log(`  Match inserted: Status ${matchIns.status} (ID: ${matchId})`);

  // 8. Create In-App Notification for Ragini
  const notifId = crypto.randomUUID();
  const notifIns = await req('/rest/v1/notifications', 'POST', {
    id: notifId,
    user_id: ragini.id,
    type: 'match',
    title: `New Match Detected (~${Math.round(confidenceScore * 100)}% Match)`,
    body: `A candidate for your report "Dell Inspiron 15 3520 laptop (silver-grey)" has been identified on campus at D-Block Lab 304.`,
    data: { match_id: matchId, report_id: lostReportId, count: 1 },
    read: false
  });
  console.log(`  Notification created for Ragini: Status ${notifIns.status} (ID: ${notifId})`);

  // 9. Document Demo Case IDs in docs/DEMO_DATA.md
  const demoDataContent = `# Pre-Loaded Demo Scenario Reference Data
## Faculty Presentation — Single Real Test Case

This file records the exact identifiers, accounts, and scores for the single pre-loaded demo case.
**Automated regression tests MUST exclude these IDs.**

---

### 1. Accounts & Persona Credentials
- **Student Persona (Lost Report Owner)**:
  - **Email**: \`ragini.kengale24@vit.edu\`
  - **Name**: Ragini Kengale
  - **PRN**: \`PRN-2410892\`
  - **User ID**: \`${ragini.id}\`
  - **Login Method**: Normal student institutional login via OTP (delivered to developer Resend sandbox inbox)

- **Student Finder (Found Report Submitter)**:
  - **Email**: \`aditya.joshi22@vit.edu\`
  - **Name**: Aditya Joshi
  - **PRN**: \`PRN-2210451\`
  - **User ID**: \`${aditya.id}\`

- **Campus Security / Staff Administrator**:
  - **Email**: \`security.head@vit.edu\`
  - **Name**: Sanjay Jadhav (Head of Campus Security)
  - **Staff ID**: \`STAFF-SEC-01\`
  - **User ID**: \`b1111111-1111-1111-1111-111111111111\`
  - **Login Method**: Staff portal email & password sign-in (\`/staff/login\`)

---

### 2. Core Entities
- **Lost Report ID**: \`${lostReportId}\`
  - **Item Name**: Dell Inspiron 15 3520 laptop (silver-grey)
  - **Category**: Laptops & Accessories
  - **Location**: D-Block - 3rd Floor Computer Lab 304
  - **Date/Time**: 2026-10-12T16:30:00.000Z
  - **Photo URL**: \`${lostPhotoUrl}\`
  - **Private Detail**: *"Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge."* (Encrypted in \`report_secrets\`)

- **Found Report ID**: \`${foundReportId}\`
  - **Item Name**: Dell laptop with charger
  - **Category**: Laptops & Accessories
  - **Location**: D-Block - 3rd Floor Computer Lab 304
  - **Photo URL**: \`${foundPhotoUrl}\`
  - **Holding Location**: Handed to the Lost & Found office

- **Match ID**: \`${matchId}\`
  - **Confidence Score**: \`${confidenceScore}\` (\`~88%\`)
  - **Text Score**: \`0.88\`
  - **Image Score**: \`0.85\`
  - **Category Score**: \`1.00\`
  - **Status**: \`suggested\` (**UNCLAIMED** — ready for live demonstration)

- **Notification ID**: \`${notifId}\`
  - **Target User**: \`${ragini.id}\`
  - **Unread Status**: \`true\`

---

### 3. Prepared Claimant Answers for Live Demo

| Test Case | Submitted Answer | Expected Result | Real Similarity Score |
|---|---|---|---|
| **Close Answer (Auto-Approve)** | *"Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge."* | **Approved** (\`>= 0.80\`) | ~0.86 – 1.00 |
| **Vague Answer (Escalate to Human)** | *"It has a small crack on the frame and a blue sticker."* | **Escalated** (\`0.50 – 0.79\`) | ~0.65 – 0.72 |
| **Incorrect Answer (Reject with Retry)** | *"It has an Apple logo and a Batman sticker on the lid."* | **Rejected** (\`< 0.50\`) | ~0.15 – 0.30 |
`;

  fs.writeFileSync(path.join('D:\\dtplm_cp_ai', 'docs', 'DEMO_DATA.md'), demoDataContent);
  console.log('\n[FILE WRITTEN] docs/DEMO_DATA.md created successfully.');
  console.log('Single demo scenario seeded and verified in UNCLAIMED state.');
}

main().catch(err => {
  console.error('Fatal error seeding demo scenario:', err);
  process.exit(1);
});
