-- ==============================================================================
-- seed.sql: Realistic VIT Campus Seed Data
-- ==============================================================================

-- 1. Initialize admin bootstrap hash in app_config
-- Password: "vit_bootstrap_admin_init_83b519ca4e72" -> SHA256
INSERT INTO public.app_config (key, value)
VALUES (
    'admin_bootstrap_key_hash',
    '{"hash": "f62caee2635955cf4fc1955f24ec3b567d2e0a29367803aeb29a32c213459c5d"}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Mock Users (Students, Faculty, Staff)
DO $$
DECLARE
    v_user1_id UUID := 'a1111111-1111-1111-1111-111111111111';
    v_user2_id UUID := 'a2222222-2222-2222-2222-222222222222';
    v_user3_id UUID := 'a3333333-3333-3333-3333-333333333333';
    v_staff_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_lost_report1 UUID := 'c1111111-1111-1111-1111-111111111111';
    v_found_report1 UUID := 'c2222222-2222-2222-2222-222222222222';
    v_lost_report2 UUID := 'c3333333-3333-3333-3333-333333333333';
    v_found_report2 UUID := 'c4444444-4444-4444-4444-444444444444';
    v_dummy_text_vec vector(384);
BEGIN
    v_dummy_text_vec := array_fill(0.05::real, ARRAY[384])::vector;

    -- Upsert Auth Mock IDs
    BEGIN
        INSERT INTO auth.users (id, email) VALUES
            (v_user1_id, 'ragini.kengale24@vit.edu'),
            (v_user2_id, 'aditya.joshi22@vit.edu'),
            (v_user3_id, 'neha.patil23@vit.edu'),
            (v_staff_id, 'security.head@vit.edu')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- Upsert Public User Profiles
    INSERT INTO public.users (id, vit_email, full_name, role, id_number) VALUES
        (v_user1_id, 'ragini.kengale24@vit.edu', 'Ragini Kengale', 'Student', 'PRN-2410892'),
        (v_user2_id, 'aditya.joshi22@vit.edu', 'Aditya Joshi', 'Student', 'PRN-2210452'),
        (v_user3_id, 'neha.patil23@vit.edu', 'Neha Patil', 'Student', 'PRN-2310114'),
        (v_staff_id, 'security.head@vit.edu', 'Sanjay Jadhav', 'Staff', 'STAFF-SEC-01')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        id_number = EXCLUDED.id_number;

    -- Seed Initial Approved Admin
    INSERT INTO public.admins (id, department, staff_id, approval_status)
    VALUES (v_staff_id, 'Campus Security & Facilities', 'STAFF-SEC-01', 'approved')
    ON CONFLICT (id) DO UPDATE SET
        approval_status = 'approved',
        department = EXCLUDED.department;

    -- 3. Realistic Lost Reports
    -- Report 1: TI-84 Plus Graphing Calculator
    INSERT INTO public.reports (
        id, reporter_id, type, item_name, category, description,
        date_time, location, status, text_vector
    ) VALUES (
        v_lost_report1,
        v_user1_id,
        'lost',
        'TI-84 Plus CE Graphing Calculator',
        'Academic Tools & Calculators',
        'Black Texas Instruments graphing calculator left on a desk after Advanced Mathematics lecture. Has a yellow battery cover tape.',
        now() - INTERVAL '2 days',
        'D-Block, 3rd Floor Computer Lab 304',
        'matched',
        v_dummy_text_vec
    ) ON CONFLICT (id) DO NOTHING;

    -- Confidential Secret for Lost Report 1
    INSERT INTO public.report_secrets (report_id, encrypted_distinguishing_detail, detail_embedding)
    VALUES (
        v_lost_report1,
        pgp_sym_encrypt('Scratch on top right screen bezel, initials RK written inside battery compartment with silver marker', 'vit_lost_and_found_sec_key_2026'),
        v_dummy_text_vec
    ) ON CONFLICT (report_id) DO NOTHING;

    -- Report 2: Apple AirPods Pro Gen 2
    INSERT INTO public.reports (
        id, reporter_id, type, item_name, category, description,
        date_time, location, status, text_vector
    ) VALUES (
        v_lost_report2,
        v_user3_id,
        'lost',
        'Apple AirPods Pro (2nd Gen) in Matte Black Case',
        'Electronics & Audio',
        'AirPods Pro wireless earbuds inside a matte black Spigen rugged case with a small metal carabiner clip.',
        now() - INTERVAL '1 day',
        'Central Library - 2nd Floor Reading Room',
        'searching',
        v_dummy_text_vec
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. Realistic Found Reports
    -- Found Report 1: TI-84 Calculator handed to Security Desk
    INSERT INTO public.reports (
        id, reporter_id, type, item_name, category, description,
        date_time, location, status, holding_location, finder_notes, text_vector
    ) VALUES (
        v_found_report1,
        v_user2_id,
        'found',
        'Texas Instruments Graphing Calculator',
        'Academic Tools & Calculators',
        'Found a black TI calculator on desk 14 after the afternoon practical session. Screen in good condition with slide cover attached.',
        now() - INTERVAL '1 day',
        'D-Block, Computer Lab 304',
        'matched',
        'D-Block Security Counter (Ground Floor)',
        'Handed over to Officer Shinde at 4:30 PM.',
        v_dummy_text_vec
    ) ON CONFLICT (id) DO NOTHING;

    -- Found Report 2: Blue Decathlon Water Bottle
    INSERT INTO public.reports (
        id, reporter_id, type, item_name, category, description,
        date_time, location, status, holding_location, finder_notes, text_vector
    ) VALUES (
        v_found_report2,
        v_user2_id,
        'found',
        'Decathlon Quechua 1L Stainless Steel Bottle',
        'Accessories',
        'Matte blue metal water bottle found on the bench beside the outdoor badminton court.',
        now() - INTERVAL '3 hours',
        'Sports Complex - Badminton Court Bench',
        'searching',
        'Sports Gymkhana Office Desk',
        'Cleaned and placed in Gymkhana lost box.',
        v_dummy_text_vec
    ) ON CONFLICT (id) DO NOTHING;

    -- 5. Seed High-Confidence Match (TI-84 Calculator)
    INSERT INTO public.matches (
        lost_report_id, found_report_id, text_score, image_score, category_score, confidence_score, status
    ) VALUES (
        v_lost_report1,
        v_found_report1,
        0.9100,
        0.8800,
        1.0000,
        0.9070, -- ~91% match
        'suggested'
    ) ON CONFLICT (lost_report_id, found_report_id) DO NOTHING;

    -- 6. Seed In-App Notifications
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
        v_user1_id,
        'match',
        'High Similarity Match Found (~91%)',
        'A Texas Instruments Graphing Calculator found at D-Block Computer Lab 304 closely matches your lost report.',
        jsonb_build_object('lost_report_id', v_lost_report1, 'found_report_id', v_found_report1)
    );

END $$;
