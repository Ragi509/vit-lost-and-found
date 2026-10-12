-- ==============================================================================
-- 0006_lookup_tables_and_views.sql: Reference Lookup Tables & Separate Views
-- ==============================================================================

-- 1. Create Reference Table for Item Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Reference Table for Campus Locations
CREATE TABLE IF NOT EXISTS public.campus_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_holding_location BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS with Read-Only Access
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read on categories" ON public.categories;
CREATE POLICY "Allow read on categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow read on campus_locations" ON public.campus_locations;
CREATE POLICY "Allow read on campus_locations"
    ON public.campus_locations FOR SELECT
    TO anon, authenticated
    USING (true);

-- 4. Seed Verified VIT Reference Categories
INSERT INTO public.categories (name, sort_order) VALUES
    ('Academic Tools & Calculators', 1),
    ('Identity Cards & Campus Keys', 2),
    ('Electronics & Audio', 3),
    ('Laptops & Accessories', 4),
    ('Bags & Backpacks', 5),
    ('Clothing & Eyewear', 6),
    ('Books & Course Notes', 7),
    ('Other Belongings', 8)
ON CONFLICT (name) DO NOTHING;

-- 5. Seed Verified VIT Reference Campus Locations
INSERT INTO public.campus_locations (name, is_holding_location, sort_order) VALUES
    ('Central Library - 2nd Floor Reading Room', false, 1),
    ('Central Library - Ground Floor Digital Section', false, 2),
    ('D-Block - 3rd Floor Computer Lab 304', false, 3),
    ('D-Block - 1st Floor Electronics Lab', false, 4),
    ('B-Block - Mechanical Workshop Area', false, 5),
    ('Sharad Arena / Open Amphitheatre', false, 6),
    ('Sports Complex - Badminton Court Bench', false, 7),
    ('Sports Complex - Gymkhana Hall', false, 8),
    ('Student Cafeteria / Canteen Main Area', false, 9),
    ('Saraswati Hostel Block A - Common Room', false, 10),
    ('Main Security Gate 1 Entrance', false, 11),
    ('Central Library Helpdesk (Ground Floor)', true, 12),
    ('Main Security Gate 1 Security Office', true, 13),
    ('D-Block Security Counter (Ground Floor)', true, 14),
    ('Student Activities Center (SAC Desk)', true, 15),
    ('Hostel Warden Office (Saraswati Block)', true, 16)
ON CONFLICT (name) DO NOTHING;

-- 6. Create Read-Only Separate Views with security_invoker = true
-- public.lost_items: Only lost reports, never exposing report_secrets
CREATE OR REPLACE VIEW public.lost_items
WITH (security_invoker = true) AS
SELECT
    id,
    reporter_id,
    type,
    item_name,
    category,
    description,
    photo_url,
    date_time,
    location,
    status,
    holding_location,
    finder_notes,
    created_at
FROM public.reports
WHERE type = 'lost';

-- public.found_items: Only found reports, never exposing report_secrets
CREATE OR REPLACE VIEW public.found_items
WITH (security_invoker = true) AS
SELECT
    id,
    reporter_id,
    type,
    item_name,
    category,
    description,
    photo_url,
    date_time,
    location,
    status,
    holding_location,
    finder_notes,
    created_at
FROM public.reports
WHERE type = 'found';

-- 7. Add comparison_method column to public.verifications for auditing
ALTER TABLE public.verifications ADD COLUMN IF NOT EXISTS comparison_method TEXT;
