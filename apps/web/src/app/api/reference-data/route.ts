import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();

    let categories: string[] = [];
    let locations: string[] = [];
    let holdingLocations: string[] = [];

    // 1. Try querying lookup tables first
    try {
      const { data: dbCategories } = await supabase
        .from("categories")
        .select("name")
        .order("sort_order", { ascending: true });

      if (dbCategories && dbCategories.length > 0) {
        categories = dbCategories.map((c: any) => c.name);
      }
    } catch (_) {}

    try {
      const { data: dbLocations } = await supabase
        .from("campus_locations")
        .select("name, is_holding_location")
        .order("sort_order", { ascending: true });

      if (dbLocations && dbLocations.length > 0) {
        locations = dbLocations.filter((l: any) => !l.is_holding_location).map((l: any) => l.name);
        holdingLocations = dbLocations.filter((l: any) => l.is_holding_location).map((l: any) => l.name);
      }
    } catch (_) {}

    // 2. Fetch from app_config if lookup table is empty or pending PostgREST schema cache reload
    if (categories.length === 0) {
      const { data: catConfig } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "campus_categories")
        .maybeSingle();
      if (catConfig?.value) {
        categories = typeof catConfig.value === "string" ? JSON.parse(catConfig.value) : catConfig.value;
      }
    }

    if (locations.length === 0) {
      const { data: locConfig } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "campus_locations")
        .maybeSingle();
      if (locConfig?.value) {
        locations = typeof locConfig.value === "string" ? JSON.parse(locConfig.value) : locConfig.value;
      }
    }

    if (holdingLocations.length === 0) {
      const { data: holdConfig } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "holding_locations")
        .maybeSingle();
      if (holdConfig?.value) {
        holdingLocations = typeof holdConfig.value === "string" ? JSON.parse(holdConfig.value) : holdConfig.value;
      }
    }

    return NextResponse.json({
      categories,
      locations,
      holdingLocations,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
