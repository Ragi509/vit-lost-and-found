import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = headers();
  const pathname = headerList.get("x-pathname") || "";

  // /browse is the public campus directory — all other dashboard routes require valid student session
  if (pathname && pathname !== "/browse" && !pathname.startsWith("/browse")) {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get("vit_session");
    let isAuthenticated = false;

    if (sessionCookie?.value) {
      try {
        const decoded = decodeURIComponent(sessionCookie.value);
        const session = JSON.parse(decoded);
        if (session.id && session.email && session.email.endsWith("@vit.edu")) {
          isAuthenticated = true;
        }
      } catch (e) {
        if (sessionCookie.value.length > 5) isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
