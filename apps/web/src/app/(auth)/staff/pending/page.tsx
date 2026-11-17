"use client";

import React from "react";
import Link from "next/link";
import { Clock, ShieldAlert, ArrowLeft, RefreshCw, Building2 } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function StaffPendingPage() {
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
        <div className="w-full max-w-md text-center">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="flex flex-col items-center space-y-3 p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100">Account Pending Approval</CardTitle>
              <CardDescription className="text-xs text-[#718096]">
                Your staff administrative request has been registered and is currently under review by campus security.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-left text-xs text-[#718096] dark:text-slate-400 space-y-2 border border-slate-200/60 dark:border-slate-800">
                <p className="leading-relaxed">
                  To prevent unauthorized elevated access across campus databases, all staff accounts must be confirmed by an active administrator (e.g. Chief Security Officer or Student Affairs Head).
                </p>
                <p className="leading-relaxed">
                  Once approved, signing in with your staff credentials will direct you straight to the Admin Worklist.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Link href="/staff/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full rounded-xl">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Check Status</span>
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="primary" size="sm" className="w-full rounded-xl shadow-xs">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    <span>Return to Home</span>
                  </Button>
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
