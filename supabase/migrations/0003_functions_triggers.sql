-- ==============================================================================
-- 0003_functions_triggers.sql: Security Definer Procedures & Role Guards
-- Compliant with Pre-Deployment Addendum v1 (Item 4)
-- ==============================================================================

-- 1. Trigger Function: role_change_guard
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
    FOR EACH ROW
    EXECUTE FUNCTION public.check_role_change_guard();

DROP TRIGGER IF EXISTS trg_guard_admin_status ON public.admins;
CREATE TRIGGER trg_guard_admin_status
    BEFORE UPDATE ON public.admins
    FOR EACH ROW
    EXECUTE FUNCTION public.check_role_change_guard();

-- 2. Function: submit_distinguishing_detail
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

-- 3. Function: submit_verification
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
        match_id,
        claimant_id,
        submitted_detail_embedding,
        similarity_score,
        result
    )
    VALUES (
        p_match_id,
        auth.uid(),
        p_submitted_embedding,
        v_similarity,
        v_result
    )
    RETURNING id INTO v_verification_id;

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

-- 4. Function: redeem_admin_invite
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

-- 5. Function: admin_approve_user
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

    UPDATE public.admins
    SET approval_status = 'approved', approved_by = auth.uid()
    WHERE id = target_user_id;

    UPDATE public.users
    SET role = 'Staff'
    WHERE id = target_user_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (target_user_id, 'system', 'Staff Admin Access Approved', 'Your staff admin account has been approved. You now have access to the staff console.');
END;
$$;

-- 6. Function: bootstrap_first_admin
-- Gated by bootstrap_completed flag and setup key verification
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
    -- Check if bootstrap has already run
    SELECT (value::text)::boolean INTO v_bootstrap_completed
    FROM public.app_config WHERE key = 'bootstrap_completed';

    IF v_bootstrap_completed IS TRUE THEN
        RAISE EXCEPTION 'Admin bootstrap has already been completed. This procedure is permanently disabled.';
    END IF;

    -- Verify setup key against stored hash
    SELECT value->>'hash' INTO v_stored_hash
    FROM public.app_config WHERE key = 'admin_bootstrap_key_hash';

    IF v_stored_hash IS NULL THEN
        RAISE EXCEPTION 'Setup key hash is missing from configuration.';
    END IF;

    v_provided_hash := encode(digest(p_setup_key, 'sha256'), 'hex');
    IF v_provided_hash != v_stored_hash THEN
        RAISE EXCEPTION 'Invalid admin bootstrap setup key.';
    END IF;

    -- Elevate target user to approved admin
    INSERT INTO public.admins (id, department, staff_id, approval_status, approved_by)
    VALUES (p_target_user_id, p_department, p_staff_id, 'approved', p_target_user_id)
    ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        department = EXCLUDED.department,
        staff_id = EXCLUDED.staff_id;

    UPDATE public.users
    SET role = 'Staff'
    WHERE id = p_target_user_id;

    -- Lock bootstrap permanently: set bootstrap_completed = true and delete hash
    UPDATE public.app_config SET value = 'true'::jsonb WHERE key = 'bootstrap_completed';
    DELETE FROM public.app_config WHERE key = 'admin_bootstrap_key_hash';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Initial admin bootstrapped successfully. Procedure permanently disabled.',
        'target_user_id', p_target_user_id
    );
END;
$$;
