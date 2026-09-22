# Comprehensive Test Cases & Execution Matrix
## VIT Lost & Found Platform

This document outlines all verified scenarios across authentication, reporting, AI matching, blind verification, and role-based security.

---

## 1. Test Scenarios Matrix

| ID | Test Case | Expected Result | Status |
| :--- | :--- | :--- | :--- |
| **TC-01** | **Email Domain Validation (Invalid)** | Email `test@gmail.com` rejected with "Must use an official VIT email address". | **PASS** |
| **TC-02** | **Email Domain Validation (Valid)** | Email `student.221045@vit.edu` accepted for OTP request. | **PASS** |
| **TC-03** | **Report Lost (Confidential Detail)** | Private distinguishing detail encrypted into `report_secrets`, unreadable via direct API. | **PASS** |
| **TC-04** | **Report Found (Image Upload)** | Image uploaded to `item-photos` bucket, public URL generated and saved. | **PASS** |
| **TC-05** | **AI Embedding Generation** | Text returns 384-dim vector, image returns 512-dim vector via microservice. | **PASS** |
| **TC-06** | **AI Match Computation** | Cosine similarity scores computed; weighted match created in `matches` table. | **PASS** |
| **TC-07** | **Confidence Meter Display** | Matches show formatted approximate indicator (e.g. `~89%`) with factor breakdown. | **PASS** |
| **TC-08** | **Blind Verification (Exact Match)** | Submitting accurate detail gives $\ge 80\%$ similarity $\rightarrow$ Auto-Approved. | **PASS** |
| **TC-09** | **Blind Verification (Borderline)** | Submitting ambiguous detail gives $50–79\%$ $\rightarrow$ Escalated to Admin Queue. | **PASS** |
| **TC-10** | **Blind Verification (Wrong Detail)** | Submitting incorrect detail gives $< 50\%$ $\rightarrow$ Rejected with retry option. | **PASS** |
| **TC-11** | **Admin Invite Code Generation** | Approved admin generates invite code with cryptographic hash and expiry. | **PASS** |
| **TC-12** | **Admin Pending State** | Redeeming valid invite code places admin in `pending` status, blocked from console. | **PASS** |
| **TC-13** | **Admin Claim Review** | Approved admin reviews escalated claim and approves/rejects with mandatory reason. | **PASS** |
| **TC-14** | **RLS Security Bypass Attempt** | Direct client query `SELECT * FROM report_secrets` returns empty set / denied. | **PASS** |
| **TC-15** | **Role Elevation Trigger Guard** | Attempting `UPDATE users SET role = 'Staff'` directly from client is blocked by trigger. | **PASS** |
| **TC-16** | **Theme Toggle Persistence** | Light/dark mode toggle switches CSS variables and persists across page reload. | **PASS** |

---

## 2. Test Execution Details & Evidence

### Test Case TC-01 & TC-02: Domain Enforcement
- Evaluated against `app_config.allowed_email_domains` (`["vit.edu", "student.vit.edu", "viit.ac.in"]`).
- Non-conforming strings are caught immediately in the client Zod schema and verified server-side.

### Test Case TC-08 through TC-10: Blind Verification
- Evaluated using `submit_verification(match_id, submitted_embedding)`.
- Client never sees the stored embedding, secret text, or raw distance math.

### Test Case TC-14 & TC-15: Database Security Guarantees
- `report_secrets` has no `GRANT SELECT` to `anon` or `authenticated` roles.
- `role_change_guard` trigger raises exception on any manual update to `role` or `approval_status`.
