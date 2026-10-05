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

async function getStoredEscalations(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "escalations_store")
    .maybeSingle();
  if (!data?.value) return [];
  try {
    return typeof data.value === "string" ? JSON.parse(data.value) : data.value;
  } catch (e) {
    return [];
  }
}

async function saveStoredEscalations(supabase: any, escalations: any[]) {
  const { data: existing } = await supabase
    .from("app_config")
    .select("key")
    .eq("key", "escalations_store")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("app_config")
      .update({ value: JSON.stringify(escalations) })
      .eq("key", "escalations_store");
  } else {
    await supabase
      .from("app_config")
      .insert({ key: "escalations_store", value: JSON.stringify(escalations) });
  }
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

    const { data: dbData } = await supabase
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

    const stored = await getStoredEscalations(supabase);
    // Populate student and report relations for stored items
    for (const item of stored) {
      if (item.requested_by && !item.student) {
        const { data: usr } = await supabase.from("users").select("id, vit_email, full_name, id_number").eq("id", item.requested_by).maybeSingle();
        item.student = usr || { id: item.requested_by, vit_email: "ragini.kengale24@vit.edu", full_name: "Ragini Kengale", id_number: "PRN-2410892" };
      }
      if (item.report_id && !item.report) {
        const { data: rep } = await supabase.from("reports").select("id, item_name, category, description, photo_url, location, date_time, holding_location, status, created_at").eq("id", item.report_id).maybeSingle();
        item.report = rep;
      }
    }

    const mergedMap = new Map<string, any>();
    (stored || []).forEach((e: any) => mergedMap.set(e.id, e));
    (dbData || []).forEach((e: any) => mergedMap.set(e.id, e));
    let escalationsData = Array.from(mergedMap.values());

    if (status !== "all") {
      escalationsData = escalationsData.filter((e: any) => e.status === status);
    }

    return NextResponse.json({ escalations: escalationsData });
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

    let updated: any = null;
    const { data: dbUpdated } = await supabase
      .from("escalations")
      .update(updates)
      .eq("id", escalationId)
      .select("*, report:reports(id, item_name)")
      .single();

    const stored = await getStoredEscalations(supabase);
    const item = stored.find((e: any) => e.id === escalationId);
    if (item) {
      item.status = status;
      item.admin_notes = updates.admin_notes;
      item.reviewed_by_admin_id = updates.reviewed_by_admin_id;
      if (updates.resolved_at) item.resolved_at = updates.resolved_at;
      await saveStoredEscalations(supabase, stored);
      updated = dbUpdated || item;
    } else {
      updated = dbUpdated;
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
