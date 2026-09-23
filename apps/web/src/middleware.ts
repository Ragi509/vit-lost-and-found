import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isSessionValid, isStaffSessionValid } from "@/lib/auth/session-validator";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const staffCookie = request.cookies.get("vit_staff_session")?.value;
  const studentCookie = request.cookies.get("vit_session")?.value;

  const hasStudentAuth = isSessionValid(studentCookie);
  const hasStaffAuth = isStaffSessionValid(staffCookie, studentCookie);
  const isAuthenticated = hasStudentAuth || hasStaffAuth;

  // 1. Staff / Admin Route Protection (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!hasStaffAuth) {
      const loginUrl = new URL("/staff/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Student Protected Routes
  const protectedStudentRoutes = [
    "/dashboard",
    "/report",
    "/matches",
    "/claim",
    "/recovered",
    "/my-reports",
    "/notifications",
    "/profile",
  ];

  const isProtectedStudent = protectedStudentRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isProtectedStudent) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. If already authenticated and visiting /login, redirect to /dashboard (or redirect target)
  if (pathname === "/login") {
    if (isAuthenticated) {
      const redirectTarget = request.nextUrl.searchParams.get("redirect") || "/dashboard";
      return NextResponse.redirect(new URL(redirectTarget, request.url));
    }
  }

  // Pass request headers with x-pathname for server component layouts
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard",
    "/report/:path*",
    "/report",
    "/matches/:path*",
    "/matches",
    "/claim/:path*",
    "/claim",
    "/recovered/:path*",
    "/recovered",
    "/my-reports/:path*",
    "/my-reports",
    "/notifications/:path*",
    "/notifications",
    "/profile/:path*",
    "/profile",
    "/admin/:path*",
    "/admin",
    "/login",
  ],
};
