# VIT Lost & Found — Comprehensive Feature List & Live Verification Matrix

> **Verification Date**: 2026-09-23  
> **Environment**: Persistent Vercel Production Deployment (`https://vit-lost-and-found-roan.vercel.app`) + Supabase Cloud (`ruvkhuocnixoouphosku.supabase.co`)  
> **Repository**: [https://github.com/Ragi509/vit-lost-and-found](https://github.com/Ragi509/vit-lost-and-found)  
> **Evaluation Criteria**: Every status is assigned based on direct, automated execution against the live running deployment.  

---

## 1. User-Facing Screens (Original Specification)

| Feature / Screen | Status | Notes |
| :--- | :---: | :--- |
| **1. Landing & Institutional Sign-In** (`/`) | **Verified Working** | Enforces `@vit.edu` validation, integrates OTP dispatch and verification, contains discreet staff login entry point. |
| **2. Student Dashboard** (`/dashboard`) | **Verified Working** | Displays dynamic student greeting, real-time KPI counters (`Active Reports`, `AI Matches`, `Recovered`), and recent reports feed. |
| **3. Report Lost Item** (`/report/lost`) | **Verified Working** | Features drag-and-drop photo upload, category dropdown, campus location picker, and server-encrypted private distinguishing detail. |
| **4. Report Found Item** (`/report/found`) | **Verified Working** | Allows photo attachment, campus custody holding location specification, and immediately triggers the server-side AI matching pipeline. |
| **5. AI Matches Feed** (`/matches`) | **Verified Working** | Renders match pairs with percentage confidence scores, category/text/image sub-scores, and direct claim initiation buttons. |
| **6. Match Detail View** (`/matches/[id]`) | **Verified Working** | Displays side-by-side comparison of lost vs. found items, location proximity indicators, and visual similarity breakdown. |
| **7. Claim Item Form** (`/claim/[matchId]`) | **Verified Working** | Presents blind verification prompt requiring claimant to submit private distinguishing features without revealing the secret. |
| **8. Notifications Center** (`/notifications`) | **Verified Working** | Subscribes to Supabase Realtime channel, displays match alerts and handover instructions, supports marking notifications as read. |
| **9. My Reports Management** (`/my-reports`) | **Verified Working** | Filters reports by status (Active, Matched, Recovered), displays timestamp and location history. |
| **10. Item Recovery Handover** (`/recovered/[id]`) | **Verified Working** | Displays cryptographic retrieval token (`VIT-REC-XXXXX`), QR code verification, and campus custody desk handover instructions. |
| **11. Campus Directory Browse** (`/browse`) | **Verified Working** | Public search and category filter for reported items across Bibwewadi & Kondhwa campuses without exposing private secrets. |
| **12. User Profile Settings** (`/profile`) | **Verified Working** | Displays student PRN, institutional email, notification preferences, and session termination/logout controls. |

---

## 2. Admin & Staff Screens

| Feature / Screen | Status | Notes |
| :--- | :---: | :--- |
| **Staff Login** (`/staff/login`) | **Verified Working** | Dedicated institutional sign-in for campus security, lab technicians, and custody staff. |
| **Staff Registration** (`/staff/register`) | **Verified Working** | Allows staff to register department and employee ID, validating against invite code hashes. |
| **Admin Pending Approval** (`/staff/pending`) | **Verified Working** | Holding screen for new staff registrations awaiting review by a verified supervisor. |
| **Admin Console (Option B Analytics)** (`/admin/console`) | **Verified Working** | Upgraded full analytics dashboard featuring Claims Queue with 1-click Approve/Reject, Recovery Rate KPIs, Loss Category Heatmaps, and CSV audit exports. |

---

## 3. Authentication & Security

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Institutional Email Domain Filtering** | **Verified Working** | Restricts sign-ups strictly to `@vit.edu` domain. Non-institutional domains are blocked client and server side. |
| **OTP Email Dispatch** | **Working With Caveat** | Dispatches via Resend API in ~1.9s, but only delivers to the Resend account owner's inbox (`raginikengale@gmail.com`) via sandbox relay. It does not yet deliver to arbitrary student `@vit.edu` inboxes because no custom domain has been verified with SPF/DKIM DNS records. |
| **OTP Verification & Rate Limiting** | **Verified Working** | Verifies 6-digit cryptographic code against expiration store; locks out requests after 5 failed attempts. |
| **Row Level Security (RLS)** | **Verified Working** | Directly confirmed active on all 9 PostgreSQL tables in Supabase (`users`, `reports`, `report_secrets`, `matches`, `verifications`, `notifications`, `admins`, `admin_invites`, `app_config`). |
| **Blind Verification Secret Protection** | **Verified Working** | Confirmed zero client-readable policy on `public.report_secrets` (`USING (false)`). Anon queries return empty sets (`[]`). |
| **Admin Self-Elevation Defense** | **Verified Working** | Tested via automated injection attack; unauthorized client insertion into `public.admins` is blocked with HTTP 401 (`42501`). |
| **Bootstrap Administrator Account** | **Verified Working** | Confirmed pre-provisioned security administrator (`STAFF-SEC-01`, `Sanjay Jadhav`) active in `public.admins`. |

---

## 4. AI Matching Engine

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Text Vector Embeddings** | **Verified Working** | Computes 384-dimensional dense vectors using `all-MiniLM-L6-v2` for semantic item name and description matching. |
| **Visual Image Embeddings** | **Verified Working** | Computes 512-dimensional CLIP vectors (`ViT-B/32`) on item photos for visual resemblance matching. |
| **Multi-Modal Confidence Scoring** | **Verified Working** | Implements $0.50 \times \text{Text} + 0.40 \times \text{Image} + 0.10 \times \text{Category}$ (renormalized to $0.85/0.15$ when photo is omitted). |
| **Automated Approval ($\ge 80\%$)** | **Verified Working** | Verified in smoke test: score of 0.88 automatically transitioned reports to `recovered` and issued handover token. |
| **Admin Escalation ($50\% - 79\%$)** | **Verified Working** | Ambiguous claims are routed to `/admin/console` claims queue for human review. |
| **Claim Rejection ($< 50\%$)** | **Verified Working** | Claims failing similarity thresholds are rejected and recorded with timestamps. |

---

## 5. Real-Time & Notifications

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **In-App Realtime Subscriptions** | **Verified Working** | WebSocket listeners update Dashboard, Matches, and Notifications pages instantly upon database changes. |
| **Event-Driven Match Detection** | **Verified Working** | Verified in smoke test: match record created in **467 ms** immediately upon found report submission. |
| **Unread Notification Badges** | **Verified Working** | Live unread counter badge updates reactively across navigation headers. |
| **Mobile Background Push (FCM)** | **Working With Caveat** | In-app real-time alerts are fully operational; background mobile push notifications via Firebase Cloud Messaging are pending service account credentials. |

---

## 6. Design System & User Interface

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Dual Theme Support (Light / Dark)** | **Verified Working** | Full Tailwind dark mode toggle integrated with local storage theme persistence. |
| **VIT Pune Institutional Branding** | **Verified Working** | Styled with institutional Teal and Slate palette tailored to Vishwakarma Institute of Technology. |
| **Accessible Form Controls** | **Verified Working** | ARIA attributes, keyboard navigation (Enter/Space), and screen-reader compliant input structures. |
| **Drag & Drop Photo Upload** | **Verified Working** | Verified with custom `PhotoUpload` component enforcing 5MB limits and rendering live previews. |
| **Responsive Multi-Device Layout** | **Verified Working** | Tested on desktop (1920px), tablet (768px), and mobile viewports (375px). |

---

## 7. Infrastructure & Deployment

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Persistent Vercel Production Deployment** | **Verified Working** | Live at `https://vit-lost-and-found-roan.vercel.app` running serverless Next.js 14 App Router. |
| **Continuous Git Integration** | **Verified Working** | Synced with GitHub repository `https://github.com/Ragi509/vit-lost-and-found` (`main` branch) with automated deployment webhooks. |
| **Managed Cloud Database** | **Verified Working** | Supabase PostgreSQL in `ap-south-1` Mumbai region with `pgvector` enabled. |
| **Transactional Email Integration** | **Working With Caveat** | Connected to Resend API (`smtp.resend.com`); operating in sandbox mode pending custom domain DNS verification. |
| **Embedding Service Microservice** | **Working With Caveat** | Hosted on Render free tier; fully operational with Bearer authentication, subject to initial cold-start delays if idle. |

---

## 8. Explicitly Excluded Features (Out of Scope)

| Feature | Status | Notes |
| :--- | :---: | :--- |
| **Direct Finder-Loser In-App Chat** | **Not Implemented (Out of Scope)** | Excluded by design to prevent off-platform harassment and extortion. |
| **Gamification / Bounty Payouts** | **Not Implemented (Out of Scope)** | Excluded to eliminate incentives for fraudulent lost/found submissions. |
| **Multi-College Tenant Switching** | **Not Implemented (Out of Scope)** | Restricted strictly to VIT Pune institutional accounts. |
| **Payment Gateway Integration** | **Not Implemented (Out of Scope)** | Campus recovery is a free student support service. |
| **Student Record Management** | **Not Implemented (Out of Scope)** | Admin console excludes academic management; user records are immutable reflections of `@vit.edu` accounts. |
