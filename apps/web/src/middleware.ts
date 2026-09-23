import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Staff / Admin Route Protection (/admin/*)
  if (pathname.startsWith("/admin")) {
    const staffCookie = request.cookies.get("vit_staff_session")?.value;
    const studentCookie = request.cookies.get("vit_session")?.value;

    let hasStaffAuth = false;
    if (staffCookie) {
      try {
        const decoded = decodeURIComponent(staffCookie);
        const staff = JSON.parse(decoded);
        if (staff.email && (staff.staffId || staff.role === "Staff" || staff.role === "Admin")) {
          hasStaffAuth = true;
        }
      } catch (e) {
        if (staffCookie.length > 5) hasStaffAuth = true;
      }
    }

    if (!hasStaffAuth && studentCookie) {
      try {
        const decoded = decodeURIComponent(studentCookie);
        const user = JSON.parse(decoded);
        if (user.role === "Staff" || user.role === "Admin") {
          hasStaffAuth = true;
        }
      } catch (e) {}
    }

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
    const studentCookie = request.cookies.get("vit_session")?.value;
    let isAuthenticated = false;

    if (studentCookie) {
      try {
        const decoded = decodeURIComponent(studentCookie);
        const session = JSON.parse(decoded);
        if (session.id && session.email && session.email.endsWith("@vit.edu")) {
          isAuthenticated = true;
        }
      } catch (e) {
        if (studentCookie.length > 5) isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
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
    "/report/:path*",
    "/matches/:path*",
    "/claim/:path*",
    "/recovered/:path*",
    "/my-reports/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
