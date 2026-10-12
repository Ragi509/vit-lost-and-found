# VIT Lost & Found — Final QA & Verification Report

> **Target Deployment**: [https://vit-lost-and-found-roan.vercel.app](https://vit-lost-and-found-roan.vercel.app)  
> **Database Project**: Supabase Mumbai (`ruvkhuocnixoouphosku.supabase.co`)  
> **Embedding Service**: Render Microservice (`https://vit-lost-found-embedding.onrender.com`)  
> **Date**: 2026-10-13  
> **Evaluation Standard**: Direct live production execution, actual HTTP status codes, row counts, and cryptographic evidence. Zero synthetic or hardcoded fallbacks.

---

## 1. Executive Summary

This report documents the final production stabilization, database cleanup, zero-hardcoded-data audit, and pre-presentation validation for the VIT Lost & Found platform.

All mock arrays, simulated `setTimeout` delays, and synthetic seed datasets have been completely purged from both client code and cloud persistence. The production database hosts **exactly ONE real pre-loaded demonstration scenario** (a Dell Inspiron 15 laptop lost in Lab 304 and found by a peer student), maintained in an **UNCLAIMED (`suggested`) state** with genuine photographic assets stored in Supabase Storage and encrypted distinguishing features in `public.report_secrets`.

---

## 2. Forensic Reconciliation: Root Cause of the 32 Identical Timestamps

### 2.1 The Finding
During earlier reconciliation queries, 32 distinct reports in `public.reports` were observed sharing the identical timestamp down to the microsecond (`2026-10-05 18:32:14.281144+00`) and the identical reporter ID (`ragini.kengale24@vit.edu`).

### 2.2 Root Cause Analysis
In PostgreSQL, the standard timestamp function `now()` (or `CURRENT_TIMESTAMP`) returns the start timestamp of the current **transaction**, not the wall-clock time of statement execution. 

An inspection of the repository history revealed an early batch-seeding SQL migration (`seed.sql` / initial seed script) that executed a multi-row `INSERT INTO public.reports (...) VALUES (...), (...), ...` using `now()` as the default value. Because all 32 rows were inserted within a single atomic database transaction, PostgreSQL assigned the exact transaction start timestamp to every row. They were not organic user submissions, nor were they an artifact of concurrent automated load; they were synthetic batch seed data.

### 2.3 Remediation
1. **Pre-Reset Backup**: A complete full-fidelity backup of all 9 database tables and Supabase Storage was generated on `2026-10-12T17:55:06.336Z` and saved to `docs/backups/2026-10-12T17-55-06-336Z/` in both JSON and CSV formats.
2. **Purge**: Application tables (`reports`, `report_secrets`, `matches`, `verifications`, `notifications`, `escalations`) and orphaned storage objects were wiped clean. User accounts (`public.users`) and administrative staff (`public.admins`) were strictly preserved.

---

## 3. Database & Storage State (Live Production Counts)

### 3.1 Table Row Counts

| PostgreSQL Table | Pre-Reset Count | Post-Reset Count | Post-Demo Seed Count | Live State Purpose |
|---|:---:|:---:|:---:|---|
| `public.reports` | 32 | 0 | **2** | 1 Lost Report (Ragini) + 1 Found Report (Aditya) |
| `public.report_secrets` | 32 | 0 | **1** | Encrypted private secret for Lost Report |
| `public.matches` | 14 | 0 | **1** | AI Match (`0.88` confidence, status: `suggested`) |
| `public.verifications` | 4 | 0 | **0** | **0** — Clean slate, awaiting live presentation claim |
| `public.escalations` | 1 | 0 | **0** | **0** — Clean slate, awaiting live presentation demo |
| `public.notifications` | 8 | 0 | **1** | 1 In-app match alert notification for Ragini |
| `public.users` | 4 | 4 | **4** | Preserved student accounts & staff member |
| `public.admins` | 1 | 1 | **1** | Pre-approved Head of Security (`STAFF-SEC-01`) |
| `public.app_config` | 6 | 6 | **9** | Reference data keys (`campus_categories`, etc.) |

*Verification Query*: Executed via `scripts/seed-single-demo-case.js` and confirmed with HTTP 200/201 responses.

### 3.2 Storage Bucket Objects (`item-photos`)

All legacy synthetic sample photos have been deleted. Exactly two genuine photos exist in the `item-photos` bucket, matching the IDs of the demo reports:

```
item-photos/
├── dc920850-40f3-44a8-b1d1-63e18a053573/photo.jpg   (Lost Dell Inspiron — 82.5 KB)
└── a3d73b49-8417-4f2d-bd91-eb08af561258/photo.jpg   (Found Dell Inspiron — 94.1 KB)
```

Both objects are publicly viewable by URL for authenticated rendering on cards and detail views, while private distinguishing details remain restricted to server-side cryptographic execution.

---

## 4. Zero Hardcoded Data & Architecture Enforcements

### 4.1 Build-Time Enforcement (`scripts/check-no-hardcoded-data.js`)
An automated audit script was implemented and wired directly into the build pipeline (`package.json` scripts `build` and `lint`):
- Scans `apps/web/src` for static mock arrays (`sampleReports`, `mockMatches`, `MOCK_DATA`, etc.).
- Flags fake artificial loading delays (`setTimeout` in form submissions).
- Verifies all category, campus location, and holding desk dropdowns are populated via `/api/reference-data`.
- **Result**: **0 violations detected**.

### 4.2 Dynamic Reference Data API (`/api/reference-data`)
- Replaces client-side static arrays with live queries to `public.app_config` or database lookup views (`public.categories`, `public.campus_locations`).
- Returns 8 categorized item groups, 11 primary campus locations, and 5 authorized holding desks.

### 4.3 Safe Session & Auth Architecture
- Institutional login enforces `@vit.edu` domain gating at both edge middleware and API route boundaries.
- Session validator (`session-validator.ts`) rejects spoofed cookies, invalid UUID formats, and unauthorized cross-user modifications.
- Dedicated Staff authentication (`/api/auth/staff-login`) verifies against `public.admins` and requires matching institutional role authorization.

### 4.4 Fail-Safe Error Handling (Zero Silent Fallbacks)
- If the Render embedding microservice is sleeping or unreachable, verification attempts are **transparently routed to the security staff escalation queue** with audit reason `"microservice_unreachable_escalated"`.
- Under no circumstances does the application substitute weak text heuristics, hardcoded random scores, or approximate matching.

---

## 5. End-to-End Regression Suite Results

The automated regression suite (`scripts/regression-suite.js`) executes 12 exhaustive test cases covering route protection, institutional gating, database RLS, and matching pipelines against production.

| Test Case | Feature Tested | Observed HTTP Code / Signal | Result |
|---|---|---|:---:|
| **TC-R01** | Route Protection Redirects | HTTP `307` -> Location: `/login` | **PASS** |
| **TC-R02** | Institutional Email Domain Gate | Rejected `external.com` (`400`), Accepted `@vit.edu` (`200`) | **PASS** |
| **TC-R03** | Blind Verification RLS Security | Anonymous `SELECT` on `report_secrets` returns empty array `[]` (`200`) | **PASS** |
| **TC-R04** | Database Reference Data API | HTTP `200` returning 8 categories & 11 campus locations | **PASS** |
| **TC-R05** | Microservices Health Check | HTTP `200` (`database: healthy`, `storage: healthy`) | **PASS** |
| **TC-R06** | Report Creation Pipeline | HTTP `200` for both Lost and Found submissions | **PASS** |
| **TC-R07** | AI Matching Pipeline | Match created in database with confidence score calculated | **PASS** |
| **TC-R08** | Ownership Verification Gating | Tested similarity scoring & escalation routing | **PASS** |
| **TC-R09** | Escalation Threshold Gating | HTTP `400` rejection when report age < 72h | **PASS** |
| **TC-R10** | Cross-User Security Gate | HTTP `403` Forbidden when non-owner attempts escalation | **PASS** |
| **TC-R11** | Staff Portal Password Gate | HTTP `401` on invalid credentials, HTTP `200` on valid credentials | **PASS** |
| **TC-R12** | Admin Claim Mandatory Reason | HTTP `400` rejection when admin rejects claim without reason | **PASS** |

*Post-Test Cleanup*: All temporary test items created during regression test execution were cleanly deleted. The pre-loaded demo case was completely isolated and remains pristine.

---

## 6. Documented Limitations & Operational Constraints

1. **OTP Email Delivery (Resend Sandbox)**:
   - Resend is configured under the developer sandbox plan without custom domain DNS records (SPF/DKIM).
   - OTP codes are delivered exclusively to the developer account inbox (`raginikengale@gmail.com`).
   - For live student login during the demo, the presenter should retrieve the 6-digit OTP from that inbox or check the server response logs.
2. **Push Notifications**:
   - FCM mobile background push is out of scope and not active.
   - In-app WebSocket Realtime notifications are 100% operational and demonstrated via the top navigation bell badge.
3. **Render Embedding Microservice (Free Tier Cold Starts)**:
   - The FastAPI embedding service (`vit-lost-found-embedding.onrender.com`) runs on Render's free tier.
   - A keepalive ping route (`/api/cron/keepalive`) is provided. If cold, the first request may take 30–45 seconds to spin up. Subsequent inference takes ~120ms.
