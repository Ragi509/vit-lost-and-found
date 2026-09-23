import { createAdminClient } from "@/lib/supabase/server";

interface StoredOtp {
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory cache for fast verification across requests
const otpMemoryCache = new Map<string, StoredOtp>();

export async function generateAndSendOtp(
  email: string
): Promise<{ success: boolean; error?: string; messageId?: string; deliveredTo?: string; sandboxRelayed?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const resendApiKey = process.env.RESEND_API_KEY;

  // Generate 6-digit random code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in memory
  otpMemoryCache.set(cleanEmail, {
    code,
    expiresAt,
    attempts: 0,
  });

  // Also backup to Supabase app_config if available
  try {
    const supabase = createAdminClient();
    await supabase.from("app_config").upsert({
      key: `otp_${cleanEmail}`,
      value: { code, expires_at: expiresAt },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not backup OTP to Supabase app_config:", err);
  }

  // If no Resend API key is provided yet, return clear indication
  if (!resendApiKey) {
    return {
      success: false,
      error: "RESEND_API_KEY is not configured yet in the environment.",
    };
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "VIT Lost & Found <onboarding@resend.dev>";

  // Send real email via Resend API
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [cleanEmail],
        subject: `Your VIT Lost & Found Verification Code: ${code}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="display: flex; align-items: center; margin-bottom: 24px;">
              <div style="background: #0d9488; color: #ffffff; width: 36px; height: 36px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; margin-right: 12px; text-align: center; line-height: 36px;">
                VIT
              </div>
              <div>
                <h2 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 700;">Lost &amp; Found Portal</h2>
                <p style="margin: 0; font-size: 12px; color: #64748b;">Vishwakarma Institute of Technology, Pune</p>
              </div>
            </div>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
              Use the single-use verification code below to complete your login to the VIT Lost &amp; Found platform:
            </p>

            <div style="background: #f8fafc; border: 2px dashed #0d9488; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                ${code}
              </span>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 8px;">
              ⏰ This code is valid for <strong>10 minutes</strong> and can only be used once.
            </p>
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">
              If you did not request this login code, you can safely disregard this email.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      // Check if Resend free-tier sandbox restriction to registered account email
      if (res.status === 403 && data.message?.includes("You can only send testing emails to your own email address")) {
        const match = data.message.match(/\(([^)]+)\)/);
        const registeredEmail = match ? match[1] : "raginikengale@gmail.com";
        console.log(`Resend sandbox: delivering OTP for ${cleanEmail} to registered inbox ${registeredEmail}`);

        const fallbackRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "VIT Lost & Found <onboarding@resend.dev>",
            to: [registeredEmail],
            subject: `[VIT Portal] Verification Code for ${cleanEmail}: ${code}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                  <div style="background: #0d9488; color: #ffffff; width: 34px; height: 34px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px; margin-right: 12px; text-align: center; line-height: 34px;">
                    VIT
                  </div>
                  <div>
                    <h2 style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 700;">Lost &amp; Found Portal</h2>
                    <p style="margin: 0; font-size: 12px; color: #64748b;">Vishwakarma Institute of Technology, Pune</p>
                  </div>
                </div>

                <div style="padding: 10px 14px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 18px; font-size: 12px; color: #1e40af;">
                  <strong>Resend Sandbox Delivery:</strong> Delivered to your verified Resend account (<code>${registeredEmail}</code>) for requested student address <code>${cleanEmail}</code>.
                </div>

                <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 20px;">
                  Your single-use login verification code is:
                </p>

                <div style="background: #f8fafc; border: 2px dashed #0d9488; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 20px;">
                  <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">
                    ${code}
                  </span>
                </div>

                <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-bottom: 0;">
                  ⏰ Valid for <strong>10 minutes</strong>. Single-use only.
                </p>
              </div>
            `,
          }),
        });

        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          return {
            success: true,
            messageId: fallbackData.id,
            deliveredTo: registeredEmail,
            sandboxRelayed: true,
          };
        }
      }

      console.error("Resend API error:", data);
      return { success: false, error: data.message || "Failed to send email via Resend" };
    }

    return { success: true, messageId: data.id, deliveredTo: cleanEmail };
  } catch (err: any) {
    console.error("Resend fetch exception:", err);
    return { success: false, error: err.message };
  }
}

export async function verifyOtpCode(email: string, inputCode: string): Promise<{ valid: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  // 1. Check in-memory cache
  const cached = otpMemoryCache.get(cleanEmail);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      otpMemoryCache.delete(cleanEmail);
      return { valid: false, error: "OTP code has expired. Please request a new one." };
    }
    if (cached.code === cleanCode) {
      otpMemoryCache.delete(cleanEmail);
      return { valid: true };
    }
    cached.attempts++;
    if (cached.attempts >= 5) {
      otpMemoryCache.delete(cleanEmail);
      return { valid: false, error: "Too many failed attempts. Please request a new code." };
    }
    return { valid: false, error: "Invalid verification code. Please check and try again." };
  }

  // 2. Check Supabase app_config fallback
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("app_config").select("value").eq("key", `otp_${cleanEmail}`).maybeSingle();
    if (data && data.value) {
      const { code, expires_at } = data.value as any;
      if (Date.now() > expires_at) {
        return { valid: false, error: "OTP code has expired. Please request a new one." };
      }
      if (code === cleanCode) {
        // Clean up
        await supabase.from("app_config").delete().eq("key", `otp_${cleanEmail}`);
        return { valid: true };
      }
    }
  } catch (err) {
    console.warn("Error checking Supabase OTP:", err);
  }

  return { valid: false, error: "No active verification code found for this email." };
}
