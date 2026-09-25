import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseSessionCookie } from "@/lib/auth/session-validator";

export const dynamic = "force-dynamic";

function getStaffUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/vit_staff_session=([^;]+)/);
  if (!match) return null;
  return parseSessionCookie(match[1]);
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const staffSession = getStaffUser(request);

    if (!staffSession) {
      return NextResponse.json({ error: "Unauthorized: Staff admin privileges required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    let query = supabase
      .from("escalations")
      .select(`
        id,
        status,
        admin_notes,
        reviewed_by_admin_id,
        created_at,
        resolved_at,
        student:users!escalations_requested_by_fkey(
          id,
          vit_email,
          full_name,
          id_number
        ),
        report:reports!escalations_report_id_fkey(
          id,
          item_name,
          category,
          description,
          photo_url,
          location,
          date_time,
          holding_location,
          status,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: escalations, error } = await query;
    if (error) {
      console.error("GET /api/admin/escalations error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ escalations: escalations || [] });
  } catch (err: any) {
    console.error("GET /api/admin/escalations exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createAdminClient();
    const staffSession = getStaffUser(request);

    if (!staffSession) {
      return NextResponse.json({ error: "Unauthorized: Staff admin privileges required" }, { status: 401 });
    }

    const body = await request.json();
    const { escalationId, status, adminNotes } = body;

    if (!escalationId || !status) {
      return NextResponse.json({ error: "Missing escalationId or status" }, { status: 400 });
    }

    if (!["pending", "reviewing", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updates: any = {
      status,
      admin_notes: adminNotes !== undefined ? adminNotes : null,
      reviewed_by_admin_id: staffSession.id || "b1111111-1111-1111-1111-111111111111",
    };

    if (status === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: updated, error } = await supabase
      .from("escalations")
      .update(updates)
      .eq("id", escalationId)
      .select("*, report:reports(id, item_name)")
      .single();

    if (error) {
      console.error("PATCH /api/admin/escalations update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Notify student of status update
    if (updated && updated.requested_by) {
      const title = status === "resolved" 
        ? "Security Desk Escalation Resolved"
        : "Security Desk Case In Review";
      const bodyText = status === "resolved"
        ? `Campus security has completed review of your escalated report for "${updated.report?.item_name || 'your item'}". ${adminNotes ? `Notes: ${adminNotes}` : ''}`
        : `A campus security officer is actively investigating your escalated report for "${updated.report?.item_name || 'your item'}".`;

      await supabase.from("notifications").insert({
        user_id: updated.requested_by,
        type: "system",
        title,
        body: bodyText,
        data: { escalation_id: escalationId, status },
        read: false,
      });
    }

    return NextResponse.json({ success: true, escalation: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/escalations exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
