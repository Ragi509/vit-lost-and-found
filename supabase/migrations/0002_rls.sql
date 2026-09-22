-- ==============================================================================
-- 0002_rls.sql: Strict Row Level Security Policies on Every Single Table
-- ==============================================================================

-- 1. Helper Function: is_admin(uid)
-- Defined early with SECURITY DEFINER to avoid recursion in RLS policies
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

-- 2. Enable RLS on every table (No exceptions)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Policy Definitions
-- ------------------------------------------------------------------------------

-- [TABLE: app_config]
-- Anyone authenticated can read global configuration
CREATE POLICY "Allow authenticated read app_config"
    ON public.app_config FOR SELECT
    TO authenticated
    USING (true);

-- Only approved admins can mutate app_config
CREATE POLICY "Allow approved admin update app_config"
    ON public.app_config FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- [TABLE: users]
-- Authenticated users can view user profiles
CREATE POLICY "Allow authenticated users to view profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Users can insert their own record during signup
CREATE POLICY "Allow user to insert own profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Users can update their own non-role fields
CREATE POLICY "Allow user to update own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- [TABLE: reports]
-- Anyone authenticated can browse reports (lost and found)
CREATE POLICY "Allow authenticated read reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (true);

-- Authenticated users can submit a report as themselves
CREATE POLICY "Allow authenticated insert own report"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

-- Reporter or approved admin can update a report
CREATE POLICY "Allow reporter or admin update report"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (auth.uid() = reporter_id OR public.is_admin(auth.uid()))
    WITH CHECK (auth.uid() = reporter_id OR public.is_admin(auth.uid()));

-- [TABLE: report_secrets]
-- ZERO client-readable SELECT policy under any circumstance!
-- Writes are permitted only via the SECURITY DEFINER function submit_distinguishing_detail
CREATE POLICY "Deny all direct client reads on report_secrets"
    ON public.report_secrets FOR SELECT
    TO authenticated, anon
    USING (false);

-- [TABLE: matches]
-- Users can view matches for their own reports, or approved admins can view all
CREATE POLICY "Allow users to view own matches or admin view all"
    ON public.matches FOR SELECT
    TO authenticated
    USING (
        public.is_admin(auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = matches.lost_report_id AND r.reporter_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = matches.found_report_id AND r.reporter_id = auth.uid()
        )
    );

-- [TABLE: verifications]
-- Claimants and admins can view verification records
CREATE POLICY "Allow claimant and admin read verifications"
    ON public.verifications FOR SELECT
    TO authenticated
    USING (
        auth.uid() = claimant_id OR
        public.is_admin(auth.uid())
    );

-- Only approved admins can update verification status (approve / reject with reason)
CREATE POLICY "Allow approved admin update verifications"
    ON public.verifications FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- [TABLE: notifications]
-- Users can read and acknowledge their own notifications
CREATE POLICY "Allow users read own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users update own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- [TABLE: admins]
-- Approved admins can view the admin registry; users can view their own admin status
CREATE POLICY "Allow read admin status"
    ON public.admins FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- [TABLE: admin_invites]
-- Approved admins can view and create invites
CREATE POLICY "Allow approved admins to manage invites"
    ON public.admin_invites FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
