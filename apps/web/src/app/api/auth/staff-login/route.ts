import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Verify user exists in public.users
    const { data: userRec } = await supabase
      .from("users")
      .select("id, full_name, role, id_number, vit_email")
      .eq("vit_email", cleanEmail)
      .maybeSingle();

    if (!userRec) {
      return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
    }

    // 2. Reject students attempting staff login with explicit informative error
    if (userRec.role === "Student") {
      return NextResponse.json(
        { error: "Access denied: Student accounts must log in via the Student OTP portal." },
        { status: 403 }
      );
    }

    // 3. Verify user exists in public.admins and has approved status
    const { data: adminRec } = await supabase
      .from("admins")
      .select("id, department, staff_id, approval_status")
      .eq("id", userRec.id)
      .maybeSingle();

    if (!adminRec) {
      return NextResponse.json(
        { error: "Access denied: Account is not enrolled in the campus staff administration registry." },
        { status: 403 }
      );
    }

    if (adminRec.approval_status === "pending") {
      return NextResponse.json(
        { error: "Access denied: Staff administrator application is pending approval by Campus Security." },
        { status: 403 }
      );
    }

    if (adminRec.approval_status !== "approved") {
      return NextResponse.json(
        { error: `Access denied: Staff account status is '${adminRec.approval_status}'. Access restricted.` },
        { status: 403 }
      );
    }

    // 4. Verify password against server environment configuration
    const adminPasswordEnv = process.env.ADMIN_PASSWORD;

    if (!adminPasswordEnv) {
      return NextResponse.json(
        { error: "Staff password authentication is not configured in server environment" },
        { status: 500 }
      );
    }

    if (password !== adminPasswordEnv) {
      return NextResponse.json({ error: "Invalid staff credentials. Please check your password." }, { status: 401 });
    }

    const sessionObj = {
      id: userRec.id,
      email: userRec.vit_email,
      fullName: userRec.full_name,
      role: "Staff",
      staffId: adminRec.staff_id || userRec.id_number,
      department: adminRec.department || "Campus Security & Facilities",
    };

    const response = NextResponse.json({
      success: true,
      message: "Staff authentication successful",
      session: sessionObj,
    });

    // Set staff session cookie
    response.cookies.set("vit_staff_session", JSON.stringify(sessionObj), {
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax",
    });

    // Also set vit_session cookie so any generic auth gate detects staff role
    response.cookies.set("vit_session", JSON.stringify(sessionObj), {
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
