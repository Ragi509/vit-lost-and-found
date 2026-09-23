import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/auth/otp-store";

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

    return NextResponse.json({
      success: true,
      message: "Verification successful",
    });
  } catch (err: any) {
    console.error("POST /api/auth/verify-otp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
