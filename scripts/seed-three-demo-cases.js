const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env.local if present
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

function encryptSecret(privateSecret) {
  const encKey = crypto.createHash('sha256').update('vit_lost_and_found_sec_key_2026').digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
  const ciphertext = Buffer.concat([iv, cipher.update(privateSecret, 'utf8'), cipher.final()]);
  return '\\x' + ciphertext.toString('hex');
}

function computeScore(textScore, imageScore, categoryMatch) {
  const catScore = categoryMatch ? 1.0 : 0.0;
  let conf = 0;
  if (imageScore === null || imageScore === undefined) {
    conf = 0.85 * textScore + 0.15 * catScore;
  } else {
    conf = 0.50 * textScore + 0.40 * imageScore + 0.10 * catScore;
  }
  return {
    textScore: Number(textScore.toFixed(4)),
    imageScore: imageScore !== null ? Number(imageScore.toFixed(4)) : null,
    catScore: Number(catScore.toFixed(4)),
    confidenceScore: Number(conf.toFixed(4))
  };
}

async function main() {
  console.log('======================================================================');
  console.log('   VIT LOST & FOUND — SEEDING 3 REAL SCENARIOS WITH AI MATCHING');
  console.log('======================================================================\n');

  // 0. Clean slate for application tables
  console.log('[CLEANUP] Cleaning existing application records for fresh multi-case seed...');
  await req('/rest/v1/verifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/matches?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/escalations?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/notifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/report_secrets?report_id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  await req('/rest/v1/reports?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');

  // 1. Resolve student accounts
  const usersRes = await req('/rest/v1/users?select=id,vit_email,full_name');
  const users = Array.isArray(usersRes.data) ? usersRes.data : [];

  const ragini = users.find(u => u.vit_email === 'ragini.kengale24@vit.edu');
  const aditya = users.find(u => u.vit_email === 'aditya.joshi22@vit.edu');
  const neha = users.find(u => u.vit_email === 'neha.patil23@vit.edu');

  if (!ragini || !aditya || !neha) {
    throw new Error('Required student accounts missing in public.users');
  }

  console.log(`[USERS RESOLVED]`);
  console.log(`  1. ${ragini.full_name} (${ragini.vit_email}) [${ragini.id}]`);
  console.log(`  2. ${aditya.full_name} (${aditya.vit_email}) [${aditya.id}]`);
  console.log(`  3. ${neha.full_name} (${neha.vit_email}) [${neha.id}]\n`);

  // 2. Load Assets
  const assetsDir = path.join('D:\\dtplm_cp_ai', 'demo-assets');
  const lostLaptopImg = fs.readFileSync(path.join(assetsDir, 'lost-laptop.jpg'));
  const foundLaptopImg = fs.readFileSync(path.join(assetsDir, 'found-laptop.jpg'));
  const calcImg = fs.readFileSync(path.join(assetsDir, 'calculator.jpg'));
  const earbudsImg = fs.readFileSync(path.join(assetsDir, 'earbuds.jpg'));

  const seededCases = [];

  // ==========================================================================
  // CASE 1: Dell Inspiron 15 Laptop (Silver-Grey)
  // ==========================================================================
  console.log('--- SEEDING CASE 1: Dell Inspiron 15 Laptop ---');
  const case1LostId = crypto.randomUUID();
  const case1FoundId = crypto.randomUUID();
  const case1MatchId = crypto.randomUUID();
  const case1NotifId = crypto.randomUUID();

  // Upload photos
  await uploadStorage(`${case1LostId}/photo.jpg`, lostLaptopImg);
  await uploadStorage(`${case1FoundId}/photo.jpg`, foundLaptopImg);
  const case1LostPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case1LostId}/photo.jpg`;
  const case1FoundPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case1FoundId}/photo.jpg`;

  // Insert Lost Report
  const case1LostRes = await req('/rest/v1/reports', 'POST', {
    id: case1LostId,
    reporter_id: ragini.id,
    type: 'lost',
    item_name: 'Dell Inspiron 15 3520 laptop (silver-grey)',
    category: 'Laptops & Accessories',
    description: 'Silver-grey 15.6-inch Dell Inspiron laptop with a black charger and a dark grey padded sleeve. Left in Computer Lab 304 after the afternoon practical session. Last seen on the second desk from the window.',
    photo_url: case1LostPhoto,
    location: 'D-Block - 3rd Floor Computer Lab 304',
    date_time: '2026-10-12T16:30:00.000Z',
    status: 'matched'
  });
  console.log(`  Lost Report inserted: ${case1LostRes.status} (${case1LostId})`);

  // Insert Secret
  const case1Secret = 'Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge.';
  await req('/rest/v1/report_secrets', 'POST', {
    report_id: case1LostId,
    encrypted_distinguishing_detail: encryptSecret(case1Secret),
    detail_embedding: Array(384).fill(0.005)
  });

  // Insert Found Report
  const case1FoundRes = await req('/rest/v1/reports', 'POST', {
    id: case1FoundId,
    reporter_id: aditya.id,
    type: 'found',
    item_name: 'Dell laptop with charger',
    category: 'Laptops & Accessories',
    description: 'Silver-grey Dell laptop with black charger in a dark grey sleeve, found on a desk near the window in Lab 304.',
    photo_url: case1FoundPhoto,
    location: 'D-Block - 3rd Floor Computer Lab 304',
    date_time: '2026-10-12T17:15:00.000Z',
    status: 'matched',
    holding_location: 'Handed to the Lost & Found office'
  });
  console.log(`  Found Report inserted: ${case1FoundRes.status} (${case1FoundId})`);

  // AI Match
  const score1 = computeScore(0.88, 0.85, true);
  await req('/rest/v1/matches', 'POST', {
    id: case1MatchId,
    lost_report_id: case1LostId,
    found_report_id: case1FoundId,
    text_score: score1.textScore,
    image_score: score1.imageScore,
    category_score: score1.catScore,
    confidence_score: score1.confidenceScore,
    status: 'suggested'
  });
  console.log(`  Match created: Confidence ${score1.confidenceScore} (~${Math.round(score1.confidenceScore * 100)}%)`);

  // Notification for Ragini
  await req('/rest/v1/notifications', 'POST', {
    id: case1NotifId,
    user_id: ragini.id,
    type: 'match',
    title: `New Match Detected (~${Math.round(score1.confidenceScore * 100)}% Match)`,
    body: `A candidate for your report "Dell Inspiron 15 3520 laptop (silver-grey)" has been identified on campus at D-Block Lab 304.`,
    data: { match_id: case1MatchId, report_id: case1LostId, count: 1 },
    read: false
  });

  seededCases.push({
    title: 'Dell Inspiron 15 Laptop',
    lostId: case1LostId,
    foundId: case1FoundId,
    matchId: case1MatchId,
    owner: ragini.full_name,
    ownerEmail: ragini.vit_email,
    finder: aditya.full_name,
    score: score1.confidenceScore,
    secret: case1Secret
  });

  // ==========================================================================
  // CASE 2: Casio fx-991CW ClassWiz Scientific Calculator
  // ==========================================================================
  console.log('\n--- SEEDING CASE 2: Casio fx-991CW Scientific Calculator ---');
  const case2LostId = crypto.randomUUID();
  const case2FoundId = crypto.randomUUID();
  const case2MatchId = crypto.randomUUID();
  const case2NotifId = crypto.randomUUID();

  // Upload photos
  await uploadStorage(`${case2LostId}/photo.jpg`, calcImg);
  await uploadStorage(`${case2FoundId}/photo.jpg`, calcImg);
  const case2LostPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case2LostId}/photo.jpg`;
  const case2FoundPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case2FoundId}/photo.jpg`;

  // Insert Lost Report (Neha Patil)
  const case2LostRes = await req('/rest/v1/reports', 'POST', {
    id: case2LostId,
    reporter_id: neha.id,
    type: 'lost',
    item_name: 'Casio fx-991CW ClassWiz scientific calculator',
    category: 'Academic Tools & Calculators',
    description: 'Black Casio scientific calculator model fx-991CW with white sliding hard cover. Left on drafting desk 14 after morning Engineering Mechanics practical.',
    photo_url: case2LostPhoto,
    location: 'Mechanical Workshop & Labs - Drafting Hall 102',
    date_time: '2026-10-12T11:45:00.000Z',
    status: 'matched'
  });
  console.log(`  Lost Report inserted: ${case2LostRes.status} (${case2LostId})`);

  // Insert Secret
  const case2Secret = 'Name "Neha P." written in permanent black marker on the back of the sliding protective cover, and small blue ink dot inside battery compartment.';
  await req('/rest/v1/report_secrets', 'POST', {
    report_id: case2LostId,
    encrypted_distinguishing_detail: encryptSecret(case2Secret),
    detail_embedding: Array(384).fill(0.005)
  });

  // Insert Found Report (Aditya Joshi)
  const case2FoundRes = await req('/rest/v1/reports', 'POST', {
    id: case2FoundId,
    reporter_id: aditya.id,
    type: 'found',
    item_name: 'Casio scientific calculator with white cover',
    category: 'Academic Tools & Calculators',
    description: 'Black Casio scientific calculator with white plastic cover found on drafting table 14 during post-practical hall cleanup.',
    photo_url: case2FoundPhoto,
    location: 'Mechanical Workshop & Labs - Drafting Hall 102',
    date_time: '2026-10-12T12:30:00.000Z',
    status: 'matched',
    holding_location: 'Handed to the Lost & Found office'
  });
  console.log(`  Found Report inserted: ${case2FoundRes.status} (${case2FoundId})`);

  // AI Match
  const score2 = computeScore(0.87, 0.85, true);
  await req('/rest/v1/matches', 'POST', {
    id: case2MatchId,
    lost_report_id: case2LostId,
    found_report_id: case2FoundId,
    text_score: score2.textScore,
    image_score: score2.imageScore,
    category_score: score2.catScore,
    confidence_score: score2.confidenceScore,
    status: 'suggested'
  });
  console.log(`  Match created: Confidence ${score2.confidenceScore} (~${Math.round(score2.confidenceScore * 100)}%)`);

  // Notification for Neha
  await req('/rest/v1/notifications', 'POST', {
    id: case2NotifId,
    user_id: neha.id,
    type: 'match',
    title: `New Match Detected (~${Math.round(score2.confidenceScore * 100)}% Match)`,
    body: `A candidate for your report "Casio fx-991CW ClassWiz scientific calculator" has been identified at Mechanical Drafting Hall 102.`,
    data: { match_id: case2MatchId, report_id: case2LostId, count: 1 },
    read: false
  });

  seededCases.push({
    title: 'Casio fx-991CW Calculator',
    lostId: case2LostId,
    foundId: case2FoundId,
    matchId: case2MatchId,
    owner: neha.full_name,
    ownerEmail: neha.vit_email,
    finder: aditya.full_name,
    score: score2.confidenceScore,
    secret: case2Secret
  });

  // ==========================================================================
  // CASE 3: boAt Airdopes 141 ANC Wireless Earbuds
  // ==========================================================================
  console.log('\n--- SEEDING CASE 3: boAt Airdopes Wireless Earbuds ---');
  const case3LostId = crypto.randomUUID();
  const case3FoundId = crypto.randomUUID();
  const case3MatchId = crypto.randomUUID();
  const case3NotifId = crypto.randomUUID();

  // Upload photos
  await uploadStorage(`${case3LostId}/photo.jpg`, earbudsImg);
  await uploadStorage(`${case3FoundId}/photo.jpg`, earbudsImg);
  const case3LostPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case3LostId}/photo.jpg`;
  const case3FoundPhoto = `https://${SUPABASE_HOST}/storage/v1/object/public/item-photos/${case3FoundId}/photo.jpg`;

  // Insert Lost Report (Ragini Kengale)
  const case3LostRes = await req('/rest/v1/reports', 'POST', {
    id: case3LostId,
    reporter_id: ragini.id,
    type: 'lost',
    item_name: 'boAt Airdopes 141 ANC wireless earbuds (white)',
    category: 'Electronics & Gadgets',
    description: 'White boAt Airdopes 141 ANC earbuds charging case with navy blue silicone lanyard strap attached. Misplaced on a study cubicle desk near the periodical shelves.',
    photo_url: case3LostPhoto,
    location: 'Central Library - 2nd Floor Reading Room',
    date_time: '2026-10-12T14:15:00.000Z',
    status: 'matched'
  });
  console.log(`  Lost Report inserted: ${case3LostRes.status} (${case3LostId})`);

  // Insert Secret
  const case3Secret = 'Tiny scratch across the front LED indicator, and initials "RK" marked in silver marker under the charging lid.';
  await req('/rest/v1/report_secrets', 'POST', {
    report_id: case3LostId,
    encrypted_distinguishing_detail: encryptSecret(case3Secret),
    detail_embedding: Array(384).fill(0.005)
  });

  // Insert Found Report (Neha Patil)
  const case3FoundRes = await req('/rest/v1/reports', 'POST', {
    id: case3FoundId,
    reporter_id: neha.id,
    type: 'found',
    item_name: 'White boAt wireless earbuds case with blue strap',
    category: 'Electronics & Gadgets',
    description: 'White boAt wireless earbuds case found on a second-floor library study cubicle table, blue lanyard loop attached.',
    photo_url: case3FoundPhoto,
    location: 'Central Library - 2nd Floor Reading Room',
    date_time: '2026-10-12T15:00:00.000Z',
    status: 'matched',
    holding_location: 'Central Library Helpdesk (Ground Floor)'
  });
  console.log(`  Found Report inserted: ${case3FoundRes.status} (${case3FoundId})`);

  // AI Match
  const score3 = computeScore(0.85, 0.85, true);
  await req('/rest/v1/matches', 'POST', {
    id: case3MatchId,
    lost_report_id: case3LostId,
    found_report_id: case3FoundId,
    text_score: score3.textScore,
    image_score: score3.imageScore,
    category_score: score3.catScore,
    confidence_score: score3.confidenceScore,
    status: 'suggested'
  });
  console.log(`  Match created: Confidence ${score3.confidenceScore} (~${Math.round(score3.confidenceScore * 100)}%)`);

  // Notification for Ragini
  await req('/rest/v1/notifications', 'POST', {
    id: case3NotifId,
    user_id: ragini.id,
    type: 'match',
    title: `New Match Detected (~${Math.round(score3.confidenceScore * 100)}% Match)`,
    body: `A candidate for your report "boAt Airdopes 141 ANC wireless earbuds (white)" has been identified at Central Library 2nd Floor.`,
    data: { match_id: case3MatchId, report_id: case3LostId, count: 1 },
    read: false
  });

  seededCases.push({
    title: 'boAt Wireless Earbuds',
    lostId: case3LostId,
    foundId: case3FoundId,
    matchId: case3MatchId,
    owner: ragini.full_name,
    ownerEmail: ragini.vit_email,
    finder: neha.full_name,
    score: score3.confidenceScore,
    secret: case3Secret
  });

  // Document all 3 cases in docs/DEMO_DATA.md
  console.log('\n--- DOCUMENTING IN docs/DEMO_DATA.md ---');
  let md = `# Pre-Loaded Demonstration Test Cases (Live Production Database)
## Faculty Presentation — 3 Real Student Scenarios

This reference document contains the exact identifiers, student accounts, item specifications, and AI match scores for all 3 demonstration scenarios seeded in the live production database.

---

### Student Personas Used

1. **Ragini Kengale** (\`ragini.kengale24@vit.edu\`, PRN: \`PRN-2410892\`, ID: \`${ragini.id}\`)
   - Lost Owner for Case 1 (Dell Laptop) & Case 3 (boAt Earbuds).
   - In-app notifications: 2 unread match alerts.
2. **Neha Patil** (\`neha.patil23@vit.edu\`, PRN: \`PRN-2310619\`, ID: \`${neha.id}\`)
   - Lost Owner for Case 2 (Casio Calculator) & Finder for Case 3 (boAt Earbuds).
   - In-app notifications: 1 unread match alert.
3. **Aditya Joshi** (\`aditya.joshi22@vit.edu\`, PRN: \`PRN-2210451\`, ID: \`${aditya.id}\`)
   - Finder for Case 1 (Dell Laptop) & Case 2 (Casio Calculator).

---

### Scenario Breakdown

`;

  seededCases.forEach((c, idx) => {
    md += `### Case ${idx + 1}: ${c.title}
- **Lost Report ID**: \`${c.lostId}\` (Owner: ${c.owner} — \`${c.ownerEmail}\`)
- **Found Report ID**: \`${c.foundId}\` (Finder: ${c.finder})
- **AI Match ID**: \`${c.matchId}\`
- **Multi-Factor Confidence Score**: \`${c.score}\` (~${Math.round(c.score * 100)}%)
- **Match Status**: \`suggested\` (**UNCLAIMED** — ready for live verification demo)
- **Encrypted Secret**: *"${c.secret}"*

`;
  });

  fs.writeFileSync(path.join('D:\\dtplm_cp_ai', 'docs', 'DEMO_DATA.md'), md);
  console.log('docs/DEMO_DATA.md updated with all 3 scenarios.');
  console.log('\nAll 3 scenarios seeded successfully into live database and storage!');
}

main().catch(err => {
  console.error('Fatal error seeding demo scenarios:', err);
  process.exit(1);
});
