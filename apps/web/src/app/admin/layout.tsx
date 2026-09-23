import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const staffCookie = cookieStore.get("vit_staff_session")?.value;
  const studentCookie = cookieStore.get("vit_session")?.value;

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
    redirect("/staff/login?redirect=/admin/console");
  }

  return <>{children}</>;
}
