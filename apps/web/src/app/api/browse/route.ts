import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function resolveAuthUserId(request: Request, supabase: any): Promise<string | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/vit_session=([^;]+)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed.id && /^[0-9a-f-]{36}$/i.test(parsed.id)) {
        return parsed.id;
      }
      if (parsed.email) {
        const { data: uRec } = await supabase
          .from("users")
          .select("id")
          .eq("vit_email", parsed.email.trim().toLowerCase())
          .maybeSingle();
        if (uRec) return uRec.id;
      }
    } catch (_) {}
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
      if (user) return user.id;
    } catch (_) {}
  }

  const { searchParams } = new URL(request.url);
  const paramId = searchParams.get("userId") || searchParams.get("reporterId");
  if (paramId && /^[0-9a-f-]{36}$/i.test(paramId)) {
    return paramId;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    const currentUserId = await resolveAuthUserId(request, supabase);

    if (!currentUserId) {
      return NextResponse.json(
        { error: "Unauthorized: Campus browse is available to authenticated VIT members only." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "found"; // Default to found items so owners can find their items
    const category = searchParams.get("category");
    const location = searchParams.get("location");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Build query selecting strictly SAFE fields
    // MUST NOT return reporter_id, reporter name/email, private details, finder notes, embeddings, or holding location!
    let query = supabase
      .from("reports")
      .select("id, type, item_name, category, description, location, date_time, status, photo_url, created_at, reporter_id")
      .in("status", ["searching", "matched"])
      .order("created_at", { ascending: false });

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    if (category && category !== "All Categories" && category !== "all") {
      query = query.eq("category", category);
    }

    if (location && location !== "All Locations" && location !== "all") {
      query = query.ilike("location", `%${location}%`);
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query = query.or(`item_name.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: reports, error } = await query;

    if (error) {
      console.error("GET /api/browse error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for private photos where appropriate and project strictly safe columns
    const safeItems = await Promise.all(
      (reports || []).map(async (r: any) => {
        let signedPhotoUrl = r.photo_url;

        // If photo exists in the new private buckets, generate a 60-minute signed URL
        const bucket = r.type === "lost" ? "lost-item-photos" : "found-item-photos";
        const path = `${r.reporter_id}/${r.id}/photo.jpg`;

        try {
          const { data: signedData } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);
          if (signedData?.signedUrl) {
            signedPhotoUrl = signedData.signedUrl;
          }
        } catch (_) {}

        return {
          id: r.id,
          type: r.type,
          name: r.item_name,
          item_name: r.item_name,
          category: r.category,
          description: r.description,
          location: r.location,
          date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Recent",
          date_time: r.date_time,
          status: r.status,
          photoUrl: signedPhotoUrl,
          photo_url: signedPhotoUrl,
          created_at: r.created_at,
          is_own: r.reporter_id === currentUserId,
        };
      })
    );

    return NextResponse.json({
      items: safeItems,
      page,
      pageSize,
      total: safeItems.length,
    });
  } catch (err: any) {
    console.error("GET /api/browse exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
