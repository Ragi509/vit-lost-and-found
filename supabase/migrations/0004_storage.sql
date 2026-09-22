-- ==============================================================================
-- 0004_storage.sql: Private Storage Bucket & Ownership-Linked RLS Policies
-- Compliant with Pre-Deployment Addendum v1 (Item 2)
-- ==============================================================================

-- 1. Create Private Bucket for Item Photos (Accessed strictly via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'item-photos',
    'item-photos',
    false, -- Private bucket: photos are identifying and must not be public-read
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Storage RLS Policies
-- Path convention: item-photos/{report_id}/{filename}

-- INSERT Policy: A user may only upload to a folder matching a report_id they own
CREATE POLICY "Authenticated users upload only to owned report folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'item-photos' AND
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id::text = (storage.foldername(name))[1]
              AND r.reporter_id = auth.uid()
        )
    );

-- SELECT Policy: Access restricted to the report owner, parties to an active match, or approved admins
CREATE POLICY "Authorized read for report owner match party or admin"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'item-photos' AND
        (
            -- Approved admin
            public.is_admin(auth.uid()) OR
            -- Original reporter owns this report
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.id::text = (storage.foldername(name))[1]
                  AND r.reporter_id = auth.uid()
            ) OR
            -- User is party to an AI match referencing this report
            EXISTS (
                SELECT 1 FROM public.matches m
                JOIN public.reports lr ON lr.id = m.lost_report_id
                JOIN public.reports fr ON fr.id = m.found_report_id
                WHERE ((storage.foldername(name))[1] = lr.id::text OR (storage.foldername(name))[1] = fr.id::text)
                  AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid())
            )
        )
    );

-- UPDATE/DELETE Policy: Only report owner or approved admin
CREATE POLICY "Report owner or admin can update photo"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'item-photos' AND
        (
            public.is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.id::text = (storage.foldername(name))[1]
                  AND r.reporter_id = auth.uid()
            )
        )
    );

CREATE POLICY "Report owner or admin can delete photo"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'item-photos' AND
        (
            public.is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.id::text = (storage.foldername(name))[1]
                  AND r.reporter_id = auth.uid()
            )
        )
    );
