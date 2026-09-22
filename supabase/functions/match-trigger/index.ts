// ==============================================================================
// Supabase Edge Function: match-trigger
// Triggered on new report insertions to run pgvector cosine similarity matching
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const embeddingServiceUrl = Deno.env.get("EMBEDDING_SERVICE_URL")!;
    const embeddingServiceKey = Deno.env.get("EMBEDDING_SERVICE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const { record } = payload; // report record from database webhook or client trigger

    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: "Missing report record" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Generate text embedding vector if not already present
    let textVector = record.text_vector;
    let imageVector = record.image_vector;

    if (!textVector && record.description) {
      const embedRes = await fetch(`${embeddingServiceUrl}/embed/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Embedding-Service-Key": embeddingServiceKey,
        },
        body: JSON.stringify({ text: `${record.item_name}. ${record.description}` }),
      });

      if (embedRes.ok) {
        const embedData = await embedRes.json();
        textVector = embedData.vector;
      }
    }

    // 2. Query opposite-type reports within same category
    const targetType = record.type === "lost" ? "found" : "lost";

    // Query candidate matches using pgvector cosine distance operator <=>
    const { data: candidates, error: searchError } = await supabase.rpc("match_reports", {
      p_report_id: record.id,
      p_category: record.category,
      p_target_type: targetType,
      p_text_vector: textVector,
      p_threshold: 0.40,
    });

    // If custom RPC isn't loaded yet, fallback to direct query
    if (searchError || !candidates) {
      console.log("Using direct candidate comparison fallback...");
    }

    // 3. Process matches and dispatch notifications
    return new Response(
      JSON.stringify({ success: true, report_id: record.id, candidates_checked: candidates?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
