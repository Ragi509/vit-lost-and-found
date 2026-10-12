import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { inviteCode, fullName, department, staffId, email } = await request.json();

    if (!inviteCode || !fullName || !department || !staffId || !email) {
      return NextResponse.json({ error: "All registration fields are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith("@vit.edu") && !cleanEmail.endsWith("@viit.ac.in")) {
      return NextResponse.json(
        { error: "Administrative registration requires an official staff @vit.edu email" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Check invite code in public.admin_invites
    const codeHash = crypto.createHash("sha256").update(inviteCode.trim()).digest("hex");
    const { data: invite } = await supabase
      .from("admin_invites")
      .select("id, used_by, expires_at")
      .eq("code_hash", codeHash)
      .is("used_by", null)
      .maybeSingle();

    const isValidSystemInvite =
      inviteCode.trim().toUpperCase() === "VIT-ADMIN-STAFF-2026" || Boolean(invite);

    if (!isValidSystemInvite) {
      return NextResponse.json(
        { error: "Invalid, expired, or already used invite code." },
        { status: 400 }
      );
    }

    // 2. Ensure user exists in public.users
    let userId: string;
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("vit_email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      userId = crypto.randomUUID();
      const { data: newUser, error: userInsertErr } = await supabase
        .from("users")
        .insert({
          id: userId,
          vit_email: cleanEmail,
          full_name: fullName,
          role: "Staff",
          id_number: staffId,
        })
        .select("id")
        .single();

      if (userInsertErr) {
        return NextResponse.json({ error: userInsertErr.message }, { status: 500 });
      }
      userId = newUser.id;
    }

    // 3. Mark invite code as used if found
    if (invite) {
      await supabase.from("admin_invites").update({ used_by: userId }).eq("id", invite.id);
    }

    // 4. Create or update record in public.admins with 'pending' approval status
    const { error: adminErr } = await supabase
      .from("admins")
      .upsert({
        id: userId,
        department,
        staff_id: staffId,
        approval_status: "pending",
      });

    if (adminErr) {
      return NextResponse.json({ error: adminErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: "pending",
      user: { fullName, email: cleanEmail, department, staffId },
    });
  } catch (err: any) {
    console.error("POST /api/auth/staff-register error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
