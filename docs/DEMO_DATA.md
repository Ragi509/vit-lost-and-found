# Pre-Loaded Demo Scenario Reference Data
## Faculty Presentation — Single Real Test Case

This file records the exact identifiers, accounts, and scores for the single pre-loaded demo case.
**Automated regression tests MUST exclude these IDs.**

---

### 1. Accounts & Persona Credentials
- **Student Persona (Lost Report Owner)**:
  - **Email**: `ragini.kengale24@vit.edu`
  - **Name**: Ragini Kengale
  - **PRN**: `PRN-2410892`
  - **User ID**: `a1111111-1111-1111-1111-111111111111`
  - **Login Method**: Normal student institutional login via OTP (delivered to developer Resend sandbox inbox)

- **Student Finder (Found Report Submitter)**:
  - **Email**: `aditya.joshi22@vit.edu`
  - **Name**: Aditya Joshi
  - **PRN**: `PRN-2210451`
  - **User ID**: `a2222222-2222-2222-2222-222222222222`

- **Campus Security / Staff Administrator**:
  - **Email**: `security.head@vit.edu`
  - **Name**: Sanjay Jadhav (Head of Campus Security)
  - **Staff ID**: `STAFF-SEC-01`
  - **User ID**: `b1111111-1111-1111-1111-111111111111`
  - **Login Method**: Staff portal email & password sign-in (`/staff/login`)

---

### 2. Core Entities
- **Lost Report ID**: `dc920850-40f3-44a8-b1d1-63e18a053573`
  - **Item Name**: Dell Inspiron 15 3520 laptop (silver-grey)
  - **Category**: Laptops & Accessories
  - **Location**: D-Block - 3rd Floor Computer Lab 304
  - **Date/Time**: 2026-10-12T16:30:00.000Z
  - **Photo URL**: `https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/dc920850-40f3-44a8-b1d1-63e18a053573/photo.jpg`
  - **Private Detail**: *"Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge."* (Encrypted in `report_secrets`)

- **Found Report ID**: `a3d73b49-8417-4f2d-bd91-eb08af561258`
  - **Item Name**: Dell laptop with charger
  - **Category**: Laptops & Accessories
  - **Location**: D-Block - 3rd Floor Computer Lab 304
  - **Photo URL**: `https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/a3d73b49-8417-4f2d-bd91-eb08af561258/photo.jpg`
  - **Holding Location**: Handed to the Lost & Found office

- **Match ID**: `ee10bcd5-c577-43f1-a362-13343dcd70b0`
  - **Confidence Score**: `0.88` (`~88%`)
  - **Text Score**: `0.88`
  - **Image Score**: `0.85`
  - **Category Score**: `1.00`
  - **Status**: `suggested` (**UNCLAIMED** — ready for live demonstration)

- **Notification ID**: `c4f672b3-06ce-4f54-ba45-f7d3e937b5f5`
  - **Target User**: `a1111111-1111-1111-1111-111111111111`
  - **Unread Status**: `true`

---

### 3. Prepared Claimant Answers for Live Demo

| Test Case | Submitted Answer | Expected Result | Real Similarity Score |
|---|---|---|---|
| **Close Answer (Auto-Approve)** | *"Small crack on the bottom-left corner of the screen bezel, and a blue Decathlon sticker on the lid near the hinge."* | **Approved** (`>= 0.80`) | ~0.86 – 1.00 |
| **Vague Answer (Escalate to Human)** | *"It has a small crack on the frame and a blue sticker."* | **Escalated** (`0.50 – 0.79`) | ~0.65 – 0.72 |
| **Incorrect Answer (Reject with Retry)** | *"It has an Apple logo and a Batman sticker on the lid."* | **Rejected** (`< 0.50`) | ~0.15 – 0.30 |
