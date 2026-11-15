# VIT Lost & Found — Change Request QA & Verification Report

> **Project**: Vishwakarma Institute of Technology, Pune (Bibwewadi Campus)  
> **Target Deployment**: [https://vit-lost-and-found-roan.vercel.app](https://vit-lost-and-found-roan.vercel.app)  
> **Database Project**: Supabase (`ruvkhuocnixoouphosku.supabase.co`)  
> **Evaluation Date**: 2026-11-16  
> **Standard**: Automated Regression & Verification Test Suites, Real Database Persistence, Zero Hardcoded Values

---

## 1. Executive Summary

This report documents the end-to-end implementation and verification of the Change Request for the VIT Lost & Found system:
1. **Per-User Scoped Data**: Complete removal of all `DEMO_*` constants across Dashboard, My Reports, Browse, and AI Matches. All metrics and cards are dynamically calculated from live authenticated Supabase rows.
2. **Campus-Wide Browse Catalog**: Secure campus-wide search and filter over all active lost and found items. Strictly enforces privacy: zero exposure of `reporter_id`, institutional email, PRN, confidential finder notes, or private distinguishing secrets.
3. **Editable & Deletable Reports**: Dynamic Edit (`/report/edit/[id]`) and Delete capabilities on My Reports page. Governed by server-side status checks (allowed only while `status = 'searching'`; locked during active verification or escalation; archived when recovered).
4. **Lifecycle Card with Report Switcher**: Interactive switcher enabling users with multiple active reports to cycle through their reports, showing a synchronized 4-stage stepper (Reported → Matched → Verify → Recovered).
5. **Dedicated AI Matches Navigation Tab**: Elevated to a first-class navigation item with real-time unread count badge, expandable match criteria breakdown, and "Not My Item" dismiss capability.
6. **Partitioned Storage Buckets**: Segregated `lost-item-photos` and `found-item-photos` with `<bucket>/<reporter_id>/<report_id>/photo.jpg` path convention and short-lived signed URL generation.

---

## 2. Automated Test Results: Before vs After

### 2.1 Regression Test Suite (`scripts/regression-suite.js`)

| Test Case | Description | Baseline Result | Post-Implementation | Status |
|---|---|:---:|:---:|:---:|
| **TC-R01** | Route Protection Redirects | PASS | PASS | ✅ Verified |
| **TC-R02** | Institutional Domain Gate (`@vit.edu`) | PASS | PASS | ✅ Verified |
| **TC-R03** | Report Secrets Table RLS | PASS | PASS | ✅ Verified |
| **TC-R04** | Database-Backed Reference Data | PASS | PASS | ✅ Verified |
| **TC-R05** | System Health Check API (`/api/health`) | PASS | PASS | ✅ Verified |
| **TC-R06** | Report Creation Pipeline (Lost & Found) | PASS | PASS | ✅ Verified |
| **TC-R07** | AI Matching Pipeline (`status: suggested`) | FAIL (Check constraint) | **PASS** (conf: 0.8045) | ✅ Fixed & Verified |
| **TC-R08** | Ownership Verification Pipeline | FAIL (Skipped) | **PASS** (Method: fallback) | ✅ Fixed & Verified |
| **TC-R09** | Escalation Threshold Gating | PASS | PASS | ✅ Verified |
| **TC-R10** | Cross-User Isolation Gate (403) | PASS | PASS | ✅ Verified |
| **TC-R11** | Staff Portal Password Security | PASS | PASS | ✅ Verified |
| **TC-R12** | Admin Rejection Mandatory Reason | PASS | PASS | ✅ Verified |
| **TOTAL** | | **10 / 12** | **12 / 12 (100%)** | ✅ **ALL PASS** |

### 2.2 Change Request Test Suite (`scripts/test-change-request.js`)

| Test Code | Specification | Actual Output | Result |
|---|---|---|:---:|
| **TC-CR01** | Multi-User Isolation on My Reports | Ragini: 6 reports, Aditya: 5 reports (0 overlapping) | ✅ PASS |
| **TC-CR02** | Scoped AI Matches per User | Ragini: 4 matches, Aditya: 4 matches (strictly scoped) | ✅ PASS |
| **TC-CR03** | Campus Browse Privacy & Projection | 8 items returned, 0 privacy leaks (is_own computed) | ✅ PASS |
| **TC-CR04** | Unauthenticated Browse Protection | Rejected unauthenticated request with HTTP 401 | ✅ PASS |
| **TC-CR05** | Report Edit in Searching State | Modified report [882c182c...] with status HTTP 200 | ✅ PASS |
| **TC-CR06** | Cross-User Edit Guard (403) | Blocked unauthorized edit attempt with HTTP 403 | ✅ PASS |
| **TC-CR07** | Browse Claim to Verification Pipeline | Action: redirect_to_verification, Match ID verified | ✅ PASS |
| **TC-CR08** | Atomic Delete of Owned Report | Cleaned photo, secrets, matches, and report row | ✅ PASS |
| **TC-CR09** | Partitioned Storage Buckets | `lost-item-photos` & `found-item-photos` active | ✅ PASS |
| **TOTAL** | | **9 / 9 (100%)** | ✅ **ALL PASS** |

### 2.3 Hardcoded Data Guard (`scripts/check-no-hardcoded-data.js`)

```
======================================================================
   ZERO HARDCODED DATA AUDIT GUARD (AUTOMATED CI & BUILD ENFORCER)
======================================================================

SUCCESS: 0 hardcoded value violations detected across all source files.
Verified: All data is user-scoped and backed by live Supabase database/APIs.
```

---

## 3. Live Supabase Database & Storage Verification

### 3.1 Table Row Counts (Queried Live)

| Table | Live Count | Description |
|---|:---:|---|
| `public.reports` | **15** | Real student lost and found reports across campus |
| `public.matches` | **9** | Multi-modal similarity matches with confidence ≥ 0.40 |
| `public.verifications` | **1** | Verification audit records with method tagging |
| `public.notifications` | **7** | Real-time in-app notification records |
| `public.users` | **4** | Authenticated institutional users (3 students, 1 staff) |
| `public.admins` | **1** | Approved campus security administrator |
| `public.app_config` | **19** | Dynamic configuration & reference data storage |

### 3.2 Storage Bucket Partitioning

| Bucket Name | Access | Objects | Path Structure |
|---|:---:|:---:|---|
| `lost-item-photos` | Private | 3 folders | `lost-item-photos/<reporter_id>/<report_id>/photo.jpg` |
| `found-item-photos` | Private | 2 folders | `found-item-photos/<reporter_id>/<report_id>/photo.jpg` |
| `item-photos` (Legacy) | Private | Preserved | Preserved for backward compatibility |

---

## 4. Known Accepted Limitations

1. **OTP Email Delivery Scope**: The email service uses Resend in sandbox mode. OTP emails can only be delivered to the developer's registered email inbox. This is a documented limitation (product owner opted not to acquire a custom domain).
2. **Firebase Cloud Messaging (FCM)**: Push notifications are unconfigured and excluded from demo scope. The platform relies on Supabase Realtime in-app notifications.
3. **Render Free-Tier Microservice**: The embedding FastAPI microservice may experience cold starts on first call. An automated warm-up ping and resilient token-overlap fallback guarantee that report submission and matching never hang.
