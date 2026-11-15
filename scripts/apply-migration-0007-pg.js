#!/usr/bin/env node
/**
 * apply-migration-0007-pg.js
 * Uses the pg package to apply migration 0007 via direct Postgres connection
 * to Supabase's connection pooler.
 * 
 * Supabase connection pooler (transaction mode): 
 *   host: aws-0-ap-south-1.pooler.supabase.com
 *   port: 6543
 *   user: postgres.ruvkhuocnixoouphosku
 *   password: [from env or hardcoded for migration]
 *   database: postgres
 *   ssl: require
 * 
 * However we don't have the DB password. The service role JWT cannot be used as DB password.
 * 
 * WORKAROUND: Use the Supabase REST API to call a function that accepts and executes SQL.
 * First, we need to CREATE that function using... the same problem.
 * 
 * ALTERNATIVE: Use the Supabase auth.admin API to create a custom JWT claim,
 * then run SQL via a specially crafted RPC call.
 * 
 * ACTUAL SOLUTION: Supabase hosted projects support the management API at:
 * https://api.supabase.com/v1/projects/{ref}/database/query
 * This requires a Supabase personal access token (PAT).
 * 
 * Since we don't have a PAT stored, we'll generate the SQL to be manually pasted
 * in the Supabase SQL editor, and also apply everything we CAN do via REST.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ruvkhuocnixoouphosku.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dmtodW9jbml4b291cGhvc2t1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDEwMTM3MCwiZXhwIjoyMTA1Njc3MzcwfQ.Prae_ixbxqN8cnf5aDQF4paSD9rMmu4jG8wWTWb6HEQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Things we CAN do via REST:
// 1. Create storage buckets - DONE in previous script
// 2. Upload/download files
// 3. Insert/update/delete rows (DML)
// 4. Call existing stored procedures

// Things requiring raw SQL (DDL):
// - ALTER TABLE ADD COLUMN
// - CREATE INDEX
// - CREATE FUNCTION / CREATE TRIGGER
// - CREATE POLICY
// - DROP POLICY

// APPROACH: Use supabase-js to do DML, check what columns exist, 
// and generate a minimal SQL file for the SQL editor.

async function checkCurrentSchema() {
  console.log('=== Checking current schema state ===\n');
  
  // Check which columns already exist by querying information_schema
  const { data: cols, error } = await supabase
    .from('reports')
    .select('id, created_at')
    .limit(1);
  
  // Try to select new columns to see if they exist
  const columnsToCheck = ['updated_at', 'is_seed', 'photo_bucket', 'photo_path', 'search_vector'];
  const missingColumns = [];
  
  for (const col of columnsToCheck) {
    try {
      const selectStr = `id, ${col}`;
      const { data, error: colErr } = await supabase.from('reports').select(selectStr).limit(1);
      if (colErr && colErr.message.includes('does not exist')) {
        missingColumns.push(col);
        console.log(`✗ Column missing: ${col}`);
      } else {
        console.log(`✓ Column exists: ${col}`);
      }
    } catch (e) {
      missingColumns.push(col);
      console.log(`✗ Column missing (exception): ${col}`);
    }
  }
  
  // Check storage buckets
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketNames = (buckets || []).map(b => b.name);
  console.log('\nStorage buckets:', bucketNames.join(', '));
  
  return { missingColumns, bucketNames };
}

async function applyDMLChanges() {
  console.log('\n=== Applying DML changes via REST ===\n');
  
  // Create storage buckets if missing
  for (const bucketId of ['lost-item-photos', 'found-item-photos']) {
    const { data, error } = await supabase.storage.createBucket(bucketId, {
      public: false,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    });
    if (error && !error.message.includes('already exists')) {
      console.log(`✗ Failed to create bucket ${bucketId}:`, error.message);
    } else {
      console.log(`✓ Bucket ${bucketId}: ${error?.message.includes('already exists') ? 'already exists' : 'created'}`);
    }
  }
}

async function generateManualSQL(missingColumns) {
  const sqlStatements = [];
  
  if (missingColumns.includes('updated_at')) {
    sqlStatements.push(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`);
    sqlStatements.push(`UPDATE public.reports SET updated_at = created_at WHERE updated_at IS NULL;`);
    sqlStatements.push(`ALTER TABLE public.reports ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());`);
  }
  if (missingColumns.includes('is_seed')) {
    sqlStatements.push(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;`);
  }
  if (missingColumns.includes('photo_bucket')) {
    sqlStatements.push(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_bucket TEXT;`);
    sqlStatements.push(`UPDATE public.reports SET photo_bucket = CASE type WHEN 'lost' THEN 'lost-item-photos' ELSE 'found-item-photos' END WHERE photo_url IS NOT NULL AND photo_bucket IS NULL;`);
  }
  if (missingColumns.includes('photo_path')) {
    sqlStatements.push(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_path TEXT;`);
    sqlStatements.push(`UPDATE public.reports SET photo_path = reporter_id::text || '/' || id::text || '/photo.jpg' WHERE photo_url IS NOT NULL AND photo_path IS NULL;`);
  }
  if (missingColumns.includes('search_vector')) {
    sqlStatements.push(`ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(item_name,'') || ' ' || coalesce(description,''))) STORED;`);
  }
  
  // Always run these (idempotent)
  sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_reports_reporter_status ON public.reports(reporter_id, status);`);
  sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_reports_type_status_created ON public.reports(type, status, created_at DESC);`);
  if (!missingColumns.includes('search_vector')) {
    // If search_vector already exists, still create the index
    sqlStatements.push(`CREATE INDEX IF NOT EXISTS idx_reports_search_gin ON public.reports USING GIN(search_vector);`);
  }
  
  sqlStatements.push(`
CREATE OR REPLACE FUNCTION public.guard_report_immutable_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    IF OLD.reporter_id IS DISTINCT FROM NEW.reporter_id THEN
      RAISE EXCEPTION 'Forbidden: reporter_id is immutable';
    END IF;
    IF OLD.type IS DISTINCT FROM NEW.type THEN
      RAISE EXCEPTION 'Forbidden: type is immutable after creation';
    END IF;
    IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
      RAISE EXCEPTION 'Forbidden: created_at is immutable';
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_report_immutable ON public.reports;
CREATE TRIGGER trg_guard_report_immutable
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_immutable_fields();`);

  sqlStatements.push(`
CREATE OR REPLACE FUNCTION public.browse_reports(
  p_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID, type TEXT, item_name TEXT, category TEXT, description TEXT,
  location TEXT, date_time TIMESTAMPTZ, status TEXT,
  photo_bucket TEXT, photo_path TEXT, photo_url TEXT,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, is_own BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id, r.type, r.item_name, r.category, r.description,
    r.location, r.date_time, r.status,
    r.photo_bucket, r.photo_path, r.photo_url,
    r.created_at, r.updated_at,
    (r.reporter_id = auth.uid()) AS is_own
  FROM public.reports r
  WHERE r.status IN ('searching', 'matched')
    AND (p_type IS NULL OR p_type = 'all' OR r.type = p_type)
    AND (p_category IS NULL OR r.category = p_category)
    AND (p_location IS NULL OR r.location ILIKE '%' || p_location || '%')
    AND (p_search IS NULL OR r.item_name ILIKE '%' || p_search || '%' OR r.description ILIKE '%' || p_search || '%')
  ORDER BY r.created_at DESC
  LIMIT p_page_size OFFSET ((p_page - 1) * p_page_size);
END;
$$;

GRANT EXECUTE ON FUNCTION public.browse_reports(TEXT,TEXT,TEXT,TEXT,INT,INT) TO authenticated;`);

  sqlStatements.push(`
CREATE OR REPLACE VIEW public.lost_items WITH (security_invoker = true) AS
SELECT id, reporter_id, type, item_name, category, description, photo_url,
       photo_bucket, photo_path, date_time, location, status, holding_location,
       created_at, updated_at, is_seed FROM public.reports WHERE type = 'lost';

CREATE OR REPLACE VIEW public.found_items WITH (security_invoker = true) AS
SELECT id, reporter_id, type, item_name, category, description, photo_url,
       photo_bucket, photo_path, date_time, location, status, holding_location,
       created_at, updated_at, is_seed FROM public.reports WHERE type = 'found';`);

  sqlStatements.push(`
DROP POLICY IF EXISTS "Allow authenticated read reports" ON public.reports;
CREATE POLICY "Owner or admin reads own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner can delete own report" ON public.reports;
CREATE POLICY "Owner can delete own report"
  ON public.reports FOR DELETE TO authenticated
  USING (reporter_id = auth.uid());`);

  // Storage RLS for new buckets
  sqlStatements.push(`
DROP POLICY IF EXISTS "Lost bucket: owner upload" ON storage.objects;
CREATE POLICY "Lost bucket: owner upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lost-item-photos' AND
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid() AND r.type = 'lost')
);

DROP POLICY IF EXISTS "Lost bucket: read" ON storage.objects;
CREATE POLICY "Lost bucket: read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'lost-item-photos' AND (
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.matches m JOIN public.reports lr ON lr.id = m.lost_report_id JOIN public.reports fr ON fr.id = m.found_report_id WHERE ((storage.foldername(name))[2] = lr.id::text OR (storage.foldername(name))[2] = fr.id::text) AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Lost bucket: delete" ON storage.objects;
CREATE POLICY "Lost bucket: delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lost-item-photos' AND (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid())));

DROP POLICY IF EXISTS "Found bucket: owner upload" ON storage.objects;
CREATE POLICY "Found bucket: owner upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'found-item-photos' AND
  EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid() AND r.type = 'found')
);

DROP POLICY IF EXISTS "Found bucket: read" ON storage.objects;
CREATE POLICY "Found bucket: read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'found-item-photos' AND (
    public.is_admin(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.matches m JOIN public.reports lr ON lr.id = m.lost_report_id JOIN public.reports fr ON fr.id = m.found_report_id WHERE ((storage.foldername(name))[2] = lr.id::text OR (storage.foldername(name))[2] = fr.id::text) AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "Found bucket: delete" ON storage.objects;
CREATE POLICY "Found bucket: delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'found-item-photos' AND (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid())));`);

  return sqlStatements.join('\n\n');
}

async function main() {
  const { missingColumns, bucketNames } = await checkCurrentSchema();
  await applyDMLChanges();
  
  const manualSQL = await generateManualSQL(missingColumns);
  
  // Write to a file for easy copy-paste
  const fs = require('fs');
  const outputPath = __dirname + '/../supabase/migrations/0007_manual_apply.sql';
  fs.writeFileSync(outputPath, manualSQL, 'utf8');
  
  console.log('\n=== Summary ===');
  console.log('Missing columns that need DDL:', missingColumns.join(', ') || 'none');
  console.log('Storage buckets:', bucketNames.join(', '));
  console.log('\n📋 Manual SQL generated at: supabase/migrations/0007_manual_apply.sql');
  console.log('   → Paste this into Supabase Dashboard > SQL Editor > Run');
  console.log('\nSQL preview (first 500 chars):');
  console.log(manualSQL.substring(0, 500) + '...');
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
