const https = require('https');

const EMBEDDING_URL = 'https://vit-lost-found-embeddings.onrender.com';
const API_KEY = 'vit_sec_embed_live_948fbc2a10e7b4382c7';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const url = `${EMBEDDING_URL}${endpoint}`;
  console.log(`\nTesting: ${method} ${url}`);
  const t0 = Date.now();
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-Embedding-Service-Key': API_KEY
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000)
    });
    
    const elapsed = Date.now() - t0;
    console.log(`Status: ${res.status} (${res.statusText}) in ${elapsed}ms`);
    const text = await res.text();
    console.log(`Response: ${text.slice(0, 300)}`);
    return { status: res.status, elapsed, body: text };
  } catch (err) {
    const elapsed = Date.now() - t0;
    console.log(`Failed after ${elapsed}ms: ${err.message}`);
    return { error: err.message, elapsed };
  }
}

async function run() {
  console.log('=====================================================');
  console.log('   RENDER FASTAPI AI SERVICE DIRECT AUDIT');
  console.log('=====================================================');

  // 1. Health check
  await testEndpoint('/health');

  // 2. Text embedding
  await testEndpoint('/embed/text', 'POST', { text: 'Dell Inspiron 15 silver-grey laptop with neoprene sleeve' });

  // 3. Keepalive endpoint on live Vercel
  console.log('\nTesting Live Vercel Keepalive Endpoint:');
  try {
    const vkRes = await fetch('https://vit-lost-and-found-roan.vercel.app/api/cron/keepalive');
    console.log(`Vercel Keepalive Status: ${vkRes.status}`);
    console.log(`Vercel Keepalive Body:`, await vkRes.json());
  } catch (e) {
    console.log(`Keepalive test error: ${e.message}`);
  }
}

run();
