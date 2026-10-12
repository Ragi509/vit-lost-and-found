import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminPasswordEnv = process.env.ADMIN_PASSWORD;

    if (!adminPasswordEnv) {
      return NextResponse.json(
        { error: "Staff password authentication is not configured in server environment" },
        { status: 500 }
      );
    }

    // 1. Verify password matches configured server environment variable
    if (password !== adminPasswordEnv) {
      return NextResponse.json({ error: "Invalid staff credentials" }, { status: 401 });
    }

    // 2. Verify user exists in public.users and public.admins with approved status
    const supabase = createAdminClient();
    const { data: userRec } = await supabase
      .from("users")
      .select("id, full_name, role, id_number, vit_email")
      .eq("vit_email", cleanEmail)
      .maybeSingle();

    if (!userRec) {
      return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
    }

    const { data: adminRec } = await supabase
      .from("admins")
      .select("id, department, staff_id, approval_status")
      .eq("id", userRec.id)
      .maybeSingle();

    if (!adminRec || adminRec.approval_status !== "approved") {
      return NextResponse.json(
        { error: "Access denied: Account is not an approved staff administrator" },
        { status: 403 }
      );
    }

    const sessionObj = {
      id: userRec.id,
      email: userRec.vit_email,
      fullName: userRec.full_name,
      role: "Staff",
      staffId: adminRec.staff_id || userRec.id_number,
      department: adminRec.department || "Campus Administration",
    };

    const response = NextResponse.json({
      success: true,
      message: "Staff authentication successful",
      session: sessionObj,
    });

    response.cookies.set("vit_staff_session", JSON.stringify(sessionObj), {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("POST /api/auth/staff-login error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
