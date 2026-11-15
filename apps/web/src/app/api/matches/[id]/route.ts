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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { id } = params;
    const body = await request.json().catch(() => ({}));
    const { status, action } = body;

    const newStatus = status || (action === "dismiss" ? "dismissed" : "dismissed");

    if (!["suggested", "claimed", "dismissed"].includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status '${newStatus}'. Allowed: suggested, claimed, dismissed` },
        { status: 400 }
      );
    }

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update({ status: newStatus })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, match: updatedMatch });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
