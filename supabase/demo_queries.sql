-- ==============================================================================
-- VIT Lost & Found — Faculty Presentation Demo SQL Queries
-- Safe, read-only SELECT queries demonstrating database architecture, RLS,
-- pgvector embeddings, and cryptographic secret protection.
-- ==============================================================================

-- 1. Showcase Active Reports and User Isolation
-- Shows genuine student reports with their location, category, status, and photo path
SELECT 
    r.id AS report_id,
    u.full_name AS reporter_name,
    u.vit_email,
    r.type AS report_type,
    r.item_name,
    r.category,
    r.location,
    r.status,
    r.photo_url,
    r.created_at
FROM public.reports r
JOIN public.users u ON r.reporter_id = u.id
ORDER BY r.created_at DESC;

-- 2. Showcase Separate Views: Lost Items Only
-- View created with security_invoker = true; demonstrates logical dataset segregation
SELECT id, item_name, category, location, date_time, status, photo_url
FROM public.lost_items;

-- 3. Showcase Separate Views: Found Items Only
SELECT id, item_name, category, location, holding_location, status, photo_url
FROM public.found_items;

-- 4. Showcase AI Match Pairings & Sub-Scores
-- Demonstrates multi-factor confidence scoring (text + image + category)
SELECT 
    m.id AS match_id,
    lr.item_name AS lost_item,
    fr.item_name AS found_item,
    m.text_score,
    m.image_score,
    m.category_score,
    m.confidence_score,
    m.status AS match_status,
    m.created_at
FROM public.matches m
JOIN public.reports lr ON m.lost_report_id = lr.id
JOIN public.reports fr ON m.found_report_id = fr.id;

-- 5. Showcase Cryptographic Secret Protection (Blind Verification)
-- PROOF OF SECURITY: The distinguishing detail is visible ONLY as unreadable binary ciphertext.
-- Direct client queries can never decrypt this without server-side keys.
SELECT 
    rs.report_id,
    r.item_name,
    encode(rs.encrypted_distinguishing_detail, 'hex') AS ciphertext_sample,
    rs.created_at
FROM public.report_secrets rs
JOIN public.reports r ON rs.report_id = r.id;

-- 6. Showcase Verification Claims & Audit Log
-- Shows claimant verification result, cosine similarity score, and method
SELECT 
    v.id AS verification_id,
    v.match_id,
    u.full_name AS claimant_name,
    u.vit_email AS claimant_email,
    v.similarity_score,
    v.result,
    v.created_at
FROM public.verifications v
JOIN public.users u ON v.claimant_id = u.id
ORDER BY v.created_at DESC;

-- 7. Showcase Admin Escalation Queue (Human Fallback US-7)
-- Displays unresolved cases forwarded to Campus Security / Lost & Found desk
SELECT 
    e.id AS escalation_id,
    r.item_name,
    u.full_name AS requested_by_student,
    u.vit_email AS student_contact,
    e.status AS escalation_status,
    e.admin_notes,
    e.created_at
FROM public.escalations e
JOIN public.reports r ON e.report_id = r.id
JOIN public.users u ON e.requested_by = u.id;

-- 8. Showcase Reference Lookup Tables (Database-driven dropdown options)
SELECT name AS category_name, sort_order FROM public.categories ORDER BY sort_order;
SELECT name AS campus_location, is_holding_location FROM public.campus_locations ORDER BY sort_order;
