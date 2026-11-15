#!/usr/bin/env node
/**
 * apply-migration-0007.js
 * Applies migration 0007 to the live Supabase project.
 * Uses the Supabase Management API (REST) for DDL execution.
 * Run with: node scripts/apply-migration-0007.js
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ruvkhuocnixoouphosku.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmtodW9jbml4b291cGhvc2t1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDEwMTM3MCwiZXhwIjoyMTA1Njc3MzcwfQ.Prae_ixbxqN8cnf5aDQF4paSD9rMmu4jG8wWTWb6HEQ';

// Supabase PostgREST doesn't support raw DDL.
// We use the Supabase pg/query REST endpoint (available to service role).
async function execSQL(sql, label) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    // Try the pg query endpoint
    const r2 = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!r2.ok) {
      const errText = await r2.text();
      return { success: false, label, error: errText.substring(0, 200) };
    }
    const data2 = await r2.json();
    return { success: true, label, via: 'pg/query', rows: data2?.length ?? 0 };
  }
  return { success: true, label, via: 'rpc/exec_sql' };
}

// For storage bucket creation, use the storage API directly
async function createBucket(id, name) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      name,
      public: false,
      file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
    }),
  });
  const data = await r.json();
  if (!r.ok && !data.error?.includes('already exists') && !data.error?.includes('duplicate')) {
    return { success: false, bucket: id, error: data.error };
  }
  return { success: true, bucket: id, status: r.ok ? 'created' : 'already_exists' };
}

// Apply DDL via the Supabase SQL endpoint using the pg wrapper
// We'll split the migration file by statement separator
async function applyMigration() {
  const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '0007_per_user_and_browse.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('=== VIT Lost & Found: Applying Migration 0007 ===\n');
  
  // 1. Create storage buckets first (uses storage API, most reliable)
  console.log('--- Storage Buckets ---');
  const lostBucket = await createBucket('lost-item-photos', 'lost-item-photos');
  console.log(JSON.stringify(lostBucket));
  const foundBucket = await createBucket('found-item-photos', 'found-item-photos');
  console.log(JSON.stringify(foundBucket));
  
  // 2. Apply DDL via ALTER TABLE column additions (use PostgREST to call a function)
  // Split migration into logical blocks
  const ddlBlocks = [
    {
      label: 'Add updated_at column',
      sql: 'ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ'
    },
    {
      label: 'Backfill updated_at',
      sql: 'UPDATE public.reports SET updated_at = created_at WHERE updated_at IS NULL'
    },
    {
      label: 'Add is_seed column',
      sql: 'ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false'
    },
    {
      label: 'Add photo_bucket column',
      sql: 'ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_bucket TEXT'
    },
    {
      label: 'Add photo_path column',
      sql: 'ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_path TEXT'
    },
    {
      label: 'Add search_vector column',
      sql: "ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS search_vector tsvector"
    },
    {
      label: 'Backfill search_vector',
      sql: "UPDATE public.reports SET search_vector = to_tsvector('english', coalesce(item_name,'') || ' ' || coalesce(description,''))"
    },
    {
      label: 'Backfill photo_bucket/photo_path',
      sql: `UPDATE public.reports SET photo_bucket = CASE type WHEN 'lost' THEN 'lost-item-photos' ELSE 'found-item-photos' END, photo_path = reporter_id::text || '/' || id::text || '/photo.jpg' WHERE photo_url IS NOT NULL AND photo_path IS NULL`
    },
    {
      label: 'Create idx_reports_reporter_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_reports_reporter_status ON public.reports(reporter_id, status)'
    },
    {
      label: 'Create idx_reports_type_status_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_reports_type_status_created ON public.reports(type, status, created_at DESC)'
    },
    {
      label: 'Create idx_reports_search_gin',
      sql: 'CREATE INDEX IF NOT EXISTS idx_reports_search_gin ON public.reports USING GIN(search_vector)'
    },
  ];

  // We attempt via fetch to the pg endpoint (Supabase 2.x has this)
  for (const block of ddlBlocks) {
    const result = await execSQL(block.sql, block.label);
    console.log(`${result.success ? '✓' : '✗'} ${block.label}${result.error ? ': ' + result.error : ''}`);
  }

  // 3. Try applying full migration via the pg endpoint in one shot (may work)
  console.log('\n--- Full DDL Migration Block ---');
  const fullSqlBlocks = sql.split(/;\s*\n/).filter(s => s.trim().length > 0);
  let succeeded = 0, failed = 0;
  for (const block of fullSqlBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;
    const r = await execSQL(trimmed + ';', trimmed.substring(0, 60).replace(/\n/g, ' '));
    if (r.success) succeeded++;
    else {
      failed++;
      console.log(`  ✗ Failed: ${trimmed.substring(0, 80)}...`);
      if (r.error) console.log(`    Error: ${r.error}`);
    }
  }
  console.log(`\nFull migration: ${succeeded} succeeded, ${failed} failed`);

  // 4. Verify columns exist via REST
  console.log('\n--- Verification via REST API ---');
  const verifyR = await fetch(`${SUPABASE_URL}/rest/v1/reports?select=id,updated_at,is_seed,photo_bucket,photo_path&limit=1`, {
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
  });
  if (verifyR.ok) {
    const rows = await verifyR.json();
    console.log('Sample row (new columns):', JSON.stringify(rows[0] ?? 'no rows', null, 2));
    console.log('✓ New columns accessible via REST API');
  } else {
    const errText = await verifyR.text();
    console.log('✗ REST verification failed:', errText.substring(0, 200));
    console.log('\n⚠️  MANUAL SQL REQUIRED - run the following in Supabase SQL Editor:');
    console.log(sql);
  }

  // 5. Verify storage buckets
  console.log('\n--- Storage Bucket Verification ---');
  const bucketsR = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
  });
  const buckets = await bucketsR.json();
  const bucketNames = Array.isArray(buckets) ? buckets.map(b => b.name) : [];
  console.log('Buckets:', bucketNames.join(', '));
  if (bucketNames.includes('lost-item-photos')) console.log('✓ lost-item-photos bucket exists');
  else console.log('✗ lost-item-photos bucket MISSING');
  if (bucketNames.includes('found-item-photos')) console.log('✓ found-item-photos bucket exists');
  else console.log('✗ found-item-photos bucket MISSING');
}

applyMigration().then(() => {
  console.log('\n=== Migration 0007 complete ===');
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
