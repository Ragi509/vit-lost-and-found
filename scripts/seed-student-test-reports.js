const fs = require('fs');
const https = require('https');
const path = require('path');

const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/^['"]|['"]$/g, '');
const host = new URL(url).hostname;

const studentId = '6f094ab1-9163-48a7-b721-f1e9e23bf09a';

async function seedReports() {
  const reports = [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      reporter_id: studentId,
      type: 'lost',
      item_name: 'Apple AirPods Pro 2nd Gen',
      category: 'Electronics',
      description: 'White charging case with MagSafe, left in Computer Lab 3',
      location: 'Computer Lab 3, Ground Floor',
      date_time: new Date().toISOString(),
      status: 'searching'
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      reporter_id: studentId,
      type: 'found',
      item_name: 'Decathlon Quechua Water Bottle 750ml',
      category: 'Personal Belongings',
      description: 'Metallic blue insulated bottle found near Canteen table 4',
      location: 'Central Canteen, Main Campus',
      date_time: new Date().toISOString(),
      holding_location: 'Main Security Desk, Gate 1',
      status: 'searching'
    }
  ];

  for (const r of reports) {
    const body = JSON.stringify(r);
    await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: host,
        path: '/rest/v1/reports',
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Prefer': 'resolution=merge-duplicates,return=representation'
        }
      }, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`Seeded report ${r.item_name}:`, res.statusCode);
          resolve();
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

seedReports();
