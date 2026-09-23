"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !staffId) {
      setError("Please provide your staff email and employee ID.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const sessionObj = { email, staffId, role: "Staff" };
      localStorage.setItem("vit_staff_session", JSON.stringify(sessionObj));
      document.cookie = `vit_staff_session=${encodeURIComponent(JSON.stringify(sessionObj))}; path=/; max-age=604800; SameSite=Lax`;
      router.push("/admin/console");
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4" />
          <span>VIT Campus Administration</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Card className="border border-slate-300 dark:border-slate-800 shadow-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                <span>Staff & Security Portal</span>
              </div>
              <CardTitle className="text-xl font-bold">Staff Console Login</CardTitle>
              <CardDescription>
                Authorized personnel for campus lost property custody, security desks, and claim adjudication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <Input
                  label="Staff Institutional Email"
                  id="email"
                  type="email"
                  placeholder="staff.name@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Staff ID / PRN Number"
                  id="staffId"
                  type="text"
                  placeholder="VIT-STAFF-001"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  <span>Access Admin Worklist</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <Link
                  href="/staff/register"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Have an Admin Invite Code? Register here</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
