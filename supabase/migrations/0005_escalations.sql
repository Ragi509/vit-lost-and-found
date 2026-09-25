-- ==============================================================================
-- 0005_escalations.sql: Security Desk Escalation / Human Fallback (US-7)
-- ==============================================================================

-- 1. Create Escalations Table
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved')),
    admin_notes TEXT,
    reviewed_by_admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT uq_escalations_report UNIQUE (report_id)
);

-- 2. Indexes for High-Performance Worklists
CREATE INDEX IF NOT EXISTS idx_escalations_status ON public.escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_requested_by ON public.escalations(requested_by);
CREATE INDEX IF NOT EXISTS idx_escalations_report_id ON public.escalations(report_id);

-- 3. Enable Strict Row Level Security
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Student can insert an escalation only for their own report, and only once per report
DROP POLICY IF EXISTS "Student insert own escalation" ON public.escalations;
CREATE POLICY "Student insert own escalation"
    ON public.escalations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = requested_by
        AND EXISTS (
            SELECT 1 FROM public.reports
            WHERE reports.id = report_id
            AND reports.reporter_id = auth.uid()
        )
    );

-- Student can view their own escalations; approved admins can view all escalations
DROP POLICY IF EXISTS "Student select own escalations" ON public.escalations;
CREATE POLICY "Student select own escalations"
    ON public.escalations
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = requested_by
        OR public.is_admin(auth.uid())
    );

-- Only approved admins can update escalation status or notes
DROP POLICY IF EXISTS "Admin update escalations" ON public.escalations;
CREATE POLICY "Admin update escalations"
    ON public.escalations
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 5. System Configuration: eligible_for_escalation_hours
INSERT INTO public.app_config (key, value)
VALUES ('eligible_for_escalation_hours', '72'::jsonb)
ON CONFLICT (key) DO NOTHING;
