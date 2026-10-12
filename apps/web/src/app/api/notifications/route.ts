import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const userEmail = searchParams.get("email") || searchParams.get("userEmail");

    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

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

    if (targetUserIds.length === 1) {
      query = query.eq("user_id", targetUserIds[0]);
    } else if (targetUserIds.length > 1) {
      query = query.in("user_id", targetUserIds);
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
