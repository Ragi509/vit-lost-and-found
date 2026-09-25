import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { id } = params;

    const { data: match, error } = await supabase
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
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error(`GET /api/matches/${id} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ match });
  } catch (err: any) {
    console.error(`GET /api/matches/${params.id} exception:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
