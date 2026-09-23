import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const embeddingUrl = process.env.EMBEDDING_SERVICE_URL || "https://vit-lost-found-embeddings.onrender.com";
  const apiKey = process.env.EMBEDDING_SERVICE_API_KEY || "vit_sec_embed_live_948fbc2a10e7b4382c7";

  const t0 = Date.now();
  try {
    const res = await fetch(`${embeddingUrl}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(15000),
    });

    const elapsed = Date.now() - t0;
    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      status: "ok",
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
