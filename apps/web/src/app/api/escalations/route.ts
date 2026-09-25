import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseSessionCookie } from "@/lib/auth/session-validator";

export const dynamic = "force-dynamic";

function getAuthenticatedUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/vit_session=([^;]+)/);
  if (!match) return null;
  return parseSessionCookie(match[1]);
}

function getStaffUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/vit_staff_session=([^;]+)/);
  if (!match) return null;
  return parseSessionCookie(match[1]);
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const session = getAuthenticatedUser(request);
    const staffSession = getStaffUser(request);

    if (!session && !staffSession) {
      return NextResponse.json({ error: "Unauthorized: login required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");

    let query = supabase.from("escalations").select(`
      id,
      report_id,
      requested_by,
      status,
      admin_notes,
      reviewed_by_admin_id,
      created_at,
      resolved_at,
      report:reports(id, item_name, category, description, photo_url, location, date_time, status, reporter_id)
    `);

    if (reportId) {
      query = query.eq("report_id", reportId);
      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ escalation: null });
      }

      const esc = data[0];
      // Enforce RLS / Access control: only owner or admin can view
      const isOwner = session && (esc.requested_by === session.id || (esc.report && (esc.report as any).reporter_id === session.id));
      const isAdmin = Boolean(staffSession);

      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: "Forbidden: Cannot access another user's escalation" }, { status: 403 });
      }

      return NextResponse.json({ escalation: esc });
    }

    // List view: students only see their own escalations; staff see all
    if (!staffSession && session) {
      query = query.eq("requested_by", session.id);
    }

    const { data: escalations, error } = await query.order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ escalations: escalations || [] });
  } catch (err: any) {
    console.error("GET /api/escalations exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const session = getAuthenticatedUser(request);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized: login required" }, { status: 401 });
    }

    const body = await request.json();
    const { reportId } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    // 1. Fetch report details
    const { data: report, error: reportErr } = await supabase
      .from("reports")
      .select("id, item_name, type, status, reporter_id, created_at")
      .eq("id", reportId)
      .single();

    if (reportErr || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Validate ownership
    if (report.reporter_id !== session.id) {
      return NextResponse.json({ error: "Forbidden: You may only escalate your own reports" }, { status: 403 });
    }

    // 3. Validate status: must still be 'searching' (no match found)
    if (report.status !== "searching") {
      return NextResponse.json(
        { error: `Cannot escalate report with status '${report.status}'. Only unmatched searching reports can be escalated.` },
        { status: 400 }
      );
    }

    // 4. Verify no active matches exist
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("lost_report_id", reportId)
      .limit(1);

    if (matches && matches.length > 0) {
      return NextResponse.json(
        { error: "Cannot escalate: An AI match already exists for this report." },
        { status: 400 }
      );
    }

    // 5. Check age against eligible_for_escalation_hours from app_config
    const { data: configRows } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "eligible_for_escalation_hours")
      .maybeSingle();

    const thresholdHours = Number(configRows?.value) || 72;
    const createdAtMs = new Date(report.created_at).getTime();
    const nowMs = Date.now();
    const ageHours = (nowMs - createdAtMs) / (1000 * 60 * 60);

    if (ageHours < thresholdHours) {
      return NextResponse.json(
        {
          error: `Report is not yet eligible for security desk escalation. Report has been open for ${ageHours.toFixed(1)}h; minimum required is ${thresholdHours}h.`,
          eligible: false,
          ageHours,
          thresholdHours,
        },
        { status: 400 }
      );
    }

    // 6. Check for existing escalation (prevent duplicate escalations)
    const { data: existingEscalation } = await supabase
      .from("escalations")
      .select("id, status")
      .eq("report_id", reportId)
      .maybeSingle();

    if (existingEscalation) {
      return NextResponse.json(
        { error: "This report has already been escalated to the security desk.", escalationId: existingEscalation.id },
        { status: 409 }
      );
    }

    // 7. Insert escalation record
    const { data: newEscalation, error: insertErr } = await supabase
      .from("escalations")
      .insert({
        report_id: reportId,
        requested_by: session.id,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert escalation:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 8. Create confirmation notification for student (Acceptance Criterion 2)
    await supabase.from("notifications").insert({
      user_id: session.id,
      type: "system",
      title: "Case Escalated to Security Desk",
      body: `Your report for "${report.item_name}" has been forwarded to campus security for manual review. A staff member is now reviewing your case.`,
      data: {
        report_id: reportId,
        escalation_id: newEscalation.id,
        status: "pending",
      },
      read: false,
    });

    return NextResponse.json({
      success: true,
      escalation: newEscalation,
      message: "Your case has been forwarded to the security desk. A human staff member is now reviewing your report.",
    });
  } catch (err: any) {
    console.error("POST /api/escalations exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
