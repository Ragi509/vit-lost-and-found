import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: notifications, error } = await query;
    if (error) {
      console.error("GET /api/notifications error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (err: any) {
    console.error("GET /api/notifications exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id, markAll, userId } = body;

    if (markAll && userId) {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId);
      return NextResponse.json({ success: true });
    }

    if (id) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing id or markAll parameter" }, { status: 400 });
  } catch (err: any) {
    console.error("PATCH /api/notifications exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
