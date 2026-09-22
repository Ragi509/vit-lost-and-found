-- ==============================================================================
-- 0001_init.sql: Extensions, Core Tables, and Vector Indexes
-- Domain: @vit.edu confirmed per Pre-Deployment Addendum
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. System Configuration Key-Value Store
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert default configurations
INSERT INTO public.app_config (key, value) VALUES
    ('allowed_email_domains', '["vit.edu"]'::jsonb),
    ('bootstrap_completed', 'false'::jsonb),
    ('verification_thresholds', '{"auto_approve": 0.80, "escalate_to_admin": 0.50, "reject": 0.00}'::jsonb),
    ('scoring_weights', '{"text": 0.50, "image": 0.40, "category": 0.10, "text_only_renorm": 0.85, "cat_only_renorm": 0.15}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Users Table (Augmenting Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    vit_email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty', 'Staff')),
    id_number TEXT NOT NULL, -- e.g. VIT PRN or Staff ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_vit_email ON public.users(vit_email);

-- 4. Reports Table (Lost and Found items)
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

-- 5. Report Secrets Table
CREATE TABLE IF NOT EXISTS public.report_secrets (
    report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
    encrypted_distinguishing_detail BYTEA NOT NULL,
    detail_embedding vector(384) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Matches Table
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

-- 7. Verifications Table
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

-- 8. Notifications Table
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

-- 9. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    department TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved')),
    approved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Admin Invites Table
CREATE TABLE IF NOT EXISTS public.admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT UNIQUE NOT NULL,
    issued_by UUID NOT NULL REFERENCES public.users(id),
    used_by UUID REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
