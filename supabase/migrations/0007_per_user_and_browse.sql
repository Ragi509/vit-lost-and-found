-- ================================================================
-- 0007_per_user_and_browse.sql
-- ================================================================

-- 1. Add updated_at to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE public.reports SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE public.reports ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());
ALTER TABLE public.reports ALTER COLUMN updated_at SET NOT NULL;

-- 2. Add is_seed to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS is_seed BOOLEAN NOT NULL DEFAULT false;

-- 3. Add photo_bucket and photo_path to reports
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_bucket TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- 4. Migrate existing photo_url to photo_bucket/photo_path
-- Parse existing photo_url values to extract bucket and path
UPDATE public.reports
SET
  photo_bucket = CASE
    WHEN type = 'lost' THEN 'lost-item-photos'
    WHEN type = 'found' THEN 'found-item-photos'
    ELSE 'item-photos'
  END,
  photo_path = CASE
    WHEN photo_url IS NOT NULL THEN
      COALESCE(
        substring(photo_url from '/object/(?:public|sign)/([^?]+)'),
        photo_url
      )
    ELSE NULL
  END
WHERE photo_url IS NOT NULL AND photo_path IS NULL;

-- 5. Add composite indexes
CREATE INDEX IF NOT EXISTS idx_reports_reporter_status ON public.reports(reporter_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_type_status_created ON public.reports(type, status, created_at DESC);

-- 6. GIN text search index
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS search_vector tsvector;
UPDATE public.reports SET search_vector = to_tsvector('english', coalesce(item_name,'') || ' ' || coalesce(description,'')) WHERE search_vector IS NULL;
CREATE INDEX IF NOT EXISTS idx_reports_search_gin ON public.reports USING GIN(search_vector);

-- 7. BEFORE UPDATE guard trigger on reports
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
    IF OLD.text_vector IS DISTINCT FROM NEW.text_vector AND OLD.text_vector IS NOT NULL THEN
      IF current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Forbidden: embeddings may only be updated by the server';
      END IF;
    END IF;
  END IF;
  NEW.updated_at := timezone('utc'::text, now());
  NEW.search_vector := to_tsvector('english', coalesce(NEW.item_name,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_report_immutable ON public.reports;
CREATE TRIGGER trg_guard_report_immutable
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_immutable_fields();

-- 8. Create lost-item-photos and found-item-photos storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('lost-item-photos', 'lost-item-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('found-item-photos', 'found-item-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 9. Storage RLS for new buckets (lost-item-photos)
DROP POLICY IF EXISTS "Lost bucket: owner upload" ON storage.objects;
CREATE POLICY "Lost bucket: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lost-item-photos' AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id::text = (storage.foldername(name))[2]
        AND r.reporter_id = auth.uid()
        AND r.type = 'lost'
    )
  );

DROP POLICY IF EXISTS "Lost bucket: owner or match party read" ON storage.objects;
CREATE POLICY "Lost bucket: owner or match party read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lost-item-photos' AND (
      public.is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.reports lr ON lr.id = m.lost_report_id
        JOIN public.reports fr ON fr.id = m.found_report_id
        WHERE ((storage.foldername(name))[2] = lr.id::text OR (storage.foldername(name))[2] = fr.id::text)
          AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Lost bucket: owner delete" ON storage.objects;
CREATE POLICY "Lost bucket: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lost-item-photos' AND (
      public.is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid())
    )
  );

-- 10. Storage RLS for found-item-photos
DROP POLICY IF EXISTS "Found bucket: owner upload" ON storage.objects;
CREATE POLICY "Found bucket: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'found-item-photos' AND
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id::text = (storage.foldername(name))[2]
        AND r.reporter_id = auth.uid()
        AND r.type = 'found'
    )
  );

DROP POLICY IF EXISTS "Found bucket: owner or match party read" ON storage.objects;
CREATE POLICY "Found bucket: owner or match party read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'found-item-photos' AND (
      public.is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid()) OR
      EXISTS (
        SELECT 1 FROM public.matches m
        JOIN public.reports lr ON lr.id = m.lost_report_id
        JOIN public.reports fr ON fr.id = m.found_report_id
        WHERE ((storage.foldername(name))[2] = lr.id::text OR (storage.foldername(name))[2] = fr.id::text)
          AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Found bucket: owner delete" ON storage.objects;
CREATE POLICY "Found bucket: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'found-item-photos' AND (
      public.is_admin(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.reports r WHERE r.id::text = (storage.foldername(name))[2] AND r.reporter_id = auth.uid())
    )
  );

-- 11. browse_reports SECURITY DEFINER function (safe campus-wide read, no identity leak)
CREATE OR REPLACE FUNCTION public.browse_reports(
  p_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  item_name TEXT,
  category TEXT,
  description TEXT,
  location TEXT,
  date_time TIMESTAMPTZ,
  status TEXT,
  photo_bucket TEXT,
  photo_path TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_own BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.type,
    r.item_name,
    r.category,
    r.description,
    r.location,
    r.date_time,
    r.status,
    r.photo_bucket,
    r.photo_path,
    r.photo_url,
    r.created_at,
    r.updated_at,
    (r.reporter_id = auth.uid()) AS is_own
  FROM public.reports r
  WHERE
    r.status IN ('searching', 'matched')
    AND (p_type IS NULL OR r.type = p_type)
    AND (p_category IS NULL OR r.category = p_category)
    AND (p_location IS NULL OR r.location ILIKE '%' || p_location || '%')
    AND (p_search IS NULL OR r.search_vector @@ plainto_tsquery('english', p_search)
         OR r.item_name ILIKE '%' || p_search || '%'
         OR r.description ILIKE '%' || p_search || '%')
  ORDER BY r.created_at DESC
  LIMIT p_page_size
  OFFSET ((p_page - 1) * p_page_size);
END;
$$;

REVOKE ALL ON FUNCTION public.browse_reports FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.browse_reports TO authenticated;

-- 12. Update lost_items and found_items views to include new columns
CREATE OR REPLACE VIEW public.lost_items
WITH (security_invoker = true) AS
SELECT id, reporter_id, type, item_name, category, description,
       photo_url, photo_bucket, photo_path, date_time, location, status,
       holding_location, created_at, updated_at, is_seed
FROM public.reports WHERE type = 'lost';

CREATE OR REPLACE VIEW public.found_items
WITH (security_invoker = true) AS
SELECT id, reporter_id, type, item_name, category, description,
       photo_url, photo_bucket, photo_path, date_time, location, status,
       holding_location, created_at, updated_at, is_seed
FROM public.reports WHERE type = 'found';

-- 13. RLS fix: reports SELECT scoped to own rows + admin (remove broad read)
-- Keep the existing "Allow authenticated read reports" but we add a browse-specific path.
-- The browse_reports function is SECURITY DEFINER so it bypasses RLS safely.
-- Direct report reads remain owner-scoped:
DROP POLICY IF EXISTS "Allow authenticated read reports" ON public.reports;
CREATE POLICY "Owner or admin reads own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin(auth.uid()));

-- 14. Add DELETE policy for reports (owner only, enforced by API status check too)
DROP POLICY IF EXISTS "Owner can delete own report" ON public.reports;
CREATE POLICY "Owner can delete own report"
  ON public.reports FOR DELETE TO authenticated
  USING (reporter_id = auth.uid());
