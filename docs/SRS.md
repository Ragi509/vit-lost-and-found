# Software Requirements Specification (SRS)
## VIT Lost & Found Platform

**Institution**: Vishwakarma Institute of Technology, Pune (Bibwewadi Campus & Kondhwa Campus)  
**Document Version**: 1.0.0  
**Target Environment**: Production (Supabase + Vercel + Containerized Microservice)

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete functional and non-functional requirements for the **VIT Lost & Found** web platform. The platform centralizes lost item recovery across campus, eliminating unstructured noise in WhatsApp batch groups and physical department notice boards.

### 1.2 Scope
- **In-Scope**:
  - Institutional email OTP authentication (students, faculty, staff).
  - Lost item reporting with confidential distinguishing details.
  - Found item reporting with holding office / security desk location.
  - AI-assisted vector similarity matching across descriptions, categories, and photographs.
  - Interactive match inspection with approximate confidence breakdown (`~92%`).
  - Blind ownership verification evaluated exclusively server-side.
  - Staff administrative worklist for resolving ambiguous or contested claims.
  - Storage bucket management for high-resolution item photos.
  - Real-time and push notifications for matched candidates.
- **Explicitly Out-of-Scope**:
  - In-app student-to-student messaging/chat (reduces harassment and off-platform friction).
  - Trust points, leaderboards, or gamification.
  - Multi-college or external public tenant support.
  - Financial rewards, delivery fees, or commerce integrations.
  - Complex analytics dashboards beyond actionable staff worklists.

---

## 2. User Classes and Personas

### 2.1 Student / Faculty / Staff User
- **Identity**: Holds an official institutional email address ending with an allowed domain (e.g. `@vit.edu`, `@student.vit.edu`, `@viit.ac.in`).
- **Permissions**:
  - Create and manage their own Lost and Found reports.
  - Browse public item listings.
  - View AI match suggestions on their submitted reports.
  - Attempt ownership verification for matched items.
  - Receive real-time and push notifications.

### 2.2 Staff Administrator
- **Identity**: Campus security personnel, student section staff, or department lab assistants.
- **Entry Path**: Discretely placed `Staff login` link in the footer.
- **Permissions**:
  - View queue of claims requiring human review (AI score 50–79% or multiple claimants).
  - Inspect side-by-side evidence (with sensitive cryptographic secrets masked).
  - Approve or Reject claims (mandatory rejection reason required).
  - Update status of items to `Recovered` upon physical handover.
  - Generate one-time invite codes for prospective staff admins.

---

## 3. System Features & Functional Requirements

### 3.1 Authentication & Profile
- **FR-AUTH-1**: Domain enforcement checking email against `app_config.allowed_email_domains`. Non-institutional emails are rejected before OTP dispatch.
- **FR-AUTH-2**: Supabase Auth passwordless OTP delivery via custom SMTP (Resend / SendGrid).
- **FR-AUTH-3**: User profile captures Full Name, Role (`Student`, `Faculty`, `Staff`), and institutional ID Number (e.g. PRN/GR number).

### 3.2 Reporting Workflows
- **FR-REP-1 (Lost Item)**:
  - Form collects Item Name, Category, Description, Campus Location (e.g. Central Library, D-Block Computer Labs, Sharad Arena, Sports Complex, Cafeteria), Date/Time, and optional photo.
  - Mandatory **Private Distinguishing Detail**: A unique physical identifier known only to the real owner (e.g., sticker under laptop, serial number prefix, engraving, scratch on bottom).
  - The detail is encrypted via `pgcrypto` into `report_secrets` and never exposed via any client-readable query.
- **FR-REP-2 (Found Item)**:
  - Form collects Item Name, Category, Description, Campus Location where found, Date/Time, mandatory photo, Current Holding Location (e.g., Central Library Helpdesk, Security Gate 1, Department Lab Office), and private finder notes.

### 3.3 AI Vector Matching Engine
- **FR-AI-1**: The system computes 384-dimensional text embeddings using `all-MiniLM-L6-v2` and 512-dimensional image vectors using `CLIP`.
- **FR-AI-2**: Cosine distance is queried against opposite-type reports within the category.
- **FR-AI-3**: Scoring formula:
  $$\text{Score} = w_t \cdot S_{\text{text}} + w_i \cdot S_{\text{image}} + w_c \cdot S_{\text{cat}}$$
  - Default weights: $w_t = 0.5, w_i = 0.4, w_c = 0.1$.
  - When either report lacks a photo, weights renormalize to $w_t = 0.85, w_c = 0.15$.
- **FR-AI-4**: Presentation: Displayed as approximate confidence (e.g. `~88% match`) with a visual breakdown of text, image, and category alignment.

### 3.4 Blind Ownership Verification
- **FR-VERIF-1**: A user claiming a found item enters their distinguishing detail blind (zero hint given).
- **FR-VERIF-2**: The server embeds the input and computes cosine similarity against `report_secrets.detail_embedding`.
- **FR-VERIF-3**: Decision logic:
  - $\ge 80\%$: Auto-Approved. Transition to `Recovered` instruction state.
  - $50\% - 79\%$: Escalated to Staff Admin console queue.
  - $< 50\%$: Rejected with retry allowed.

### 3.5 Staff Admin Console
- **FR-ADM-1**: Queue of escalated or contested claims.
- **FR-ADM-2**: Side-by-side claim viewer displaying reported item details and claimant responses.
- **FR-ADM-3**: Rejection requires mandatory feedback string explaining why the claim was not approved.
- **FR-ADM-4**: Invite code issuance with cryptographic hash and expiry timestamp.

---

## 4. Non-Functional Requirements

### 4.1 Security & Privacy
- **NFR-SEC-1**: 100% Row Level Security (RLS) across all tables.
- **NFR-SEC-2**: `report_secrets` has zero client-readable `SELECT` policies.
- **NFR-SEC-3**: Database trigger `role_change_guard` blocks direct updates to `role` or `approval_status`.
- **NFR-SEC-4**: Embedding microservice strictly requires `X-Embedding-Service-Key` header.

### 4.2 Performance & Reliability
- **NFR-PERF-1**: Embedding microservice memory consumption strictly below 350MB using ONNX runtime.
- **NFR-PERF-2**: Vector search response time $< 200\text{ms}$ using IVFFlat indexing.
- **NFR-PERF-3**: Lighthouse accessibility score $\ge 95$ with WCAG AA color contrast across both light and dark modes.
