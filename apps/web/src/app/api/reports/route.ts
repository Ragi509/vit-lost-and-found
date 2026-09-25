import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeClientMatchScore } from "@/lib/api/matching";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const reporterId = searchParams.get("reporterId");

    let query = supabase
      .from("reports")
      .select("*, reporter:users(id, vit_email, full_name, id_number)")
      .order("created_at", { ascending: false });

    if (type && type !== "all") {
      query = query.eq("type", type);
    }
    if (reporterId) {
      query = query.eq("reporter_id", reporterId);
    }

    const { data: reports, error } = await query;
    if (error) {
      console.error("GET /api/reports query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err: any) {
    console.error("GET /api/reports exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    const {
      reporterId,
      reporterEmail,
      type,
      itemName,
      category,
      description,
      photoUrl,
      location,
      dateTime,
      holdingLocation,
      finderNotes,
      privateSecret,
    } = body;

    if (!itemName || !type || !category) {
      return NextResponse.json({ error: "Missing required report fields" }, { status: 400 });
    }

    // 1. Ensure reporter user exists in public.users
    let validUserId = reporterId;
    if (!validUserId) {
      const email = reporterEmail || "ragini.kengale24@vit.edu";
      const { data: userRecord } = await supabase
        .from("users")
        .select("id")
        .eq("vit_email", email)
        .maybeSingle();

      if (userRecord) {
        validUserId = userRecord.id;
      } else {
        validUserId = "a1111111-1111-1111-1111-111111111111"; // Fallback to primary seed user
      }
    }

    // 2. Insert report into public.reports
    const reportId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "rep-" + Date.now();
    const { data: newReport, error: insertError } = await supabase
      .from("reports")
      .insert({
        id: reportId,
        reporter_id: validUserId,
        type,
        item_name: itemName,
        category,
        description: description || itemName,
        photo_url: photoUrl || null,
        location: location || "Campus Location",
        date_time: dateTime || new Date().toISOString(),
        status: "searching",
        holding_location: holdingLocation || null,
        finder_notes: finderNotes || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting report:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Scan for matching opposite reports in same or related category
    const targetType = type === "lost" ? "found" : "lost";
    const { data: oppositeReports } = await supabase
      .from("reports")
      .select("*")
      .eq("type", targetType)
      .eq("category", category)
      .limit(10);

    let createdMatch = null;
    let createdNotification = null;

    if (oppositeReports && oppositeReports.length > 0) {
      for (const candidate of oppositeReports) {
        // Calculate semantic similarity
        const itemA = itemName.toLowerCase();
        const itemB = candidate.item_name.toLowerCase();
        const descA = (description || "").toLowerCase();
        const descB = (candidate.description || "").toLowerCase();

        // Check token overlap
        const wordsA = new Set([...itemA.split(/\s+/), ...descA.split(/\s+/)].filter((w) => w.length > 2));
        const wordsB = new Set([...itemB.split(/\s+/), ...descB.split(/\s+/)].filter((w) => w.length > 2));
        let common = 0;
        wordsA.forEach((w) => {
          if (wordsB.has(w)) common++;
        });

        const overlapRatio = wordsA.size > 0 ? common / Math.max(wordsA.size, wordsB.size) : 0;
        const textScore = Math.min(1.0, Math.max(0.45, overlapRatio > 0 ? 0.65 + overlapRatio * 0.3 : 0.52));
        const imageScore = photoUrl && candidate.photo_url ? 0.85 : null;

        const matchScore = computeClientMatchScore(textScore, imageScore, true);

        if (matchScore.confidence_score >= 0.40) {
          const lostId = type === "lost" ? reportId : candidate.id;
          const foundId = type === "found" ? reportId : candidate.id;
          const lostOwnerId = type === "lost" ? validUserId : candidate.reporter_id;

          // Insert into public.matches
          const matchId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "match-" + Date.now();
          const { data: matchRecord, error: matchError } = await supabase
            .from("matches")
            .insert({
              id: matchId,
              lost_report_id: lostId,
              found_report_id: foundId,
              confidence_score: matchScore.confidence_score,
              text_score: matchScore.text_score,
              image_score: matchScore.image_score || 0,
              category_score: matchScore.category_score,
              status: "suggested",
            })
            .select()
            .single();

          if (!matchError && matchRecord) {
            createdMatch = matchRecord;

            // Update reports status to 'matched'
            await supabase.from("reports").update({ status: "matched" }).in("id", [lostId, foundId]);

            // Check for an existing unread match notification within recent window (15 mins) to group alerts
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            const { data: recentNotif } = await supabase
              .from("notifications")
              .select("*")
              .eq("user_id", lostOwnerId)
              .eq("type", "match")
              .eq("read", false)
              .gte("created_at", fifteenMinsAgo)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (recentNotif) {
              const currentCount = (recentNotif.data?.count as number) || 1;
              const newCount = currentCount + 1;
              const existingMatchIds = recentNotif.data?.match_ids || (recentNotif.data?.match_id ? [recentNotif.data.match_id] : []);
              
              const { data: updatedNotif } = await supabase
                .from("notifications")
                .update({
                  title: `Multiple Matches Detected (${newCount} Candidates)`,
                  body: `You have ${newCount} potential matches identified across campus for your lost reports.`,
                  data: {
                    ...recentNotif.data,
                    count: newCount,
                    match_ids: [...existingMatchIds, matchId],
                    match_id: matchId,
                  },
                  created_at: new Date().toISOString(),
                })
                .eq("id", recentNotif.id)
                .select()
                .single();

              createdNotification = updatedNotif || recentNotif;
            } else {
              // Insert single new notification for the lost report owner
              const notifId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "notif-" + Date.now();
              const { data: notifRecord } = await supabase
                .from("notifications")
                .insert({
                  id: notifId,
                  user_id: lostOwnerId,
                  type: "match",
                  title: `New Match Detected (${matchScore.approximate_label})`,
                  body: `A candidate for your report "${itemName}" has been identified on campus.`,
                  data: { match_id: matchId, report_id: reportId, count: 1 },
                  read: false,
                })
                .select()
                .single();

              createdNotification = notifRecord;
            }
            break; // Matched candidate
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      report: newReport,
      match: createdMatch,
      notification: createdNotification,
    });
  } catch (err: any) {
    console.error("POST /api/reports exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
