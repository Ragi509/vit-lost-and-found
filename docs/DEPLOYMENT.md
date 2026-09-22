# Production Deployment & Infrastructure Runbook
## VIT Lost & Found Platform

This document records the exact steps, environment configurations, and bootstrap procedures required for production operations, incorporating **Pre-Deployment Addendum v1** and user confirmations.

---

## 1. Operational Decisions & Environment Configuration

| Component | Target Platform | Sizing / Configuration | Decision Record & Notes |
| :--- | :--- | :--- | :--- |
| **Domain Validation** | Client + Database | Domain suffix `@vit.edu` | Enforced on domain only. Supports student convention (`firstname.lastnameYY@vit.edu`) as well as faculty/staff IDs without lockout. |
| **Frontend Web** | Vercel | Node.js 20 App Router | Pinned to `pnpm@9.12.0`, strict monorepo workspaces. |
| **Database & Auth** | Supabase Managed Postgres | Postgres 15 + pgvector + pgcrypto | 100% RLS across all 9 tables. |
| **Email / OTP** | Supabase Default Mailer | Built-in free tier mailer | **Rate-Limit Caveat**: Rate-limited to ~3-4 emails/hour. Suitable for demo and course presentation. Custom SMTP (Resend) can be connected later via Project Settings. |
| **Storage Bucket** | Supabase Storage (`item-photos`) | Private Bucket (Signed URLs only) | 5MB limit, image types only. RLS keys off report ownership. |
| **Embedding Service**| Render Free Web Service | Python 3.11 Container | **Cold-Start Caveat**: Free tier spins down on inactivity, resulting in a ~30-50s cold start on the first query. Upgrade to Render Standard (2GB RAM) when scaling. |
| **Admin Bootstrap** | Local CLI (`pnpm bootstrap-admin`) | Script + Security Definer RPC | Gated by `bootstrap_completed` boolean; permanently self-locking after initial invocation. |

---

## 2. Step-by-Step Deployment Instructions

### Phase 1: Database & Storage Provisioning (Supabase)
1. In the Supabase Dashboard, create a new project (Region: `ap-south-1` Mumbai recommended).
2. Open the **SQL Editor** and run migrations in sequential order:
   - `supabase/migrations/0001_init.sql` (Tables, pgvector, pgcrypto, config with `@vit.edu`)
   - `supabase/migrations/0002_rls.sql` (Strict RLS on all 9 tables)
   - `supabase/migrations/0003_functions_triggers.sql` (Security definer procedures, triggers, `bootstrap_first_admin`)
   - `supabase/migrations/0004_storage.sql` (Private `item-photos` bucket & ownership RLS)
3. Load seed data:
   - Run `supabase/seed/seed.sql`

---

### Phase 2: Embedding Microservice Deployment (Render Free Tier)
1. Connect Git repository to **Render** as a **Web Service**.
2. Select **Docker** environment (Root Directory: `apps/embedding-service`).
3. Set Instance Type to **Free**.
4. Configure Environment Variables:
   - `EMBEDDING_SERVICE_API_KEY`: Cryptographically random 64-char key.
   - `PORT`: `8000`
5. Note: On first wake after 15 minutes of inactivity, allow ~40s for container initialization.

---

### Phase 3: Frontend Deployment (Vercel)
1. Link GitHub repository to **Vercel**.
2. Set Root Directory to `apps/web`.
3. Set Framework Preset to **Next.js**.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EMBEDDING_SERVICE_URL`
   - `EMBEDDING_SERVICE_API_KEY`
5. Trigger Production Deployment (`pnpm build`).

---

## 3. One-Time Admin Bootstrap Procedure

Once the live database is provisioned and the first staff member has signed up via OTP:

1. In your local terminal, export the environment keys:
   ```bash
   export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
   export ADMIN_BOOTSTRAP_SETUP_KEY="vit_bootstrap_admin_init_83b519ca4e72"
   ```
2. Run the bootstrap CLI script:
   ```bash
   pnpm --filter @vit/web bootstrap-admin
   ```
3. Enter the target administrator's email (`security.head@vit.edu`), department, and staff ID.
4. The script calls `bootstrap_first_admin()`, promoting the user to approved admin, setting `bootstrap_completed = true`, and permanently clearing the setup key hash.
5. Rotate/delete `ADMIN_BOOTSTRAP_SETUP_KEY` immediately.
