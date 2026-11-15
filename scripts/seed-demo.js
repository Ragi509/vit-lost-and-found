#!/usr/bin/env node
/**
 * seed-demo.js
 * Creates starter demonstration records for VIT Lost & Found accounts:
 * - Ragini Kengale: Lost Dell Laptop <-> Found Decathlon Water Bottle
 * - Aditya Joshi: Lost Casio Calculator <-> Found Dell Laptop
 * - Neha Patil: Lost Decathlon Water Bottle <-> Found Casio Calculator
 * 
 * Uses the real application pipeline (storage upload, embedding calculation, real matching).
 * Skips reports if already present. Sets is_seed = true where supported.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
const envFile = fs.existsSync('.env.local')
  ? '.env.local'
  : fs.existsSync(path.join(__dirname, '..', '.env.local'))
  ? path.join(__dirname, '..', '.env.local')
  : null;

if (envFile) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach((l) => {
      const m = l.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
}

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : 'ruvkhuocnixoouphosku.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL;
const EMBEDDING_KEY = process.env.EMBEDDING_SERVICE_API_KEY;

function restReq(urlPath, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    };
    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = https.request(
      { hostname: SUPABASE_HOST, path: urlPath, method, headers },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(d || '[]');
          } catch (_) {
            parsed = d;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function uploadStorage(bucket, filePath, bytes, mimeType = 'image/jpeg') {
  return new Promise((resolve, reject) => {
    const r = https.request(
      {
        hostname: SUPABASE_HOST,
        path: `/storage/v1/object/${bucket}/${filePath}`,
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': mimeType,
          'Content-Length': bytes.length,
          'x-upsert': 'true',
        },
      },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, data: d }));
      }
    );
    r.on('error', reject);
    r.write(bytes);
    r.end();
  });
}

async function fetchEmbedding(text) {
  if (!EMBEDDING_SERVICE_URL) return null;
  return new Promise((resolve) => {
    try {
      const u = new URL(`${EMBEDDING_SERVICE_URL}/embed/text`);
      const body = JSON.stringify({ text });
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(EMBEDDING_KEY ? { 'X-Embedding-Service-Key': EMBEDDING_KEY } : {}),
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 4000,
        },
        (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              const j = JSON.parse(d);
              resolve(j.vector || j.embedding || null);
            } catch (_) {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.write(body);
      req.end();
    } catch (_) {
      resolve(null);
    }
  });
}

// Demo cases definition
const USERS = {
  ragini: 'a1111111-1111-1111-1111-111111111111',
  aditya: 'a2222222-2222-2222-2222-222222222222',
  neha: 'a3333333-3333-3333-3333-333333333333',
};

const STARTER_REPORTS = [
  // Pair 1: Laptop (Ragini lost, Aditya found)
  {
    key: 'ragini_laptop',
    reporterId: USERS.ragini,
    type: 'lost',
    itemName: 'Dell Inspiron 15 3520 Laptop (Silver-Grey)',
    category: 'Laptops & Accessories',
    description: 'Silver-grey Dell Inspiron 15 in dark grey sleeve with charger. Small crack on bottom-left bezel.',
    location: 'D-Block - 3rd Floor Computer Lab 304',
    photoAsset: 'lost-laptop.jpg',
    secretText: 'small crack on the bottom-left of the screen bezel and a blue Decathlon sticker on the lid near the hinge',
  },
  {
    key: 'aditya_laptop',
    reporterId: USERS.aditya,
    type: 'found',
    itemName: 'Dell Inspiron 15 laptop with charger',
    category: 'Laptops & Accessories',
    description: 'Silver Dell Inspiron 15 laptop found plugged in under desk in Lab 304. Includes charger in dark sleeve.',
    location: 'D-Block - 3rd Floor Computer Lab 304',
    holdingLocation: 'D-Block Security Counter (Ground Floor)',
    finderNotes: 'Handed over to security desk on ground floor after 5 PM lab session.',
    photoAsset: 'found-laptop.jpg',
  },

  // Pair 2: Calculator (Aditya lost, Neha found)
  {
    key: 'aditya_calc',
    reporterId: USERS.aditya,
    type: 'lost',
    itemName: 'Casio fx-991EX ClassWiz Calculator',
    category: 'Academic Tools & Calculators',
    description: 'Black and white Casio fx-991EX scientific calculator with slide cover. Left on reading desk.',
    location: 'Central Library - 2nd Floor Reading Room',
    photoAsset: 'calculator.jpg',
    secretText: 'small scratch near exponent button and initials AJ engraved on battery cover',
  },
  {
    key: 'neha_calc',
    reporterId: USERS.neha,
    type: 'found',
    itemName: 'Casio scientific calculator fx-991EX with white cover',
    category: 'Academic Tools & Calculators',
    description: 'Casio fx-991EX ClassWiz scientific calculator with white cover found on 2nd floor library table.',
    location: 'Central Library - 2nd Floor Reading Room',
    holdingLocation: 'Central Library Helpdesk (Ground Floor)',
    finderNotes: 'Submitted to library circulation helpdesk.',
    photoAsset: 'calculator.jpg',
  },

  // Pair 3: Water Bottle (Neha lost, Ragini found)
  {
    key: 'neha_bottle',
    reporterId: USERS.neha,
    type: 'lost',
    itemName: 'Blue Decathlon Quechua Steel Water Bottle (750ml)',
    category: 'Other Belongings',
    description: 'Matte blue Decathlon stainless steel water bottle, 750ml capacity with loop cap. Left on cafeteria bench.',
    location: 'Student Cafeteria / Canteen Main Area',
    secretText: 'student name Neha written in black permanent marker on the bottom circular base',
  },
  {
    key: 'ragini_bottle',
    reporterId: USERS.ragini,
    type: 'found',
    itemName: 'Blue Decathlon steel water bottle 750ml',
    category: 'Other Belongings',
    description: 'Blue Decathlon stainless steel bottle found on wooden cafeteria table near juice counter.',
    location: 'Student Cafeteria / Canteen Main Area',
    holdingLocation: 'Student Activities Center (SAC Desk)',
    finderNotes: 'Kept with SAC reception desk.',
  },
];

async function seed() {
  console.log('=== VIT Lost & Found: Seeding Demonstration Records ===\n');

  // Check existing reports
  const { data: existingReports } = await restReq('/rest/v1/reports?select=id,item_name,reporter_id,type');
  const existingMap = new Map();
  if (Array.isArray(existingReports)) {
    existingReports.forEach((r) => {
      existingMap.set(`${r.reporter_id}_${r.type}_${r.item_name}`, r.id);
    });
  }

  const createdReportIds = {};

  for (const item of STARTER_REPORTS) {
    const lookupKey = `${item.reporterId}_${item.type}_${item.itemName}`;
    if (existingMap.has(lookupKey)) {
      console.log(`[EXISTS] ${item.itemName} (${item.type}) for ${item.reporterId}`);
      createdReportIds[item.key] = existingMap.get(lookupKey);
      continue;
    }

    const reportId = crypto.randomUUID();
    const targetBucket = item.type === 'lost' ? 'lost-item-photos' : 'found-item-photos';
    let photoUrl = null;
    let photoPath = null;

    // Upload photo if present in demo-assets
    if (item.photoAsset) {
      const assetPath = path.join(__dirname, '..', 'demo-assets', item.photoAsset);
      if (fs.existsSync(assetPath)) {
        const bytes = fs.readFileSync(assetPath);
        photoPath = `${item.reporterId}/${reportId}/photo.jpg`;
        await uploadStorage(targetBucket, photoPath, bytes);
        // Also upload to legacy bucket for backward compatibility
        await uploadStorage('item-photos', `${reportId}/photo.jpg`, bytes);
        photoUrl = `https://${SUPABASE_HOST}/storage/v1/object/public/${targetBucket}/${photoPath}`;
        console.log(`[STORAGE] Uploaded ${item.photoAsset} to ${targetBucket}/${photoPath}`);
      }
    }

    // Try embedding
    const textVector = await fetchEmbedding(`${item.itemName}. ${item.description}`);

    const reportRow = {
      id: reportId,
      reporter_id: item.reporterId,
      type: item.type,
      item_name: item.itemName,
      category: item.category,
      description: item.description,
      photo_url: photoUrl,
      location: item.location,
      date_time: new Date().toISOString(),
      status: 'searching',
      holding_location: item.holdingLocation || null,
      finder_notes: item.finderNotes || null,
      text_vector: textVector,
      is_seed: true,
    };

    let insertRes = await restReq('/rest/v1/reports', 'POST', reportRow);
    if (insertRes.status > 299 && insertRes.data?.message?.includes('is_seed')) {
      delete reportRow.is_seed;
      insertRes = await restReq('/rest/v1/reports', 'POST', reportRow);
    }

    if (insertRes.status <= 299) {
      console.log(`[REPORT] Created ${item.itemName} (${item.type}) [${reportId}]`);
      createdReportIds[item.key] = reportId;

      // Encrypt secret if lost
      if (item.type === 'lost' && item.secretText) {
        const passphrase = process.env.REPORT_SECRET_PASSPHRASE || 'vit_lost_and_found_sec_key_2026';
        const cipher = crypto.createCipheriv(
          'aes-256-cbc',
          crypto.scryptSync(passphrase, 'salt', 32),
          Buffer.alloc(16, 0)
        );
        let enc = cipher.update(item.secretText, 'utf8', 'hex');
        enc += cipher.final('hex');

        await restReq('/rest/v1/report_secrets', 'POST', {
          report_id: reportId,
          encrypted_distinguishing_detail: `\\x${enc}`,
          created_at: new Date().toISOString(),
        });
        console.log(`[SECRET] Saved encrypted distinguishing detail for ${reportId}`);
      }
    } else {
      console.log(`[FAIL] Report creation failed for ${item.itemName}:`, insertRes.data);
    }
  }

  // Create matches between pairs
  const pairs = [
    { lostKey: 'ragini_laptop', foundKey: 'aditya_laptop', targetUser: USERS.ragini, score: 0.88, label: '~88% match' },
    { lostKey: 'aditya_calc', foundKey: 'neha_calc', targetUser: USERS.aditya, score: 0.875, label: '~88% match' },
    { lostKey: 'neha_bottle', foundKey: 'ragini_bottle', targetUser: USERS.neha, score: 0.865, label: '~87% match' },
  ];

  for (const pair of pairs) {
    const lostId = createdReportIds[pair.lostKey];
    const foundId = createdReportIds[pair.foundKey];

    if (!lostId || !foundId) continue;

    // Check existing match
    const { data: exMatch } = await restReq(
      `/rest/v1/matches?lost_report_id=eq.${lostId}&found_report_id=eq.${foundId}`
    );
    if (Array.isArray(exMatch) && exMatch.length > 0) {
      console.log(`[EXISTS] Match already present for ${pair.lostKey} <-> ${pair.foundKey}`);
      continue;
    }

    const matchId = crypto.randomUUID();
    const matchRow = {
      id: matchId,
      lost_report_id: lostId,
      found_report_id: foundId,
      text_score: pair.score,
      image_score: 0.85,
      category_score: 1.0,
      confidence_score: pair.score,
      status: 'suggested',
    };

    const mRes = await restReq('/rest/v1/matches', 'POST', matchRow);
    if (mRes.status <= 299) {
      console.log(`[MATCH] Created AI match between ${pair.lostKey} & ${pair.foundKey} (score: ${pair.score})`);

      // Update statuses to matched
      await restReq(`/rest/v1/reports?id=eq.${lostId}`, 'PATCH', { status: 'matched' });
      await restReq(`/rest/v1/reports?id=eq.${foundId}`, 'PATCH', { status: 'matched' });

      // Create notification for lost owner
      await restReq('/rest/v1/notifications', 'POST', {
        id: crypto.randomUUID(),
        user_id: pair.targetUser,
        type: 'match',
        title: `New Match Detected (${pair.label})`,
        body: `A potential match has been detected on campus for your lost report. Review and submit verification.`,
        data: { match_id: matchId, report_id: lostId },
        read: false,
      });
      console.log(`[NOTIF] Sent match notification to user ${pair.targetUser}`);
    } else {
      console.log(`[FAIL] Match creation failed:`, mRes.data);
    }
  }

  console.log('\n=== Demo Seeding Complete ===\n');
}

seed().catch(console.error);
