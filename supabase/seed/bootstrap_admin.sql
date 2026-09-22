-- ==============================================================================
-- bootstrap_admin.sql: One-Time Initial Admin Bootstrap Script
-- Run this script in the Supabase SQL Editor to elevate the very first admin.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin_sql(
    p_admin_email TEXT,
    p_full_name TEXT,
    p_department TEXT,
    p_staff_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user exists in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_admin_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % does not exist in Supabase Auth. Please have the user sign in or sign up first via OTP.', p_admin_email;
    END IF;

    -- Upsert into public.users
    INSERT INTO public.users (id, vit_email, full_name, role, id_number)
    VALUES (v_user_id, p_admin_email, p_full_name, 'Staff', p_staff_id)
    ON CONFLICT (id) DO UPDATE SET
        role = 'Staff',
        full_name = EXCLUDED.full_name,
        id_number = EXCLUDED.id_number;

    -- Upsert into public.admins with approved status
    INSERT INTO public.admins (id, department, staff_id, approval_status, approved_by)
    VALUES (v_user_id, p_department, p_staff_id, 'approved', v_user_id)
    ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        department = EXCLUDED.department,
        staff_id = EXCLUDED.staff_id;

    -- Clean up setup key if still in app_config
    DELETE FROM public.app_config WHERE key = 'admin_bootstrap_key_hash';

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Successfully bootstrapped %s as approved Staff Admin.', p_admin_email),
        'user_id', v_user_id
    );
END;
$$;

-- Sample invocation (Replace with actual admin details):
-- SELECT bootstrap_initial_admin_sql(
--     'staff.security@vit.edu',
--     'Prof. Rajesh Deshmukh',
--     'Campus Security & Student Affairs',
--     'VIT-STAFF-001'
-- );
