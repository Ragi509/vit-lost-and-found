// ==============================================================================
// Supabase Edge Function: fcm-push
// Delivers Firebase Cloud Messaging (FCM) push alerts on confidence-threshold match
// ==============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const fcmServerKey = Deno.env.get("FIREBASE_SERVER_KEY") || Deno.env.get("FIREBASE_PRIVATE_KEY");
    const payload = await req.json();
    const { token, title, body, data } = payload;

    if (!token || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing token, title, or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!fcmServerKey) {
      console.warn("FCM Server Key not configured. Logging payload for development:", { title, body, data });
      return new Response(
        JSON.stringify({ success: false, message: "FCM credentials not configured on backend" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Dispatch FCM HTTP v1 / legacy message
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          icon: "/icon-192.png",
          click_action: "/dashboard",
        },
        data: data || {},
      }),
    });

    const fcmResult = await fcmResponse.json();

    return new Response(JSON.stringify({ success: true, result: fcmResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
