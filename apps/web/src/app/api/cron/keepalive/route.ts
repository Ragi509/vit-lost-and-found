import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const embeddingUrl = process.env.EMBEDDING_SERVICE_URL;
  const apiKey = process.env.EMBEDDING_SERVICE_API_KEY;

  if (!embeddingUrl) {
    return NextResponse.json(
      { status: "error", error: "EMBEDDING_SERVICE_URL environment variable is not configured" },
      { status: 500 }
    );
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`${embeddingUrl}/health`, {
      method: "GET",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, "X-Embedding-Service-Key": apiKey } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });

    const elapsed = Date.now() - t0;
    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      status: res.ok ? "ok" : "degraded",
      target: embeddingUrl,
      httpStatus: res.status,
      elapsedMs: elapsed,
      response: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const elapsed = Date.now() - t0;
    console.warn("Embedding keepalive ping error:", err.message);
    return NextResponse.json(
      {
        status: "error",
        target: embeddingUrl,
        elapsedMs: elapsed,
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
