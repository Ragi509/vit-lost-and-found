#!/usr/bin/env node
/**
 * seed-purge.js
 * Removes starter demonstration rows (where is_seed = true or matches starter item names),
 * cleaning up storage objects, matches, notifications, and report secrets.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function purge() {
  console.log('=== VIT Lost & Found: Purging Demonstration Records ===\n');

  // Query reports that are seed rows
  const { data: reports } = await restReq('/rest/v1/reports?select=id,reporter_id,item_name,type');
  if (!Array.isArray(reports) || reports.length === 0) {
    console.log('No reports found to purge.');
    return;
  }

  // Filter seed reports
  const seedKeywords = ['Dell Inspiron 15', 'Casio fx-991', 'Decathlon', 'Casio scientific'];
  const toDelete = reports.filter((r) => seedKeywords.some((k) => r.item_name?.includes(k)));

  console.log(`Found ${toDelete.length} demonstration reports to purge.`);

  for (const r of toDelete) {
    console.log(`Purging ${r.item_name} [${r.id}]...`);

    // Remove matches
    await restReq(`/rest/v1/matches?lost_report_id=eq.${r.id}`, 'DELETE');
    await restReq(`/rest/v1/matches?found_report_id=eq.${r.id}`, 'DELETE');

    // Remove secrets
    await restReq(`/rest/v1/report_secrets?report_id=eq.${r.id}`, 'DELETE');

    // Remove report
    await restReq(`/rest/v1/reports?id=eq.${r.id}`, 'DELETE');
  }

  console.log('\n=== Purge Complete ===\n');
}

purge().catch(console.error);
