import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "escalated";

    let query = supabase
      .from("verifications")
      .select(`
        id,
        similarity_score,
        result,
        reject_reason,
        created_at,
        claimant:users!verifications_claimant_id_fkey(id, vit_email, full_name, id_number),
        match:matches!verifications_match_id_fkey(
          id,
          confidence_score,
          lost_report:reports!matches_lost_report_id_fkey(id, item_name, category, location, description),
          found_report:reports!matches_found_report_id_fkey(id, item_name, category, location, description, holding_location)
        )
      `)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("result", status);
    }

    const { data: claims, error } = await query;
    if (error) {
      console.error("GET /api/admin/claims error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ claims: claims || [] });
  } catch (err: any) {
    console.error("GET /api/admin/claims exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { claimId, action, rejectReason, adminId } = body;

    if (!claimId || !action) {
      return NextResponse.json({ error: "Missing claimId or action" }, { status: 400 });
    }

    const { data: verif, error: fetchErr } = await supabase
      .from("verifications")
      .select("*, match:matches!verifications_match_id_fkey(*)")
      .eq("id", claimId)
      .single();

    if (fetchErr || !verif) {
      return NextResponse.json({ error: "Verification record not found" }, { status: 404 });
    }

    if (action === "approve") {
      await supabase
        .from("verifications")
        .update({
          result: "approved",
          reviewed_by_admin_id: adminId || "b1111111-1111-1111-1111-111111111111",
        })
        .eq("id", claimId);

      // Transition reports to recovered
      if (verif.match?.lost_report_id && verif.match?.found_report_id) {
        await supabase
          .from("reports")
          .update({ status: "recovered" })
          .in("id", [verif.match.lost_report_id, verif.match.found_report_id]);
      }

      await supabase.from("matches").update({ status: "claimed" }).eq("id", verif.match_id);

      // Notify claimant
      const token = "VIT-REC-" + Math.floor(10000 + Math.random() * 90000);
      await supabase.from("notifications").insert({
        user_id: verif.claimant_id,
        type: "verification",
        title: "Staff Review Approved — Claim Verified",
        body: `Campus security verified your claim. Present token ${token} at the custody desk for handover.`,
        data: { match_id: verif.match_id, token },
        read: false,
      });

      return NextResponse.json({ success: true, action: "approved", token });
    } else if (action === "reject") {
      if (!rejectReason) {
        return NextResponse.json({ error: "Mandatory rejection reason required" }, { status: 400 });
      }

      await supabase
        .from("verifications")
        .update({
          result: "rejected",
          reject_reason: rejectReason,
          reviewed_by_admin_id: adminId || "b1111111-1111-1111-1111-111111111111",
        })
        .eq("id", claimId);

      // Notify claimant
      await supabase.from("notifications").insert({
        user_id: verif.claimant_id,
        type: "verification",
        title: "Ownership Claim Rejected by Staff Review",
        body: `Reason: ${rejectReason}`,
        data: { match_id: verif.match_id, reject_reason: rejectReason },
        read: false,
      });

      return NextResponse.json({ success: true, action: "rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/admin/claims exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
