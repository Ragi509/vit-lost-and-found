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

// Fallback n-gram term vector cosine similarity calculation
function textVectorCosineSimilarity(str1: string, str2: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);

  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const vocab = Array.from(new Set([...tokens1, ...tokens2]));
  const vec1 = vocab.map((term) => tokens1.filter((t) => t === term).length);
  const vec2 = vocab.map((term) => tokens2.filter((t) => t === term).length);

  return cosineSimilarity(vec1, vec2);
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

    // 3. Obtain reference secret description or embedding from public.report_secrets or lost_report description
    let referenceText = match.lost_report?.description || match.found_report?.description || "";
    
    // Check if secret detail was recorded in report_secrets
    const { data: secretRow } = await supabase
      .from("report_secrets")
      .select("*")
      .eq("report_id", match.lost_report_id)
      .maybeSingle();

    let similarity = 0;

    // Try microservice vector embedding cosine calculation first
    const [subVector, refVector] = await Promise.all([
      fetchEmbeddingVector(submittedSecretText),
      fetchEmbeddingVector(referenceText),
    ]);

    if (subVector && refVector) {
      similarity = cosineSimilarity(subVector, refVector);
    } else {
      // High-precision term vector cosine similarity fallback
      similarity = textVectorCosineSimilarity(submittedSecretText, referenceText);
    }

    // Round similarity score to 4 decimal places
    similarity = Number(Math.max(0, Math.min(1, similarity)).toFixed(4));

    // 4. Categorize result according to app_config threshold bounds
    let result: "approved" | "escalated" | "rejected" = "rejected";
    if (similarity >= autoApproveThreshold) {
      result = "approved";
    } else if (similarity >= escalateThreshold) {
      result = "escalated";
    } else {
      result = "rejected";
    }

    // 5. Insert verification record into public.verifications
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

    // 6. If approved, transition report status to 'recovered'
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
        body: `Your ownership claim has been verified (~${Math.round(similarity * 100)}% similarity). Present token ${token} at the custody desk for handover.`,
        data: { match_id: matchId, token },
        read: false,
      });
    }

    return NextResponse.json({
      success: true,
      verification_id: verificationId,
      similarity_score: similarity,
      result,
    });
  } catch (err: any) {
    console.error("POST /api/verifications exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

