const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'web', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const keyMatch = env.match(/RESEND_API_KEY=(.*)/);

if (!keyMatch) {
  console.error('RESEND_API_KEY not found in .env.local');
  process.exit(1);
}

const key = keyMatch[1].trim().replace(/^['"]|['"]$/g, '');
const testEmail = 'aditya.joshi24@vit.edu';

console.log('Testing Resend dispatch to real student address:', testEmail);

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + key,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'onboarding@resend.dev',
    to: [testEmail],
    subject: 'VIT Lost & Found Test Verification Code',
    html: '<p>Testing real student email delivery</p>'
  })
}).then(async res => {
  console.log('Resend Response HTTP Status:', res.status);
  const data = await res.json();
  console.log('Resend Response Body:', JSON.stringify(data, null, 2));
}).catch(err => {
  console.error('Fetch error:', err);
});
