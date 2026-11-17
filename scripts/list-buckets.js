const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');

fetch('https://ruvkhuocnixoouphosku.supabase.co/storage/v1/bucket', {
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
}).then(async r => {
  console.log('Buckets list status:', r.status);
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2));
}).catch(console.error);
