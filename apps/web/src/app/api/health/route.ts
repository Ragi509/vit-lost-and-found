import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const tStart = Date.now();
  const checks: Record<string, { status: "healthy" | "degraded" | "unreachable"; latencyMs: number; details?: string }> = {};

  const supabase = createAdminClient();

  // 1. Database Check
  const tDb = Date.now();
  try {
    const { data, error } = await supabase.from("app_config").select("key").limit(1);
    const dbLatency = Date.now() - tDb;
    if (error) {
      checks.database = { status: "degraded", latencyMs: dbLatency, details: error.message };
    } else {
      checks.database = { status: "healthy", latencyMs: dbLatency };
    }
  } catch (err: any) {
    checks.database = { status: "unreachable", latencyMs: Date.now() - tDb, details: err.message };
  }

  // 2. Storage Check (item-photos bucket)
  const tStorage = Date.now();
  try {
    const { data, error } = await supabase.storage.from("item-photos").list("", { limit: 1 });
    const storageLatency = Date.now() - tStorage;
    if (error) {
      checks.storage = { status: "degraded", latencyMs: storageLatency, details: error.message };
    } else {
      checks.storage = { status: "healthy", latencyMs: storageLatency };
    }
  } catch (err: any) {
    checks.storage = { status: "unreachable", latencyMs: Date.now() - tStorage, details: err.message };
  }

  // 3. Realtime Status Check
  const tRealtime = Date.now();
  try {
    const channel = supabase.channel("health_check_ping");
    const realtimeLatency = Date.now() - tRealtime;
    checks.realtime = { status: "healthy", latencyMs: realtimeLatency };
    supabase.removeChannel(channel);
  } catch (err: any) {
    checks.realtime = { status: "degraded", latencyMs: Date.now() - tRealtime, details: err.message };
  }

  // 4. AI Embedding Microservice Check
  const tEmbed = Date.now();
  const embeddingUrl = process.env.EMBEDDING_SERVICE_URL;
  if (!embeddingUrl) {
    checks.embedding_service = {
      status: "degraded",
      latencyMs: 0,
      details: "EMBEDDING_SERVICE_URL not configured",
    };
  } else {
    try {
      const apiKey = process.env.EMBEDDING_SERVICE_API_KEY;
      const res = await fetch(`${embeddingUrl}/health`, {
        method: "GET",
        headers: {
          ...(apiKey ? { "X-Embedding-Service-Key": apiKey } : {}),
        },
        signal: AbortSignal.timeout(5000),
      });
      const embedLatency = Date.now() - tEmbed;
      if (res.ok) {
        checks.embedding_service = { status: "healthy", latencyMs: embedLatency };
      } else {
        checks.embedding_service = {
          status: "degraded",
          latencyMs: embedLatency,
          details: `HTTP ${res.status} (Render service cold starting or idle)`,
        };
      }
    } catch (err: any) {
      checks.embedding_service = {
        status: "unreachable",
        latencyMs: Date.now() - tEmbed,
        details: "Microservice unreachable or cold starting (>5s)",
      };
    }
  }

  const isHealthy =
    checks.database?.status === "healthy" &&
    checks.storage?.status === "healthy" &&
    checks.realtime?.status === "healthy";

  return NextResponse.json({
    status: isHealthy ? "healthy" : "degraded",
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    totalElapsedMs: Date.now() - tStart,
    services: checks,
  });
}
