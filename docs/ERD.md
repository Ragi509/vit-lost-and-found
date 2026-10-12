# Entity-Relationship Diagram (ERD)
## VIT Lost & Found Campus Platform

The following diagram represents the production database schema deployed in **Supabase PostgreSQL 15+** with `pgvector` and `pgcrypto` extensions.

```mermaid
erDiagram
    users ||--o{ reports : "submits"
    users ||--o{ notifications : "receives"
    users ||--o{ verifications : "submits claim"
    users ||--o| admins : "elevated to"
    users ||--o{ escalations : "requests"
    
    reports ||--|| report_secrets : "protects (1:1)"
    reports ||--o{ matches : "lost or found party"
    reports ||--o| escalations : "escalated via"
    
    matches ||--o{ verifications : "validated by"
    
    admins ||--o{ admin_invites : "issues"
    admin_invites ||--o| users : "redeemed by"
    admins ||--o{ escalations : "reviews"
    admins ||--o{ verifications : "adjudicates"

    users {
        uuid id PK "gen_random_uuid()"
        text vit_email UK "Official @vit.edu / @viit.ac.in"
        text full_name "Student / Staff Name"
        text role "Student | Faculty | Staff"
        text id_number "PRN or Staff Employee ID"
        timestamptz created_at "Account creation timestamp"
    }

    reports {
        uuid id PK "gen_random_uuid()"
        uuid reporter_id FK "References users(id)"
        text type "'lost' | 'found'"
        text item_name "Item title / model"
        text category "Academic, Electronics, Laptops, etc."
        text description "Public observable details"
        text photo_url "Path in item-photos storage bucket"
        timestamptz date_time "Estimated loss/found time"
        text location "Campus physical location"
        text status "'searching' | 'matched' | 'recovered'"
        text holding_location "Custody desk for found items"
        text finder_notes "Confidential finder remarks"
        vector_384 text_vector "Semantic embedding vector"
        vector_512 image_vector "Visual embedding vector"
        timestamptz created_at "Submission timestamp"
    }

    report_secrets {
        uuid report_id PK, FK "References reports(id) ON DELETE CASCADE"
        bytea encrypted_distinguishing_detail "Encrypted via pgcrypto / AES-256"
        vector_384 detail_embedding "Vector for cosine comparison"
        timestamptz created_at "Encryption timestamp"
    }

    matches {
        uuid id PK "gen_random_uuid()"
        uuid lost_report_id FK "References reports(id)"
        uuid found_report_id FK "References reports(id)"
        numeric text_score "Cosine similarity (0.00 - 1.00)"
        numeric image_score "Visual similarity (0.00 - 1.00)"
        numeric category_score "Exact match (1.00 or 0.00)"
        numeric confidence_score "Weighted composite score"
        text status "'pending_verification' | 'claimed'"
        timestamptz created_at "Match detection timestamp"
    }

    verifications {
        uuid id PK "gen_random_uuid()"
        uuid match_id FK "References matches(id)"
        uuid claimant_id FK "References users(id)"
        vector_384 submitted_detail_embedding "Claimant proof embedding"
        numeric similarity_score "Cosine score against secret"
        text result "'approved' | 'escalated' | 'rejected'"
        text comparison_method "Embedding method audit log"
        uuid reviewed_by_admin_id FK "References users(id)"
        text reject_reason "Reason if rejected"
        timestamptz created_at "Attempt timestamp"
    }

    escalations {
        uuid id PK "gen_random_uuid()"
        uuid report_id FK, UK "References reports(id)"
        uuid requested_by FK "References users(id)"
        text status "'pending' | 'reviewing' | 'resolved'"
        text admin_notes "Security officer case notes"
        uuid reviewed_by_admin_id FK "References users(id)"
        timestamptz created_at "Escalation timestamp"
        timestamptz resolved_at "Resolution timestamp"
    }

    notifications {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "References users(id)"
        text type "'match' | 'verification' | 'system'"
        text title "Notification header"
        text body "Notification details"
        jsonb data "Metadata (match_id, token, etc.)"
        boolean read "Unread status flag"
        timestamptz created_at "Trigger timestamp"
    }

    admins {
        uuid id PK, FK "References users(id)"
        text department "Administrative unit"
        text staff_id "Staff ID / Badge number"
        text approval_status "'pending' | 'approved' | 'rejected'"
        uuid approved_by FK "References users(id)"
        timestamptz created_at "Role assignment timestamp"
    }

    admin_invites {
        uuid id PK "gen_random_uuid()"
        text code_hash UK "SHA-256 hash of invite code"
        uuid issued_by FK "References admins(id)"
        uuid used_by FK "References users(id)"
        timestamptz expires_at "Invite expiration timestamp"
        timestamptz created_at "Issuance timestamp"
    }

    app_config {
        text key PK "Configuration key identifier"
        jsonb value "JSON parameter value"
        timestamptz updated_at "Update timestamp"
    }

    categories {
        uuid id PK "gen_random_uuid()"
        text name UK "Category name"
        int sort_order "Display order"
        timestamptz created_at "Creation timestamp"
    }

    campus_locations {
        uuid id PK "gen_random_uuid()"
        text name UK "Location title"
        boolean is_holding_location "Custody desk flag"
        int sort_order "Display order"
        timestamptz created_at "Creation timestamp"
    }
```

---

### Database Views

1. **`public.lost_items`**: Read-only view filtering `reports WHERE type = 'lost'` with `WITH (security_invoker = true)` to apply caller Row Level Security.
2. **`public.found_items`**: Read-only view filtering `reports WHERE type = 'found'` with `WITH (security_invoker = true)`.
