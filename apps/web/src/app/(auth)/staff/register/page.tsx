"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, ArrowRight, AlertCircle, Building2 } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";

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
    // Simulate redeem_admin_invite verification
    setTimeout(() => {
      setIsLoading(false);
      // Save pending admin registration details
      localStorage.setItem(
        "vit_pending_admin",
        JSON.stringify({ fullName, email, department, staffId, status: "pending" })
      );
      router.push("/staff/pending");
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <ShieldCheck className="w-4 h-4" />
          <span>VIT Campus Administration</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 my-6">
        <div className="w-full max-w-lg">
          <Card className="border border-slate-300 dark:border-slate-800 shadow-md">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                <KeyRound className="w-4 h-4" />
                <span>Admin Invite Redemption</span>
              </div>
              <CardTitle className="text-xl font-bold">Register as Staff Administrator</CardTitle>
              <CardDescription>
                Registration requires an authorization invite code issued by an existing approved campus administrator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <Input
                  label="Invite / Access Code"
                  id="inviteCode"
                  type="text"
                  placeholder="e.g. VIT-INV-8F92A1"
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

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold mb-0.5">Authorization Notice</p>
                  <p>
                    Submitting this form creates an account in <strong>Pending Approval</strong> state. Access to the Admin Console is unlocked only after approval by an existing administrator.
                  </p>
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                  <span>Submit for Administrator Approval</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link
                  href="/staff/login"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Already approved? Log in to Staff Console
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
