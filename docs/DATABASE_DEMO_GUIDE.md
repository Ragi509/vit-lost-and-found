# Supabase Database & Architecture Demo Guide
## For Live Faculty / Evaluation Presentations

This guide provides an exact, click-by-click walkthrough in the **Supabase Dashboard** (`https://supabase.com/dashboard/project/ruvkhuocnixoouphosku`) to demonstrate the live database architecture, Row Level Security (RLS), AI vector storage, and cryptographic protection.

---

### Step 1: Navigating to the Project
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/ruvkhuocnixoouphosku).
2. Select the **`vit-lost-and-found`** project.
3. In the left navigation sidebar, click on **Table Editor** (grid icon).

---

### Step 2: Showcasing Reports & Logical View Separation
1. Click **`reports`** table in the schema sidebar:
   - Point out columns: `id`, `reporter_id`, `type` (`lost` or `found`), `item_name`, `category`, `location`, `status`, `photo_url`, `created_at`.
   - Show that items from different students are stored with genuine foreign keys to `users`.
2. Click **`lost_items`** view:
   - Explain: *"This is a read-only PostgreSQL view (`security_invoker = true`) specifically filtering for lost items."*
3. Click **`found_items`** view:
   - Explain: *"This view isolates found belongings held at campus desks without exposing finder notes or confidential details."*

---

### Step 3: Showcasing Multi-Factor AI Matches (`matches` Table)
1. Click **`matches`** table:
   - Highlight the pairing: `lost_report_id` linked to `found_report_id`.
   - Point out the mathematical breakdown:
     - `text_score`: Semantic embedding similarity.
     - `image_score`: Visual similarity score.
     - `category_score`: Exact ontological category match.
     - `confidence_score`: Multi-factor weighted score (`>= 0.70`).
     - `status`: Lifecycle stage (`pending_verification`, `claimed`).

---

### Step 4: Showcasing Cryptographic Secret Protection (`report_secrets`)
1. Click **`report_secrets`** table:
   - Point out the `encrypted_distinguishing_detail` column:
     - Notice that the stored value is **unreadable binary ciphertext** (`\x...`).
   - Explain to faculty:
     > *"Even if an adversary or curious student inspects the database or attempts a direct client query, Row Level Security restricts direct reads (`USING (false)`), and the private distinguishing detail (such as a serial number or engraving) is encrypted using PostgreSQL pgcrypto symmetric encryption. It is never exposed in plaintext."*

---

### Step 5: Showcasing Ownership Verification & Audit Logs (`verifications`)
1. Click **`verifications`** table:
   - Point out: `similarity_score`, `result` (`approved`, `escalated`, or `rejected`), and timestamp.
   - Explain: *"Claimants submit proof blindly. The server generates high-dimensional embeddings and calculates vector cosine similarity against the encrypted secret embedding."*

---

### Step 6: Showcasing Human Escalation Queue (`escalations`)
1. Click **`escalations`** table:
   - Show how cases with no AI matches after the eligibility threshold (`72h`) are forwarded to the **Campus Security / Admin Console**.
   - Point out: `requested_by`, `status` (`pending`, `reviewing`, `resolved`), and `admin_notes`.

---

### Step 7: Showcasing File Storage (`item-photos` Bucket)
1. In the left navigation sidebar, click **Storage** (bucket icon).
2. Click into the **`item-photos`** bucket:
   - Show the organized folder structure: each folder is named after a genuine `report_id`.
   - Click inside the report folder to preview the real item photograph (`photo.jpg` or `photo.webp`).
   - Explain: *"Storage policies enforce strict ownership: authenticated students can only upload to folders matching reports they created."*

---

### Step 8: Showcasing Row Level Security Policies (Database -> Policies)
1. In the left navigation sidebar, click **Database** (cylinder icon), then select **Policies**.
2. Walk through the active security policies:
   - **`reports`**: Authenticated users can insert; users can only update/delete their own reports.
   - **`report_secrets`**: Strict deny-all client policy (`USING (false)`).
   - **`admins`**: Protected administrative role check (`is_admin()` function).
   - **`admin_invites`**: Single-use cryptographic invite codes.

---

### Step 9: Live SQL Queries (SQL Editor)
1. In the left navigation sidebar, click **SQL Editor**.
2. Open or paste queries from [`supabase/demo_queries.sql`](file:///D:/dtplm_cp_ai/supabase/demo_queries.sql).
3. Click **Run** to demonstrate live relational queries joining reports, users, matches, and escalations.
