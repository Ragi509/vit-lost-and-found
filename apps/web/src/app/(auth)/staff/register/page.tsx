"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, ArrowRight, AlertCircle, Building2 } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StaffRegisterPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [department, setDepartment] = useState("");
  const [staffId, setStaffId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode || !department || !staffId || !email || !fullName) {
      setError("All fields are mandatory to request administrative access.");
      return;
    }

    if (!email.toLowerCase().endsWith("@vit.edu") && !email.toLowerCase().endsWith("@viit.ac.in")) {
      setError("Administrative registration requires an official staff @vit.edu email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/staff-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, fullName, department, staffId, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Staff registration failed");
      }

      localStorage.setItem("vit_pending_admin", JSON.stringify(data.user));
      router.push("/staff/pending");
    } catch (err: any) {
      setError(err.message || "Network error occurred while submitting registration");
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
          <span>Campus Administration</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-lg">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="space-y-1.5 p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3A7D80] dark:text-teal-300 uppercase tracking-wider">
                <KeyRound className="w-4 h-4" />
                <span>Admin Invite Redemption</span>
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100">
                Register as Staff Administrator
              </CardTitle>
              <CardDescription className="text-xs text-[#718096]">
                Registration requires an authorization invite code issued by an approved campus administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Invite / Access Code"
                  id="inviteCode"
                  type="text"
                  placeholder="e.g. VIT-ADMIN-STAFF-2026"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    id="fullName"
                    type="text"
                    placeholder="Prof. Rajesh Deshmukh"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <Input
                    label="Staff ID"
                    id="staffId"
                    type="text"
                    placeholder="VIT-STAFF-104"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Department / Unit"
                  id="department"
                  type="text"
                  placeholder="Central Library / Security Gate 1 / Lab Affairs"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                />

                <Input
                  label="Official Institutional Email"
                  id="email"
                  type="email"
                  placeholder="rajesh.deshmukh@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold mb-0.5">Authorization Notice</p>
                  <p className="leading-relaxed">
                    Submitting this form creates an account in <strong>Pending Approval</strong> state. Access to the Admin Console is unlocked only after approval by an existing administrator.
                  </p>
                </div>

                <Button type="submit" variant="primary" className="w-full rounded-xl shadow-xs text-sm font-semibold" isLoading={isLoading}>
                  <span>Submit for Administrator Approval</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/staff/login"
                  className="text-xs font-semibold text-[#718096] hover:text-[#23395B] dark:hover:text-slate-200 transition-colors"
                >
                  Already approved? Log in to Staff Console →
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
