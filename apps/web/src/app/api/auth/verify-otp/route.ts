import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/auth/otp-store";
import { parseVitEmail } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function emailToUuid(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, "0");
  const hex3 = Math.abs(hash * 17).toString(16).padStart(8, "0");
  const hex4 = Math.abs(hash * 13).toString(16).padStart(8, "0");
  return `${hex}-${hex2.slice(0, 4)}-4${hex3.slice(0, 3)}-a${hex4.slice(0, 3)}-${hex.slice(0, 4)}${hex2.slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const result = await verifyOtpCode(email, code);

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const parsed = parseVitEmail(cleanEmail);

    // Resolve or provision real UUID from public.users table
    let userId = emailToUuid(cleanEmail);
    try {
      const supabase = createAdminClient();
      const { data: userRec } = await supabase
        .from("users")
        .select("id")
        .eq("vit_email", cleanEmail)
        .maybeSingle();

      if (userRec?.id) {
        userId = userRec.id;
      } else {
        const { data: newUser } = await supabase
          .from("users")
          .insert({
            vit_email: cleanEmail,
            full_name: parsed.fullName,
            role: parsed.role,
            id_number: parsed.prn,
          })
          .select("id")
          .single();
        if (newUser?.id) {
          userId = newUser.id;
        }
      }
    } catch (dbErr) {
      console.warn("User lookup in verify-otp notice:", dbErr);
    }

    const session = {
      id: userId,
      email: cleanEmail,
      fullName: parsed.fullName,
      role: parsed.role,
      prn: parsed.prn,
      department: "Department of Electronics Engineering",
      campus: "Bibwewadi Main Campus, Pune",
    };

    const response = NextResponse.json({
      success: true,
      message: "Verification successful",
      session,
    });

    // Set HTTP session cookie for server middleware authentication
    response.cookies.set("vit_session", JSON.stringify(session), {
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("POST /api/auth/verify-otp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
