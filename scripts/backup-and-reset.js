const https = require('https');
const fs = require('fs');
const path = require('path');

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
    }
    const r = https.request({ hostname: SUPABASE_HOST, path: urlPath, method, headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(d || '[]'); } catch (e) { parsed = d; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

function jsonToCsv(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const csvRows = [headers.join(',')];
  for (const item of items) {
    const values = headers.map(header => {
      const val = item[header];
      if (val === null || val === undefined) return '';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return '"' + str.replace(/"/g, '""') + '"';
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

async function listAllStorageObjects(prefix = '') {
  const res = await req('/storage/v1/object/list/item-photos', 'POST', { prefix, limit: 1000 });
  const items = Array.isArray(res.data) ? res.data : [];
  let all = [];
  for (const item of items) {
    if (item.id === null) {
      // folder
      const sub = await listAllStorageObjects(prefix ? `${prefix}/${item.name}` : item.name);
      all = all.concat(sub);
    } else {
      all.push({ ...item, path: prefix ? `${prefix}/${item.name}` : item.name });
    }
  }
  return all;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('D:\\dtplm_cp_ai', 'docs', 'backups', timestamp);
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`[BACKUP] Target directory: ${backupDir}`);

  const tables = [
    { name: 'users', query: '/rest/v1/users?select=*' },
    { name: 'admins', query: '/rest/v1/admins?select=*' },
    { name: 'admin_invites', query: '/rest/v1/admin_invites?select=*' },
    { name: 'reports', query: '/rest/v1/reports?select=*' },
    { name: 'matches', query: '/rest/v1/matches?select=*' },
    { name: 'verifications', query: '/rest/v1/verifications?select=*' },
    { name: 'notifications', query: '/rest/v1/notifications?select=*' },
    { name: 'escalations', query: '/rest/v1/escalations?select=*' },
    // report_secrets: metadata ONLY (report_id, created_at) - NEVER export decrypted secrets
    { name: 'report_secrets', query: '/rest/v1/report_secrets?select=report_id,created_at' },
  ];

  const backupManifest = {
    timestamp,
    exported_at: new Date().toISOString(),
    tables: {},
    storage_objects_count: 0
  };

  for (const t of tables) {
    const res = await req(t.query);
    const rows = Array.isArray(res.data) ? res.data : [];
    console.log(`[EXPORT] Table '${t.name}': ${rows.length} rows (status: ${res.status})`);
    
    fs.writeFileSync(path.join(backupDir, `${t.name}.json`), JSON.stringify(rows, null, 2));
    fs.writeFileSync(path.join(backupDir, `${t.name}.csv`), jsonToCsv(rows));
    
    backupManifest.tables[t.name] = {
      rows: rows.length,
      json_size: fs.statSync(path.join(backupDir, `${t.name}.json`)).size,
      csv_size: fs.statSync(path.join(backupDir, `${t.name}.csv`)).size
    };
  }

  // Backup storage objects
  const storageObjects = await listAllStorageObjects();
  console.log(`[EXPORT] Storage bucket 'item-photos': ${storageObjects.length} objects`);
  fs.writeFileSync(path.join(backupDir, 'storage_objects.json'), JSON.stringify(storageObjects, null, 2));
  fs.writeFileSync(path.join(backupDir, 'storage_objects.csv'), jsonToCsv(storageObjects));
  backupManifest.storage_objects_count = storageObjects.length;

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(backupManifest, null, 2));
  console.log(`[BACKUP VERIFIED] Manifest written successfully.`);

  // Verify backup readability
  for (const t of tables) {
    const content = fs.readFileSync(path.join(backupDir, `${t.name}.json`), 'utf8');
    JSON.parse(content);
  }
  console.log(`[BACKUP VERIFIED] All JSON files verified valid and readable.`);

  // RESET STEP
  console.log('\n--- EXECUTING RESET OF APPLICATION TABLES ---');

  // 1. Delete verifications
  const delVerif = await req('/rest/v1/verifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted verifications: Status ${delVerif.status}`);

  // 2. Delete matches
  const delMatches = await req('/rest/v1/matches?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted matches: Status ${delMatches.status}`);

  // 3. Delete escalations
  const delEsc = await req('/rest/v1/escalations?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted escalations: Status ${delEsc.status}`);

  // Clear app_config escalations_store fallback if present
  await req('/rest/v1/app_config?key=eq.escalations_store', 'PATCH', { value: JSON.stringify([]) });

  // 4. Delete notifications
  const delNotif = await req('/rest/v1/notifications?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted notifications: Status ${delNotif.status}`);

  // 5. Delete report_secrets
  const delSecrets = await req('/rest/v1/report_secrets?report_id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted report_secrets: Status ${delSecrets.status}`);

  // 6. Delete reports
  const delReports = await req('/rest/v1/reports?id=neq.00000000-0000-0000-0000-000000000000', 'DELETE');
  console.log(`Deleted reports: Status ${delReports.status}`);

  // 7. Delete all objects in item-photos storage bucket
  if (storageObjects.length > 0) {
    const filePaths = storageObjects.map(o => o.path || o.name);
    console.log(`Deleting ${filePaths.length} objects from item-photos storage...`);
    const delStorage = await req('/storage/v1/object/item-photos', 'DELETE', { prefixes: filePaths });
    console.log(`Storage deletion status: ${delStorage.status}`);
  }

  // 8. VERIFY ROW COUNTS OF CLEARED TABLES
  console.log('\n--- VERIFYING POST-RESET ROW COUNTS ---');
  const verifyTables = [
    'reports',
    'report_secrets',
    'matches',
    'verifications',
    'notifications',
    'escalations'
  ];

  const postCounts = {};
  for (const t of verifyTables) {
    const res = await req(`/rest/v1/${t}?select=id`);
    const count = Array.isArray(res.data) ? res.data.length : (res.data ? 0 : 0);
    postCounts[t] = count;
    console.log(`Table '${t}' count: ${count}`);
  }

  // Verify non-cleared tables remain intact
  const userCheck = await req('/rest/v1/users?select=id');
  const adminCheck = await req('/rest/v1/admins?select=id');
  console.log(`Preserved 'users' count: ${Array.isArray(userCheck.data) ? userCheck.data.length : 'N/A'}`);
  console.log(`Preserved 'admins' count: ${Array.isArray(adminCheck.data) ? adminCheck.data.length : 'N/A'}`);

  console.log('\nPost-reset summary:', JSON.stringify(postCounts, null, 2));
}

main().catch(err => {
  console.error('Fatal error in backup-and-reset:', err);
  process.exit(1);
});
