import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/auth/otp-store";
import { parseVitEmail } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

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

    const session = {
      id: "user-" + Math.random().toString(36).substring(2, 9),
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
