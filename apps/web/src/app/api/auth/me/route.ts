import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseSessionCookie } from "@/lib/auth/session-validator";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const studentCookie = cookieStore.get("vit_session")?.value;
  const staffCookie = cookieStore.get("vit_staff_session")?.value;

  const session = parseSessionCookie(studentCookie) || parseSessionCookie(staffCookie);

  if (!session) {
    return NextResponse.json({ authenticated: false, session: null }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, session });
}
