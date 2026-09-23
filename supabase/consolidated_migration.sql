-- ==============================================================================
-- VIT Lost & Found: Consolidated Production Migration & Seed Script
-- Run this script in the Supabase Dashboard -> SQL Editor (New query)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: EXTENSIONS & TABLES (0001_init.sql)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.app_config (key, value) VALUES
    ('allowed_email_domains', '["vit.edu"]'::jsonb),
    ('bootstrap_completed', 'false'::jsonb),
    ('admin_bootstrap_key_hash', '{"hash": "f62caee2635955cf4fc1955f24ec3b567d2e0a29367803aeb29a32c213459c5d"}'::jsonb),
    ('verification_thresholds', '{"auto_approve": 0.80, "escalate_to_admin": 0.50, "reject": 0.00}'::jsonb),
    ('scoring_weights', '{"text": 0.50, "image": 0.40, "category": 0.10, "text_only_renorm": 0.85, "cat_only_renorm": 0.15}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vit_email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty', 'Staff')),
    id_number TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_vit_email ON public.users(vit_email);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    date_time TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'verification_required', 'recovered')),
    holding_location TEXT,
    finder_notes TEXT,
    text_vector vector(384),
    image_vector vector(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_reports_type_status ON public.reports(type, status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON public.reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_text_vector ON public.reports USING ivfflat (text_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_reports_image_vector ON public.reports USING ivfflat (image_vector vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS public.report_secrets (
    report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
    encrypted_distinguishing_detail BYTEA NOT NULL,
    detail_embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    found_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    text_score NUMERIC(5, 4) NOT NULL,
    image_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    category_score NUMERIC(5, 4) NOT NULL DEFAULT 0,
    confidence_score NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'claimed', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_matches_pair UNIQUE (lost_report_id, found_report_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_lost_report ON public.matches(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_report ON public.matches(found_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_confidence ON public.matches(confidence_score DESC);

CREATE TABLE IF NOT EXISTS public.verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    claimant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    submitted_detail_embedding vector(384),
    similarity_score NUMERIC(5, 4) NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('approved', 'escalated', 'rejected')),
    reviewed_by_admin_id UUID REFERENCES public.users(id),
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_verifications_match ON public.verifications(match_id);
CREATE INDEX IF NOT EXISTS idx_verifications_claimant ON public.verifications(claimant_id);
CREATE INDEX IF NOT EXISTS idx_verifications_result ON public.verifications(result);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('match', 'verification', 'system')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved')),
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT UNIQUE NOT NULL,
    issued_by UUID NOT NULL REFERENCES public.users(id),
    used_by UUID REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- PART 2: ROW LEVEL SECURITY POLICIES (0002_rls.sql)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE id = uid AND approval_status = 'approved'
    );
$$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated read app_config" ON public.app_config;
    CREATE POLICY "Allow authenticated read app_config" ON public.app_config FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow approved admin update app_config" ON public.app_config;
    CREATE POLICY "Allow approved admin update app_config" ON public.app_config FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.users;
    CREATE POLICY "Allow authenticated users to view profiles" ON public.users FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow user to insert own profile" ON public.users;
    CREATE POLICY "Allow user to insert own profile" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Allow user to update own profile" ON public.users;
    CREATE POLICY "Allow user to update own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Allow authenticated read reports" ON public.reports;
    CREATE POLICY "Allow authenticated read reports" ON public.reports FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "Allow authenticated insert own report" ON public.reports;
    CREATE POLICY "Allow authenticated insert own report" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

    DROP POLICY IF EXISTS "Allow reporter or admin update report" ON public.reports;
    CREATE POLICY "Allow reporter or admin update report" ON public.reports FOR UPDATE TO authenticated USING (auth.uid() = reporter_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Deny all direct client reads on report_secrets" ON public.report_secrets;
    CREATE POLICY "Deny all direct client reads on report_secrets" ON public.report_secrets FOR SELECT TO authenticated, anon USING (false);

    DROP POLICY IF EXISTS "Allow users to view own matches or admin view all" ON public.matches;
    CREATE POLICY "Allow users to view own matches or admin view all" ON public.matches FOR SELECT TO authenticated USING (
        public.is_admin(auth.uid()) OR
        EXISTS (SELECT 1 FROM public.reports r WHERE r.id = matches.lost_report_id AND r.reporter_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.reports r WHERE r.id = matches.found_report_id AND r.reporter_id = auth.uid())
    );

    DROP POLICY IF EXISTS "Allow claimant and admin read verifications" ON public.verifications;
    CREATE POLICY "Allow claimant and admin read verifications" ON public.verifications FOR SELECT TO authenticated USING (
        auth.uid() = claimant_id OR public.is_admin(auth.uid())
    );

    DROP POLICY IF EXISTS "Allow approved admin update verifications" ON public.verifications;
    CREATE POLICY "Allow approved admin update verifications" ON public.verifications FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Allow users read own notifications" ON public.notifications;
    CREATE POLICY "Allow users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Allow users update own notifications" ON public.notifications;
    CREATE POLICY "Allow users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Allow read admin status" ON public.admins;
    CREATE POLICY "Allow read admin status" ON public.admins FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));

    DROP POLICY IF EXISTS "Allow approved admins to manage invites" ON public.admin_invites;
    CREATE POLICY "Allow approved admins to manage invites" ON public.admin_invites FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
END $$;

-- ------------------------------------------------------------------------------
-- PART 3: PROCEDURES & TRIGGERS (0003_functions_triggers.sql)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_role_change_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_TABLE_NAME = 'users' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Unauthorized: Users cannot alter their institutional role directly.';
            END IF;
        END IF;
    END IF;

    IF TG_TABLE_NAME = 'admins' THEN
        IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
            IF current_user NOT IN ('postgres', 'service_role') AND NOT public.is_admin(auth.uid()) THEN
                RAISE EXCEPTION 'Unauthorized: Direct modification of admin approval status is blocked.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role ON public.users;
CREATE TRIGGER trg_guard_user_role
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.check_role_change_guard();

DROP TRIGGER IF EXISTS trg_guard_admin_status ON public.admins;
CREATE TRIGGER trg_guard_admin_status
    BEFORE UPDATE ON public.admins
    FOR EACH ROW EXECUTE FUNCTION public.check_role_change_guard();

CREATE OR REPLACE FUNCTION public.submit_distinguishing_detail(
    p_report_id UUID,
    p_detail_text TEXT,
    p_embedding vector(384),
    p_encryption_passphrase TEXT DEFAULT 'vit_lost_and_found_sec_key_2026'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reporter_id UUID;
BEGIN
    SELECT reporter_id INTO v_reporter_id FROM public.reports WHERE id = p_report_id;
    IF v_reporter_id IS NULL OR v_reporter_id != auth.uid() THEN
        RAISE EXCEPTION 'Forbidden: You do not have permission to attach secrets to this report.';
    END IF;

    INSERT INTO public.report_secrets (report_id, encrypted_distinguishing_detail, detail_embedding)
    VALUES (
        p_report_id,
        pgp_sym_encrypt(p_detail_text, p_encryption_passphrase),
        p_embedding
    )
    ON CONFLICT (report_id) DO UPDATE SET
        encrypted_distinguishing_detail = pgp_sym_encrypt(p_detail_text, p_encryption_passphrase),
        detail_embedding = p_embedding,
        created_at = timezone('utc'::text, now());
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_verification(
    p_match_id UUID,
    p_submitted_embedding vector(384)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_match RECORD;
    v_secret_embedding vector(384);
    v_similarity NUMERIC;
    v_result TEXT;
    v_thresholds JSONB;
    v_auto_approve NUMERIC;
    v_escalate NUMERIC;
    v_verification_id UUID;
BEGIN
    SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
    IF v_match.id IS NULL THEN
        RAISE EXCEPTION 'Match not found.';
    END IF;

    SELECT detail_embedding INTO v_secret_embedding
    FROM public.report_secrets
    WHERE report_id = v_match.lost_report_id;

    IF v_secret_embedding IS NULL THEN
        RAISE EXCEPTION 'No verification secret registered for this item.';
    END IF;

    v_similarity := ROUND((1.0 - (v_secret_embedding <=> p_submitted_embedding))::numeric, 4);

    SELECT value INTO v_thresholds FROM public.app_config WHERE key = 'verification_thresholds';
    v_auto_approve := COALESCE((v_thresholds->>'auto_approve')::numeric, 0.80);
    v_escalate := COALESCE((v_thresholds->>'escalate_to_admin')::numeric, 0.50);

    IF v_similarity >= v_auto_approve THEN
        v_result := 'approved';
        UPDATE public.reports SET status = 'recovered' WHERE id IN (v_match.lost_report_id, v_match.found_report_id);
        UPDATE public.matches SET status = 'claimed' WHERE id = p_match_id;
    ELSIF v_similarity >= v_escalate THEN
        v_result := 'escalated';
        UPDATE public.reports SET status = 'verification_required' WHERE id IN (v_match.lost_report_id, v_match.found_report_id);
    ELSE
        v_result := 'rejected';
    END IF;

    INSERT INTO public.verifications (
        match_id, claimant_id, submitted_detail_embedding, similarity_score, result
    ) VALUES (
        p_match_id, auth.uid(), p_submitted_embedding, v_similarity, v_result
    ) RETURNING id INTO v_verification_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        auth.uid(),
        'verification',
        CASE
            WHEN v_result = 'approved' THEN 'Ownership Verified!'
            WHEN v_result = 'escalated' THEN 'Claim Under Staff Review'
            ELSE 'Verification Unsuccessful'
        END,
        CASE
            WHEN v_result = 'approved' THEN 'Your distinguishing details matched. Please view recovery instructions.'
            WHEN v_result = 'escalated' THEN 'Your details have been submitted to campus staff for manual confirmation.'
            ELSE 'The details provided did not sufficiently match. You may review and try again.'
        END,
        jsonb_build_object('match_id', p_match_id, 'verification_id', v_verification_id, 'result', v_result)
    );

    RETURN jsonb_build_object(
        'verification_id', v_verification_id,
        'result', v_result,
        'similarity', v_similarity
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_admin_invite(
    p_code TEXT,
    p_department TEXT,
    p_staff_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code_hash TEXT;
    v_invite RECORD;
BEGIN
    v_code_hash := encode(digest(p_code, 'sha256'), 'hex');

    SELECT * INTO v_invite FROM public.admin_invites
    WHERE code_hash = v_code_hash AND used_by IS NULL AND expires_at > now();

    IF v_invite.id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite code.';
    END IF;

    UPDATE public.admin_invites SET used_by = auth.uid() WHERE id = v_invite.id;

    INSERT INTO public.admins (id, department, staff_id, approval_status)
    VALUES (auth.uid(), p_department, p_staff_id, 'pending')
    ON CONFLICT (id) DO UPDATE SET
        department = EXCLUDED.department,
        staff_id = EXCLUDED.staff_id;

    RETURN jsonb_build_object('success', true, 'status', 'pending');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only an approved admin can approve staff requests.';
    END IF;

    UPDATE public.admins SET approval_status = 'approved', approved_by = auth.uid() WHERE id = target_user_id;
    UPDATE public.users SET role = 'Staff' WHERE id = target_user_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (target_user_id, 'system', 'Staff Admin Access Approved', 'Your staff admin account has been approved. You now have access to the staff console.');
END;
$$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(
    p_setup_key TEXT,
    p_target_user_id UUID,
    p_department TEXT,
    p_staff_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bootstrap_completed BOOLEAN;
    v_stored_hash TEXT;
    v_provided_hash TEXT;
BEGIN
    SELECT (value::text)::boolean INTO v_bootstrap_completed
    FROM public.app_config WHERE key = 'bootstrap_completed';

    IF v_bootstrap_completed IS TRUE THEN
        RAISE EXCEPTION 'Admin bootstrap has already been completed. This procedure is permanently disabled.';
    END IF;

    SELECT value->>'hash' INTO v_stored_hash
    FROM public.app_config WHERE key = 'admin_bootstrap_key_hash';

    IF v_stored_hash IS NULL THEN
        RAISE EXCEPTION 'Setup key hash is missing from configuration.';
    END IF;

    v_provided_hash := encode(digest(p_setup_key, 'sha256'), 'hex');
    IF v_provided_hash != v_stored_hash THEN
        RAISE EXCEPTION 'Invalid admin bootstrap setup key.';
    END IF;

    INSERT INTO public.admins (id, department, staff_id, approval_status, approved_by)
    VALUES (p_target_user_id, p_department, p_staff_id, 'approved', p_target_user_id)
    ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        department = EXCLUDED.department,
        staff_id = EXCLUDED.staff_id;

    UPDATE public.users SET role = 'Staff' WHERE id = p_target_user_id;

    UPDATE public.app_config SET value = 'true'::jsonb WHERE key = 'bootstrap_completed';
    DELETE FROM public.app_config WHERE key = 'admin_bootstrap_key_hash';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Initial admin bootstrapped successfully. Procedure permanently disabled.',
        'target_user_id', p_target_user_id
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- PART 4: PRIVATE STORAGE BUCKET & POLICIES (0004_storage.sql)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'item-photos',
    'item-photos',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users upload only to owned report folder" ON storage.objects;
    CREATE POLICY "Authenticated users upload only to owned report folder" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'item-photos' AND
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id::text = (storage.foldername(name))[1]
              AND r.reporter_id = auth.uid()
        )
    );

    DROP POLICY IF EXISTS "Authorized read for report owner match party or admin" ON storage.objects;
    CREATE POLICY "Authorized read for report owner match party or admin" ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'item-photos' AND
        (
            public.is_admin(auth.uid()) OR
            EXISTS (
                SELECT 1 FROM public.reports r
                WHERE r.id::text = (storage.foldername(name))[1]
                  AND r.reporter_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.matches m
                JOIN public.reports lr ON lr.id = m.lost_report_id
                JOIN public.reports fr ON fr.id = m.found_report_id
                WHERE ((storage.foldername(name))[1] = lr.id::text OR (storage.foldername(name))[1] = fr.id::text)
                  AND (lr.reporter_id = auth.uid() OR fr.reporter_id = auth.uid())
            )
        )
    );
END $$;
