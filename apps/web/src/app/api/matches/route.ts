import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const minConfidenceParam = searchParams.get("minConfidence");
    const minConfidence = minConfidenceParam !== null ? parseFloat(minConfidenceParam) : 0.40;

    let query = supabase
      .from("matches")
      .select(`
        id,
        confidence_score,
        text_score,
        image_score,
        category_score,
        status,
        created_at,
        lost_report:reports!matches_lost_report_id_fkey(id, item_name, category, location, date_time, description, photo_url, reporter_id, status),
        found_report:reports!matches_found_report_id_fkey(id, item_name, category, location, date_time, description, photo_url, holding_location, reporter_id, status)
      `)
      .gte("confidence_score", minConfidence)
      .neq("status", "rejected")
      .order("confidence_score", { ascending: false });

    const { data: matches, error } = await query;

    if (error) {
      console.error("GET /api/matches error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userEmail = searchParams.get("email") || searchParams.get("userEmail");

    // Filter by user if requested (supporting ID, Email, and session cookie fallback)
    let result = matches || [];
    const targetUserIds: string[] = [];
    if (userId) targetUserIds.push(userId);

    if (userEmail) {
      const { data: uRec } = await supabase
        .from("users")
        .select("id")
        .eq("vit_email", userEmail.trim().toLowerCase())
        .maybeSingle();
      if (uRec?.id && !targetUserIds.includes(uRec.id)) {
        targetUserIds.push(uRec.id);
      }
    }

    if (targetUserIds.length === 0 || (userId && userId.startsWith("user-"))) {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/vit_session=([^;]+)/);
      if (match) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          if (parsed.email) {
            const { data: uRec } = await supabase
              .from("users")
              .select("id")
              .eq("vit_email", parsed.email.trim().toLowerCase())
              .maybeSingle();
            if (uRec?.id && !targetUserIds.includes(uRec.id)) {
              targetUserIds.push(uRec.id);
            }
          }
          if (parsed.id && !targetUserIds.includes(parsed.id)) {
            targetUserIds.push(parsed.id);
          }
        } catch (_) {}
      }
    }

    if (targetUserIds.length > 0) {
      result = result.filter(
        (m: any) => targetUserIds.includes(m.lost_report?.reporter_id) || targetUserIds.includes(m.found_report?.reporter_id)
      );
    }

    // Compute unread match count for notifications
    let unreadCount = 0;
    if (targetUserIds.length > 0) {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .in("user_id", targetUserIds)
        .eq("type", "match")
        .eq("read", false);
      unreadCount = count || 0;
    }

    return NextResponse.json({ matches: result, unreadCount });
  } catch (err: any) {
    console.error("GET /api/matches exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
