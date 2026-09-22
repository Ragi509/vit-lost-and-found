# VIT Lost & Found — Production Platform

An AI-assisted platform replacing ad-hoc WhatsApp groups and physical notice boards for reporting, matching, and recovering lost items across the **Vishwakarma Institute of Technology (VIT), Pune** campus.

---

## 🏛️ Project Overview

- **Institution**: Vishwakarma Institute of Technology, Pune (Bibwewadi / Kondhwa campus).
- **Core Value Proposition**: Replaces fragmented WhatsApp groups with an institutional platform featuring pgvector AI matching, blind cryptographic ownership verification, and staff-moderated recovery workflows.
- **Primary Flow**: `Login -> Dashboard -> Report Lost -> AI Match -> Match Detail -> Claim -> Ownership Verification -> Recovered`.

---

## 🏗️ Architecture & Monorepo Structure

```
D:\dtplm_cp_ai\
├── apps\
│   ├── web\                   # Next.js 14+ App Router frontend (student + staff surfaces)
│   └── embedding-service\     # High-efficiency FastAPI microservice (<350MB RAM, ONNX runtime)
├── supabase\
│   ├── migrations\            # PostgreSQL schema, pgvector, pgcrypto, RLS, functions & triggers
│   ├── seed\                  # Realistic VIT Pune campus seed data & one-shot admin bootstrap
│   └── functions\             # Supabase Edge Functions (match-trigger & fcm-push)
├── packages\
│   ├── ui\                    # Shared design system components (StatusBadge, ConfidenceMeter, etc.)
│   └── config\                # CSS tokens (light/dark mode), Tailwind preset, base tsconfig
├── docs\
│   ├── SRS.md                 # Software Requirements Specification
│   ├── SCHEMA.md              # Complete Database Schema & Security Definer Reference
│   ├── DEPLOYMENT.md          # End-to-end Deployment Runbook & Environment Setup
│   └── TEST_CASES.md          # Real test cases and execution matrix
├── .env.example               # Environment variable specification
├── pnpm-workspace.yaml        # Monorepo workspace mapping
└── README.md
```

---

## 🚀 Key Technical Highlights

1. **AI Matching Engine**:
   - 384-dimensional text embeddings (`all-MiniLM-L6-v2`) and 512-dimensional image vectors (`CLIP`).
   - Weighted cosine similarity: `0.5*text + 0.4*image + 0.1*category` (renormalized when photos are omitted).
   - High-efficiency ONNX runtime keeping total container memory strictly under 350MB.
   - Guarded behind a mandatory `X-Embedding-Service-Key` header secret.
2. **Blind Ownership Verification**:
   - The reporter enters private distinguishing details encrypted with `pgcrypto` in `report_secrets` (zero client-readable SELECT policies).
   - Claimants submit details blind. Similarity is calculated server-side in a `SECURITY DEFINER` function:
     - `≥ 80%`: Auto-approved for recovery.
     - `50% - 79%`: Automatically escalated to the Staff Admin review queue.
     - `< 50%`: Rejected with retry permitted.
3. **Institutional Identity & Security**:
   - Dynamic allowed domains (`vit.edu`, `student.vit.edu`) enforced in `app_config` and validated inline.
   - Discreet staff login path (`/staff/login`) in footer.
   - Admin invitations require existing approved admin authorization, protected against self-elevation via database triggers.
   - 100% Row Level Security (RLS) enforcement on all 9 tables.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x
- Python >= 3.10 (for embedding service)
- Supabase CLI or hosted Supabase project

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
Copy `.env.example` to `apps/web/.env.local` and provide your Supabase URL, anon key, and embedding service secret.

### 3. Run Development Servers
```bash
# Start frontend web app
pnpm --filter @vit/web dev

# Start embedding microservice
cd apps/embedding-service
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```
>>>>>>> 1839e77 (feat: initial commit of VIT Lost & Found platform end-to-end)
