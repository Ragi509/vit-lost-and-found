const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');

async function run() {
  const res = await fetch('https://ruvkhuocnixoouphosku.supabase.co/rest/v1/reports?select=id,type,item_name,category,status,reporter_id,created_at&order=created_at.desc', {
    headers: {
      'apikey': key,
      'Authorization': 'Bearer ' + key
    }
  });
  console.log('HTTP Status:', res.status);
  const data = await res.json();
  if (Array.isArray(data)) {
    console.log(`Total live reports in database: ${data.length}`);
    data.forEach((r, idx) => {
      console.log(`[${idx+1}] ${r.id.substring(0,8)}... | ${r.type.toUpperCase()} | ${r.item_name} | ${r.status} | ${r.category} | ${r.reporter_id}`);
    });
  }
}

run();
