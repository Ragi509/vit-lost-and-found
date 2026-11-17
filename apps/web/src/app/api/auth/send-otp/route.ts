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

    if (!cleanEmail.endsWith("@vit.edu") && !cleanEmail.endsWith(".vit.edu")) {
      return NextResponse.json(
        { error: "Only official @vit.edu institutional email addresses are permitted" },
        { status: 400 }
      );
    }
    const result = await generateAndSendOtp(cleanEmail);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to dispatch verification code",
          sandboxBlocked: result.sandboxBlocked || false,
        },
        { status: result.sandboxBlocked ? 403 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      deliveredTo: result.deliveredTo,
      message: `Verification code successfully sent to ${cleanEmail}`,
    });
  } catch (err: any) {
    console.error("POST /api/auth/send-otp error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
