"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound, Lock, Building2 } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide your staff email and administrator password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/staff-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Staff authentication failed");
      }

      localStorage.setItem("vit_staff_session", JSON.stringify(data.session));
      localStorage.setItem("vit_session", JSON.stringify(data.session));
      router.push("/admin/console");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate staff session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9FC] dark:bg-slate-950 text-[#202B3C] dark:text-slate-100 transition-colors">
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 py-3.5 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-sm font-bold text-[#202B3C] dark:text-slate-200">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#23395B] to-[#3A7D80] text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
            VIT
          </div>
          <span>Campus Custody & Security Desk</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="space-y-1.5 p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3A7D80] dark:text-teal-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Authorized Security Desk</span>
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100">Staff Console Login</CardTitle>
              <CardDescription className="text-xs text-[#718096]">
                Designated personnel for campus lost property custody, security desks, and claim adjudication.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleStaffLogin} className="space-y-4">
                <Input
                  label="Staff Institutional Email"
                  id="email"
                  type="email"
                  placeholder="security.head@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Administrator Password"
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button type="submit" variant="primary" className="w-full rounded-xl shadow-xs text-sm font-semibold" isLoading={isLoading}>
                  <span>Access Admin Worklist</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  href="/staff/register"
                  className="inline-flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#23395B] dark:hover:text-slate-200 font-medium transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#3A7D80]" />
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
