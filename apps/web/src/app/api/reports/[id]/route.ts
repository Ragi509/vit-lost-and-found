import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function fetchEmbeddingVector(text: string): Promise<number[] | null> {
  const serviceUrl = process.env.EMBEDDING_SERVICE_URL;
  const apiKey = process.env.EMBEDDING_SERVICE_API_KEY;
  if (!serviceUrl) return null;

  try {
    const res = await fetch(`${serviceUrl}/embed/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-Embedding-Service-Key": apiKey } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.vector)) return data.vector;
      if (Array.isArray(data.embedding)) return data.embedding;
    }
  } catch (e) {
    console.warn("Embedding service lookup notice:", e);
  }
  return null;
}

// Helper to resolve the authenticated user ID from request headers/cookies/params
async function resolveAuthUser(request: Request, supabase: any): Promise<{ id: string; email?: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/vit_session=([^;]+)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed.id && /^[0-9a-f-]{36}$/i.test(parsed.id)) {
        return { id: parsed.id, email: parsed.email };
      }
      if (parsed.email) {
        const { data: uRec } = await supabase
          .from("users")
          .select("id, vit_email")
          .eq("vit_email", parsed.email.trim().toLowerCase())
          .maybeSingle();
        if (uRec) return { id: uRec.id, email: uRec.vit_email };
      }
    } catch (_) {}
  }

  // Header authorization fallback
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) return { id: user.id, email: user.email };
    } catch (_) {}
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { id } = params;

    const { data: report, error } = await supabase
      .from("reports")
      .select("*, reporter:users(id, vit_email, full_name, id_number)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (err: any) {
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
    const body = await request.json();

    const authUser = await resolveAuthUser(request, supabase);
    const resolvedUserId = body.reporterId || body.userId || authUser?.id;

    // 1. Fetch current report
    const { data: existingReport, error: fetchErr } = await supabase
      .from("reports")
      .select("*, reporter:users(id, vit_email)")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Ownership check (supports ID, user email match, and admin role)
    const matchesOwnerId = Boolean(resolvedUserId && existingReport.reporter_id === resolvedUserId);
    const matchesOwnerEmail = Boolean(
      (authUser?.email && existingReport.reporter?.vit_email?.toLowerCase() === authUser.email.toLowerCase()) ||
      (body.reporterEmail && existingReport.reporter?.vit_email?.toLowerCase() === body.reporterEmail.trim().toLowerCase())
    );

    if (!matchesOwnerId && !matchesOwnerEmail) {
      // Check if admin
      const { data: adminRec } = await supabase
        .from("admins")
        .select("id")
        .eq("id", resolvedUserId || "")
        .eq("approval_status", "approved")
        .maybeSingle();

      if (!adminRec) {
        return NextResponse.json(
          { error: "Forbidden: You do not own this report" },
          { status: 403 }
        );
      }
    }

    // 3. Status guard: only allowed while status is 'searching' or 'matched' (before verification/recovery)
    if (existingReport.status !== "searching" && existingReport.status !== "matched") {
      return NextResponse.json(
        {
          error: `Editing locked: This report is currently '${existingReport.status}'. Editing is only permitted before claim verification or recovery.`,
        },
        { status: 409 }
      );
    }

    // 4. Verification and escalation checks
    // Check if any match for this report has an active pending verification claim
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`);

    if (matches && matches.length > 0) {
      const matchIds = matches.map((m: any) => m.id);
      const { data: verifs } = await supabase
        .from("verifications")
        .select("id, result")
        .in("match_id", matchIds);

      // Only block if a verification claim is actively pending
      const pendingVerif = verifs?.find((v: any) => v.result === "pending");
      if (pendingVerif) {
        return NextResponse.json(
          { error: "Editing locked: A verification claim is actively pending review." },
          { status: 409 }
        );
      }
    }

    // Check escalations
    const { data: escalations } = await supabase
      .from("escalations")
      .select("id, status")
      .eq("report_id", id);

    const activeEsc = escalations?.find((e: any) => e.status === "pending" || e.status === "reviewing");
    if (activeEsc) {
      return NextResponse.json(
        { error: "Editing locked: This report has an active campus security review in progress." },
        { status: 409 }
      );
    }

    // 5. Optimistic concurrency check (with 3-second skew tolerance)
    const clientUpdatedAt = body.updatedAt || body.updated_at;
    if (clientUpdatedAt && existingReport.updated_at) {
      const dbTime = new Date(existingReport.updated_at).getTime();
      const clientTime = new Date(clientUpdatedAt).getTime();
      if (dbTime - clientTime > 3000) {
        return NextResponse.json(
          { error: "Conflict: This report was modified in another session. Please reload." },
          { status: 409 }
        );
      }
    }

    // 6. Build update payload
    const updatePayload: Record<string, any> = {};
    if (body.itemName !== undefined) updatePayload.item_name = body.itemName;
    if (body.category !== undefined) updatePayload.category = body.category;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.location !== undefined) updatePayload.location = body.location;
    if (body.dateTime !== undefined) updatePayload.date_time = body.dateTime;
    if (body.photoUrl !== undefined) updatePayload.photo_url = body.photoUrl;
    if (body.holdingLocation !== undefined) updatePayload.holding_location = body.holdingLocation;
    if (body.finderNotes !== undefined) updatePayload.finder_notes = body.finderNotes;

    // Handle photo bucket & path
    if (body.photoBucket !== undefined) updatePayload.photo_bucket = body.photoBucket;
    if (body.photoPath !== undefined) updatePayload.photo_path = body.photoPath;

    // Regenerate text embedding if item details changed
    if (body.itemName !== undefined || body.category !== undefined || body.description !== undefined) {
      const updatedName = body.itemName !== undefined ? body.itemName : existingReport.item_name;
      const updatedDesc = body.description !== undefined ? body.description : existingReport.description;
      const textToEmbed = `${updatedName}. ${updatedDesc || ""}`;
      const newVector = await fetchEmbeddingVector(textToEmbed);
      if (newVector) {
        updatePayload.text_vector = newVector;
      }
    }

    // Set updated_at
    const nowIso = new Date().toISOString();
    updatePayload.updated_at = nowIso;

    // Build known safe payload containing strictly existing database columns
    const safePayload: Record<string, any> = {};
    if (updatePayload.item_name !== undefined) safePayload.item_name = updatePayload.item_name;
    if (updatePayload.category !== undefined) safePayload.category = updatePayload.category;
    if (updatePayload.description !== undefined) safePayload.description = updatePayload.description;
    if (updatePayload.location !== undefined) safePayload.location = updatePayload.location;
    if (updatePayload.date_time !== undefined) safePayload.date_time = updatePayload.date_time;
    if (updatePayload.photo_url !== undefined) safePayload.photo_url = updatePayload.photo_url;
    if (updatePayload.holding_location !== undefined) safePayload.holding_location = updatePayload.holding_location;
    if (updatePayload.finder_notes !== undefined) safePayload.finder_notes = updatePayload.finder_notes;
    if (updatePayload.text_vector !== undefined) safePayload.text_vector = updatePayload.text_vector;

    // Attempt update with full payload
    let { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    // Fallback: If non-core columns (photo_bucket, photo_path, updated_at) are rejected by schema cache, retry with safePayload
    if (updateError && (updateError.message?.includes("schema cache") || updateError.message?.includes("column"))) {
      const retry = await supabase
        .from("reports")
        .update(safePayload)
        .eq("id", id)
        .select()
        .maybeSingle();
      updatedReport = retry.data;
      updateError = retry.error;
    }

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      report: updatedReport || { ...existingReport, ...safePayload, updated_at: nowIso },
    });

    // 7. Update private secret if provided
    if (body.privateSecret && existingReport.type === "lost") {
      try {
        const passphrase = process.env.REPORT_SECRET_PASSPHRASE || "vit_lost_and_found_sec_key_2026";
        const cipher = crypto.createCipheriv(
          "aes-256-cbc",
          crypto.scryptSync(passphrase, "salt", 32),
          Buffer.alloc(16, 0)
        );
        let encrypted = cipher.update(body.privateSecret, "utf8", "hex");
        encrypted += cipher.final("hex");

        await supabase.from("report_secrets").upsert({
          report_id: id,
          encrypted_distinguishing_detail: `\\x${encrypted}`,
          created_at: nowIso,
        });
      } catch (secErr) {
        console.warn("Secret update notice:", secErr);
      }
    }

    return NextResponse.json({
      success: true,
      report: updatedReport || { ...existingReport, ...updatePayload },
    });
  } catch (err: any) {
    console.error("PATCH /api/reports/[id] exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    const { id } = params;

    const authUser = await resolveAuthUser(request, supabase);
    const { searchParams } = new URL(request.url);
    const resolvedUserId = searchParams.get("userId") || searchParams.get("reporterId") || authUser?.id;

    // 1. Fetch current report
    const { data: existingReport, error: fetchErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existingReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // 2. Ownership check
    if (resolvedUserId && existingReport.reporter_id !== resolvedUserId) {
      const { data: adminRec } = await supabase
        .from("admins")
        .select("id")
        .eq("id", resolvedUserId)
        .eq("approval_status", "approved")
        .maybeSingle();

      if (!adminRec) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to delete this report" },
          { status: 403 }
        );
      }
    }

    // 3. Status check: cannot delete if recovered
    if (existingReport.status === "recovered") {
      return NextResponse.json(
        { error: "Cannot delete: This report is marked as recovered and archived for institutional audit." },
        { status: 409 }
      );
    }

    // 4. Check for active verifications or escalations
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`);

    if (matches && matches.length > 0) {
      const matchIds = matches.map((m: any) => m.id);
      const { data: verifs } = await supabase
        .from("verifications")
        .select("id")
        .in("match_id", matchIds)
        .limit(1);

      if (verifs && verifs.length > 0) {
        return NextResponse.json(
          { error: "Cannot delete: A verification claim is actively pending review." },
          { status: 409 }
        );
      }
    }

    const { data: escalations } = await supabase
      .from("escalations")
      .select("id")
      .eq("report_id", id)
      .limit(1);

    if (escalations && escalations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete: This report has an open security desk escalation." },
        { status: 409 }
      );
    }

    // 5. Cleanup storage photos
    try {
      const bucket = existingReport.photo_bucket || (existingReport.type === "lost" ? "lost-item-photos" : "found-item-photos");
      const pathsToRemove: string[] = [];
      if (existingReport.photo_path) pathsToRemove.push(existingReport.photo_path);
      pathsToRemove.push(`${existingReport.reporter_id}/${id}/photo.jpg`);
      await supabase.storage.from(bucket).remove(pathsToRemove);
      // Also try legacy bucket
      await supabase.storage.from("item-photos").remove([`${id}/photo.jpg`]);
    } catch (stErr) {
      console.warn("Storage deletion warning:", stErr);
    }

    // 6. Delete report_secrets
    await supabase.from("report_secrets").delete().eq("report_id", id);

    // 7. Delete matches involving this report
    await supabase
      .from("matches")
      .delete()
      .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`);

    // 8. Delete report row and verify affected count
    const { data: deletedRows, error: deleteError } = await supabase
      .from("reports")
      .delete()
      .eq("id", id)
      .select();

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedRows || deletedRows.length === 0) {
      return NextResponse.json({ error: "Failed to delete: Report not found or already removed." }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: id });
  } catch (err: any) {
    console.error("DELETE /api/reports/[id] exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
