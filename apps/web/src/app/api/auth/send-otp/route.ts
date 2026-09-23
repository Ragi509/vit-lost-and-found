import { NextResponse } from "next/server";
import { generateAndSendOtp } from "@/lib/auth/otp-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await generateAndSendOtp(cleanEmail);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to dispatch verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      deliveredTo: result.deliveredTo,
      sandboxRelayed: result.sandboxRelayed,
      message: result.sandboxRelayed
        ? `In sandbox mode, verification code was dispatched to ${result.deliveredTo}`
        : `Verification code successfully sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error("POST /api/auth/send-otp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
