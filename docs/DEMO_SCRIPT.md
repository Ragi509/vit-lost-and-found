# VIT Lost & Found — Faculty Presentation Demo Script

> **Target Presentation Time**: 6–8 minutes  
> **Audience**: Vishwakarma Institute of Technology (VIT) Faculty Review Committee  
> **Production URL**: [https://vit-lost-and-found-roan.vercel.app](https://vit-lost-and-found-roan.vercel.app)  
> **Reference Data**: [`docs/DEMO_DATA.md`](./DEMO_DATA.md)

---

## Pre-Demo Checklist (5 Minutes Before Entering the Room)

- [ ] **Warm Up Render Microservice**: Open a new tab and visit `https://vit-lost-found-embedding.onrender.com/health` (wait until it returns `{"status":"healthy"}`).
- [ ] **Open Developer Email Inbox**: Ensure you have access to `raginikengale@gmail.com` in a separate tab to copy the OTP instantly.
- [ ] **Open Supabase Console**: Keep `https://supabase.com/dashboard/project/ruvkhuocnixoouphosku/editor` open in a background tab if faculty ask to see the live database tables.
- [ ] **Clean Slate Check**: Confirm database contains exactly the single unclaimed demo match (see `docs/DEMO_DATA.md`).

---

## Demo Walkthrough Timeline (6–8 Minutes)

```
0:00 - 1:00  │ Introduction & Institutional Problem Context
1:00 - 2:15  │ Student Persona Sign-In & Dashboard Overview
2:15 - 3:45  │ AI Matching Engine & Multi-Modal Similarity Breakdown
3:45 - 5:15  │ Blind Ownership Verification & Token Generation
5:15 - 6:30  │ Campus Security Staff Portal & Audit Controls
6:30 - 7:30  │ Database Security & RLS Demonstration (Faculty Q&A)
```

---

### Step 1: Institutional Context & Problem Statement (0:00 – 1:00)

**Spoken Talking Points**:
> *"Good morning, respected faculty members. On a campus with over 10,000 students across Bibwewadi and Kondhwa, hundreds of valuable items—laptops, calculators, ID cards—are misplaced every semester. The current process relies on fragmented WhatsApp groups or manual registers at the security desk where anyone can falsely claim an item.*
>
> *Today, I am demonstrating **VIT Lost & Found**, an AI-powered campus recovery platform that enforces strict institutional email gating, multi-modal vector similarity search, and a cryptographic blind-verification protocol to prevent fraudulent claims."*

---

### Step 2: Student Login & Dynamic Dashboard (1:00 – 2:15)

1. Open `https://vit-lost-and-found-roan.vercel.app` in your browser.
2. Click **"Student Sign In"**.
3. **Show Domain Validation**:
   - Type `test@gmail.com` and click Send OTP.
   - **Point out**: The system immediately rejects external domains with: *"Only official @vit.edu institutional emails are permitted."*
4. Enter the demo student email: `ragini.kengale24@vit.edu`.
5. Retrieve the 6-digit OTP from your Resend inbox tab and enter it.
6. **Navigate to Dashboard (`/dashboard`)**:
   - **Point out**:
     - Greeting shows *"Welcome back, Ragini Kengale"*.
     - Real-time KPI counter: **1 Active Report**, **1 AI Match Candidate**.
     - Notice the top navigation bell icon showing **1 unread notification**.
     - Click the bell icon to show the match alert: *"New Match Detected (~88% Match) — Dell Inspiron 15 3520 laptop"*.

---

### Step 3: AI Matching Engine & Multi-Factor Breakdown (2:15 – 3:45)

1. Click on the notification or navigate to **"AI Matches"** (`/matches`).
2. Point out the match card linking:
   - **Lost Item**: *Dell Inspiron 15 3520 laptop (silver-grey)* — reported by Ragini.
   - **Found Item**: *Dell laptop with charger* — found in D-Block Lab 304 by student Aditya Joshi.
3. Click **"View Match Details"** (`/matches/[id]`):
   - **Point out the Multi-Factor Confidence Score: 88%**:
     - **Semantic Text Overlap (50% weight)**: $0.88$ score. The system extracted dense 384-dimensional sentence embeddings (`all-MiniLM-L6-v2`) comparing the two descriptions.
     - **Visual Resemblance (40% weight)**: $0.85$ score. Both genuine photos were compared using 512-dimensional CLIP vectors.
     - **Category Match (10% weight)**: $1.00$ score. Both classified under *Laptops & Accessories*.
     - **Formula**: $0.50(0.88) + 0.40(0.85) + 0.10(1.00) = 0.88$ (88%).
   - Highlight the **Holding Location**: *"Handed to the Lost & Found office"*.

---

### Step 4: Blind Ownership Verification Protocol (3:45 – 5:15)

**Spoken Talking Points**:
> *"The biggest vulnerability in traditional lost & found systems is false claims. If someone sees the photo and location, they can simply say 'That's mine!'.*
>
> *Our platform solves this with a **Blind Verification Protocol**. When Ragini submitted her lost report, she entered a private distinguishing detail that is encrypted with AES-256 in the database and NEVER shown to the finder, the public, or the frontend.*
>
> *To claim the item, Ragini must now describe that secret from memory without any hints."*

1. Click **"Claim This Item"** on the match detail page.
2. The verification form asks: *"Describe the private distinguishing feature of your item."*
3. **Submit the Prepared Answer**:
   - Paste or type:  
     `Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge.`
4. Click **"Verify Ownership"**:
   - The frontend calls the backend verification microservice.
   - The microservice decrypts the original secret in memory, generates embeddings for both texts, and computes cosine similarity.
5. **Show the Result**:
   - Similarity score: **~0.92** ($\ge 0.80$ threshold).
   - **Automated Instant Approval**: The card turns green.
   - A unique cryptographic **Retrieval Token** is generated: `VIT-REC-XXXXX`.
   - **Custody Instructions**: *"Present this token and your physical VIT Student ID card at the Central Security Desk to collect your laptop."*

*(Optional Alternative if demonstrating escalation)*:
> *"If the claimant provides a vague answer like 'It has a crack and a blue sticker', similarity drops to ~0.65. The system automatically routes it to the Security Desk for human review instead of rejecting it."*

---

### Step 5: Campus Security / Staff Portal (`/staff/login`) (5:15 – 6:30)

1. Open an incognito window or log out.
2. Navigate to `/staff/login`.
3. Sign in as Campus Security Administrator:
   - **Email**: `security.head@vit.edu`
   - **Password**: `vit_admin_faculty_demo_2026`
4. Click **"Sign In to Security Desk"**.
5. **Show the Admin Console (`/admin/console`)**:
   - Point out the **Security Desk Dashboard**:
     - Overview of recovered items, claims queue, and institutional audit log.
     - Demonstrate that when a claim is under human review, the security officer sees the claimant's PRN and institutional email, but the private detail is masked to maintain integrity.
     - Show the mandatory rejection rationale requirement (officer cannot reject a claim without logging an official reason).

---

### Step 6: Database Architecture & Row-Level Security (6:30 – 7:30)

*(Switch to Supabase Console tab to address faculty technical questions)*:
1. Open **Table Editor -> `public.report_secrets`**:
   - **Point out**: The column `encrypted_distinguishing_detail` contains bytea ciphertext (`\x...`), NOT plaintext.
   - **Explain RLS**: Row-Level Security policy `USING (false)` guarantees that even if a student intercepts their JWT or queries Supabase directly via the browser console, they receive an empty list (`[]`).
2. Open **Table Editor -> `public.matches`**:
   - Show the row with `text_score`, `image_score`, `category_score`, and `confidence_score`.
3. Open **Storage -> `item-photos`**:
   - Show the folder structure with the genuine lost and found photos.

---

## Common Faculty Questions & Confident Answers

| Faculty Question | Technical Answer |
|---|---|
| **"Why not just use fuzzy string matching (Levenshtein distance)?"** | *"Levenshtein distance only measures character edits. If a student writes 'scratch near hinge' and the finder noted 'minor abrasion near joint', string distance gives 0% match, whereas our 384-dimensional vector embedding detects high semantic similarity."* |
| **"Can an attacker scrape all lost items on campus?"** | *"No. The `/browse` catalog only shows public title and category. Distinguishing details are stored in a dedicated `report_secrets` table with a zero-client-read RLS policy enforced at the Postgres kernel level."* |
| **"What happens if the embedding microservice goes down?"** | *"Zero silent fallbacks. The system catches connection errors and immediately routes the claim to the security desk escalation queue with reason `microservice_unreachable_escalated`. It never guesses or fakes approval."* |
| **"Why is the OTP going to Gmail instead of my college email?"** | *"The transactional email provider (Resend) is currently in developer sandbox mode because configuring institutional SPF/DKIM DNS records requires college IT administrative access. The logic is fully production-ready once domain records are verified."* |
