import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Compute cosine similarity between two numeric vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Fetch vector embedding for text from microservice
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
      if (Array.isArray(data.embedding)) {
        return data.embedding;
      }
    }
  } catch (e) {
    console.warn("Embedding service lookup notice:", e);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { matchId, claimantId, submittedSecretText } = body;

    if (!matchId || !submittedSecretText) {
      return NextResponse.json({ error: "Missing required verification parameters" }, { status: 400 });
    }

    // 1. Fetch match record and associated reports
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*, lost_report:reports!matches_lost_report_id_fkey(*), found_report:reports!matches_found_report_id_fkey(*)")
      .eq("id", matchId)
      .maybeSingle();

    if (matchError || !match) {
      return NextResponse.json({ error: "Match record not found" }, { status: 404 });
    }

    // 2. Fetch configurable thresholds from app_config
    let autoApproveThreshold = 0.80;
    let escalateThreshold = 0.50;

    const { data: configRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "verification_thresholds")
      .maybeSingle();

    if (configRow?.value) {
      const thresholds = typeof configRow.value === "string" ? JSON.parse(configRow.value) : configRow.value;
      if (thresholds.auto_approve !== undefined) autoApproveThreshold = Number(thresholds.auto_approve);
      if (thresholds.escalate_to_admin !== undefined) escalateThreshold = Number(thresholds.escalate_to_admin);
    }

    // 3. Obtain reference secret description or embedding from lost_report / found_report
    let referenceText = match.lost_report?.description || match.found_report?.description || "";

    let similarity = 0;
    let comparisonMethod = "microservice_vector_embedding";
    let result: "approved" | "escalated" | "rejected" = "rejected";

    // Call microservice vector embedding cosine calculation
    const [subVector, refVector] = await Promise.all([
      fetchEmbeddingVector(submittedSecretText),
      fetchEmbeddingVector(referenceText),
    ]);

    if (subVector && refVector) {
      similarity = cosineSimilarity(subVector, refVector);
      similarity = Number(Math.max(0, Math.min(1, similarity)).toFixed(4));
      comparisonMethod = "microservice_vector_embedding";

      if (similarity >= autoApproveThreshold) {
        result = "approved";
      } else if (similarity >= escalateThreshold) {
        result = "escalated";
      } else {
        result = "rejected";
      }
    } else {
      // Microservice unreachable/offline: Route attempt directly to Admin Escalation Queue
      comparisonMethod = "microservice_unreachable_escalated";
      similarity = 0.50;
      result = "escalated";

      // Auto-escalate lost report to admin security queue if microservice is offline
      if (match.lost_report_id) {
        const { data: storedConfig } = await supabase
          .from("app_config")
          .select("value")
          .eq("key", "escalations_store")
          .maybeSingle();

        let storedEscs: any[] = [];
        if (storedConfig?.value) {
          try {
            storedEscs = typeof storedConfig.value === "string" ? JSON.parse(storedConfig.value) : storedConfig.value;
          } catch (e) {}
        }

        const existingEsc = storedEscs.find((e: any) => e.report_id === match.lost_report_id);
        if (!existingEsc) {
          const autoEsc = {
            id: "esc-" + Math.random().toString(36).substring(2, 10),
            report_id: match.lost_report_id,
            requested_by: match.lost_report?.reporter_id || claimantId,
            status: "pending",
            admin_notes: "Auto-escalated to Security Desk: Embedding microservice was unreachable during verification attempt.",
            reviewed_by_admin_id: null,
            created_at: new Date().toISOString(),
            resolved_at: null,
          };
          storedEscs.push(autoEsc);
          await supabase.from("app_config").upsert({ key: "escalations_store", value: JSON.stringify(storedEscs) });
        }
      }
    }

    // 4. Insert verification record into public.verifications
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validClaimantId = claimantId && isUuid.test(claimantId) ? claimantId : match.lost_report?.reporter_id || "a1111111-1111-1111-1111-111111111111";

    const { data: verifRow, error: insertError } = await supabase
      .from("verifications")
      .insert({
        match_id: matchId,
        claimant_id: validClaimantId,
        similarity_score: similarity,
        result,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting verification record:", insertError);
    }
    const verificationId = verifRow?.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "verif-id");

    console.log(`[VERIFICATION AUDIT LOG] ID: ${verificationId} | Result: ${result} | Score: ${similarity} | Method: ${comparisonMethod}`);

    // 5. If approved, transition report status to 'recovered'
    if (result === "approved") {
      if (match?.lost_report_id && match?.found_report_id) {
        await supabase
          .from("reports")
          .update({ status: "recovered" })
          .in("id", [match.lost_report_id, match.found_report_id]);
      }

      await supabase.from("matches").update({ status: "claimed" }).eq("id", matchId);

      // Create notification for claimant with handover token
      const token = "VIT-REC-" + Math.floor(10000 + Math.random() * 90000);
      await supabase.from("notifications").insert({
        user_id: validClaimantId,
        type: "verification",
        title: "Ownership Proof Verified — Ready for Pickup",
        body: `Your ownership claim has been verified (~${Math.round(similarity * 100)}% vector similarity). Present token ${token} at the custody desk for handover.`,
        data: { match_id: matchId, token, comparison_method: comparisonMethod },
        read: false,
      });
    }

    return NextResponse.json({
      success: true,
      verification_id: verificationId,
      similarity_score: similarity,
      result,
      comparison_method: comparisonMethod,
    });
  } catch (err: any) {
    console.error("POST /api/verifications exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
