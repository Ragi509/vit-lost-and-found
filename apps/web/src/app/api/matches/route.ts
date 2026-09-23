import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const { data: matches, error } = await supabase
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
      .order("confidence_score", { ascending: false });

    if (error) {
      console.error("GET /api/matches error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by user if requested
    let result = matches || [];
    if (userId) {
      result = result.filter(
        (m: any) => m.lost_report?.reporter_id === userId || m.found_report?.reporter_id === userId
      );
    }

    return NextResponse.json({ matches: result });
  } catch (err: any) {
    console.error("GET /api/matches exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
