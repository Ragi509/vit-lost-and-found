export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "Student" | "Faculty" | "Staff";
export type ReportType = "lost" | "found";
export type ReportStatus = "searching" | "matched" | "verification_required" | "recovered";
export type VerificationResult = "approved" | "escalated" | "rejected";
export type AdminApprovalStatus = "pending" | "approved";

export interface UserProfile {
  id: string;
  vit_email: string;
  full_name: string;
  role: UserRole;
  id_number: string;
  created_at: string;
}

export interface ReportItem {
  id: string;
  reporter_id: string;
  type: ReportType;
  item_name: string;
  category: string;
  description: string;
  photo_url?: string | null;
  date_time: string;
  location: string;
  status: ReportStatus;
  holding_location?: string | null;
  finder_notes?: string | null;
  created_at: string;
}

export interface MatchRecord {
  id: string;
  lost_report_id: string;
  found_report_id: string;
  text_score: number;
  image_score: number;
  category_score: number;
  confidence_score: number;
  status: "suggested" | "claimed" | "dismissed";
  created_at: string;
  lost_report?: ReportItem;
  found_report?: ReportItem;
}

export interface VerificationRecord {
  id: string;
  match_id: string;
  claimant_id: string;
  similarity_score: number;
  result: VerificationResult;
  reviewed_by_admin_id?: string | null;
  reject_reason?: string | null;
  created_at: string;
  match?: MatchRecord;
  claimant?: UserProfile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: "match" | "verification" | "system";
  title: string;
  body: string;
  data?: any;
  read: boolean;
  created_at: string;
}
