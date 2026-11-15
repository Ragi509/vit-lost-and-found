# API Reference Documentation
## VIT Lost & Found Platform

All endpoints are hosted at `https://vit-lost-and-found-roan.vercel.app/api/*` and return standard JSON payloads.

---

### Table of Contents
1. [Authentication (`/api/auth/*`)](#1-authentication)
2. [Health & Pre-Demo Check (`/api/health`)](#2-health--pre-demo-check)
3. [Reference Data (`/api/reference-data`)](#3-reference-data)
4. [Reports (`/api/reports`)](#4-reports)
5. [Matches (`/api/matches`)](#5-matches)
6. [Ownership Verification (`/api/verifications`)](#6-ownership-verification)
7. [Escalations / Security Desk (`/api/escalations`)](#7-escalations--security-desk)
8. [Admin Console Actions (`/api/admin/*`)](#8-admin-console-actions)
9. [Cron Keep-Alive (`/api/cron/keepalive`)](#9-cron-keep-alive)

---

### 1. Authentication

#### `POST /api/auth/send-otp`
Sends a 6-digit one-time password to the student's institutional email address.
- **Auth**: Public
- **Request**:
  ```json
  {
    "email": "student.name24@vit.edu"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "OTP delivered to institutional inbox"
  }
  ```

#### `POST /api/auth/verify-otp`
Validates the submitted OTP and sets a 7-day secure HTTP session cookie (`vit_session`).
- **Auth**: Public
- **Request**:
  ```json
  {
    "email": "student.name24@vit.edu",
    "code": "123456"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Verification successful",
    "session": {
      "id": "uuid",
      "email": "student.name24@vit.edu",
      "fullName": "Student Name",
      "role": "Student",
      "prn": "PRN-2410892"
    }
  }
  ```

#### `POST /api/auth/staff-login`
Authenticates staff administrators via email and environment-configured password, setting `vit_staff_session`.
- **Auth**: Public (Staff credentials)
- **Request**:
  ```json
  {
    "email": "security.head@vit.edu",
    "password": "<configured-admin-password>"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "session": {
      "id": "b1111111-1111-1111-1111-111111111111",
      "email": "security.head@vit.edu",
      "fullName": "Sanjay Jadhav",
      "role": "Staff",
      "staffId": "STAFF-SEC-01",
      "department": "Campus Security & Facilities"
    }
  }
  ```

#### `POST /api/auth/staff-register`
Submits a staff access request using a cryptographically hashed administrator invite code.
- **Auth**: Public
- **Request**:
  ```json
  {
    "inviteCode": "VIT-ADMIN-STAFF-2026",
    "fullName": "Prof. Rajesh Deshmukh",
    "email": "rajesh.deshmukh@vit.edu",
    "department": "Central Library",
    "staffId": "STAFF-104"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "status": "pending"
  }
  ```

---

### 2. Health & Pre-Demo Check

#### `GET /api/health`
Monitors health, latency, and connectivity of PostgreSQL database, Supabase storage bucket, Realtime channels, and Render AI embedding microservice.
- **Auth**: Public
- **Response** (`200 OK`):
  ```json
  {
    "status": "healthy",
    "environment": "production",
    "timestamp": "2026-10-12T18:00:00.000Z",
    "totalElapsedMs": 142,
    "services": {
      "database": { "status": "healthy", "latencyMs": 48 },
      "storage": { "status": "healthy", "latencyMs": 35 },
      "realtime": { "status": "healthy", "latencyMs": 12 },
      "embedding_service": { "status": "healthy", "latencyMs": 47 }
    }
  }
  ```

---

### 3. Reference Data

#### `GET /api/reference-data`
Retrieves verified categories, campus locations, and custody desks dynamically from the database.
- **Auth**: Public
- **Response** (`200 OK`):
  ```json
  {
    "categories": [
      "Academic Tools & Calculators",
      "Identity Cards & Campus Keys",
      "Laptops & Accessories"
    ],
    "locations": [
      "Central Library - 2nd Floor Reading Room",
      "D-Block - 3rd Floor Computer Lab 304"
    ],
    "holdingLocations": [
      "Central Library Helpdesk (Ground Floor)",
      "Main Security Gate 1 Security Office"
    ]
  }
  ```

---

### 4. Reports

#### `GET /api/reports`
Lists reports filtered by type or reporter ID.
- **Auth**: Public
- **Parameters**: `?type=lost|found|all`, `?reporterId=<uuid>`
- **Response** (`200 OK`):
  ```json
  {
    "reports": [
      {
        "id": "uuid",
        "type": "lost",
        "item_name": "Dell Inspiron 15 3520 laptop",
        "category": "Laptops & Accessories",
        "status": "searching",
        "location": "D-Block - 3rd Floor Computer Lab 304",
        "photo_url": "https://.../item-photos/.../photo.jpg"
      }
    ]
  }
  ```

#### `POST /api/reports`
Submits a lost or found report, uploads embeddings, and triggers AI matching.
- **Auth**: Authenticated session required
- **Request**:
  ```json
  {
    "reporterId": "uuid",
    "type": "lost",
    "itemName": "Dell Inspiron 15 3520 laptop (silver-grey)",
    "category": "Laptops & Accessories",
    "description": "Left in Computer Lab 304...",
    "photoUrl": "https://...",
    "location": "D-Block - 3rd Floor Computer Lab 304",
    "dateTime": "2026-10-12T16:30:00Z",
    "privateSecret": "Small crack on bottom-left bezel..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "report": { "id": "uuid", "status": "searching" },
    "match": { "id": "match-uuid", "confidence_score": 0.88 },
    "notification": { "id": "notif-uuid" }
  }
  ```

#### `GET /api/reports/[id]`
Retrieves full details for a single report.
- **Auth**: Authenticated session (Owner or Admin)

#### `PATCH /api/reports/[id]`
Updates editable fields on a report while status is `searching` and no verification/escalation exists.
- **Auth**: Authenticated session (Owner or Admin)
- **Status Guards**: Blocked with `409 Conflict` if report status is not `searching` or active claim exists.
- **Optimistic Locking**: Accepts `updatedAt` to reject stale modifications with `409 Conflict`.

#### `DELETE /api/reports/[id]`
Atomically removes a report, cleaning up storage images, encrypted secrets, and pending matches.
- **Auth**: Authenticated session (Owner or Admin)
- **Guards**: Blocked with `409 Conflict` if report is `recovered` or claim/escalation is active.

---

### 4.1 Campus Browse (`/api/browse`)

#### `GET /api/browse`
Campus-wide search and filter over active items with strict privacy guarantees.
- **Auth**: Authenticated VIT member only (`401` if unauthenticated)
- **Parameters**: `?type=found|lost|all`, `?category=<category>`, `?location=<loc>`, `?search=<text>`
- **Privacy Enforcement**: Strips `reporter_id`, reporter name/email, confidential notes, secrets, and holding locations. Generates short-lived signed URLs for photos.

#### `POST /api/browse/claim`
Initiates a claim for a found item from the campus catalog.
- **Auth**: Authenticated session
- **Dual Claim Protection**: Routes competing claims from multiple students to campus security review.

---

### 5. Matches

#### `GET /api/matches`
Lists match pairs for a given user's active reports.
- **Auth**: Authenticated session
- **Parameters**: `?userId=<uuid>`

#### `PATCH /api/matches/[id]`
Dismisses an AI match when the user marks "Not My Item".
- **Auth**: Authenticated session
- **Request**: `{ "status": "dismissed" }`
- **Response** (`200 OK`):
  ```json
  {
    "matches": [
      {
        "id": "match-uuid",
        "confidence_score": 0.88,
        "lost_report": { "item_name": "Dell Inspiron 15 3520 laptop" },
        "found_report": { "item_name": "Dell laptop with charger" }
      }
    ]
  }
  ```

---

### 6. Ownership Verification

#### `POST /api/verifications`
Evaluates a claimant's submitted ownership proof against stored secrets via vector cosine similarity.
- **Auth**: Authenticated claimant session
- **Request**:
  ```json
  {
    "matchId": "match-uuid",
    "claimantId": "uuid",
    "submittedSecretText": "Small crack on the bottom-left corner of the screen bezel"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "verification_id": "verif-uuid",
    "similarity_score": 0.86,
    "result": "approved",
    "comparison_method": "microservice_vector_embedding"
  }
  ```

---

### 7. Escalations / Security Desk

#### `GET /api/escalations`
Lists escalated cases for the current user or all cases for administrators.
- **Auth**: Authenticated session

#### `POST /api/escalations`
Forwards an unmatched report to campus security if aged beyond the configured threshold (`eligible_for_escalation_hours = 72h`).
- **Auth**: Authenticated report owner
- **Request**:
  ```json
  {
    "reportId": "report-uuid"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "escalation": { "id": "esc-uuid", "status": "pending" },
    "message": "Your case has been forwarded to the security desk."
  }
  ```

---

### 8. Admin Console Actions

#### `GET /api/admin/claims`
Retrieves claims and verifications queue for campus security review.
- **Auth**: Staff session required

#### `POST /api/admin/claims`
Approves or rejects a claim.
- **Auth**: Staff session required
- **Request**:
  ```json
  {
    "verificationId": "verif-uuid",
    "action": "reject",
    "reason": "Serial number mismatch with physical device in custody"
  }
  ```

---

### 9. Cron Keep-Alive

#### `GET /api/cron/keepalive`
Scheduled ping keeping the Render embedding service warm to prevent cold-starts during demonstration hours.
- **Auth**: Public or Vercel Cron trigger
- **Response** (`200 OK`):
  ```json
  {
    "status": "ok",
    "elapsedMs": 42,
    "timestamp": "2026-10-12T18:00:00.000Z"
  }
  ```
