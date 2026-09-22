"use client";

import React from "react";
import Link from "next/link";
import { Clock, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";

export default function StaffPendingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>VIT Campus Administration</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <Card className="border border-slate-300 dark:border-slate-800 shadow-md">
            <CardHeader className="flex flex-col items-center space-y-3 pb-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <CardTitle className="text-xl font-bold">Account Pending Approval</CardTitle>
              <CardDescription>
                Your staff administrative request has been registered and is currently under review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-left text-xs text-slate-600 dark:text-slate-400 space-y-2 border border-slate-200 dark:border-slate-800">
                <p>
                  To prevent unauthorized elevated access across campus databases, all staff accounts must be confirmed by an active administrator (e.g. Chief Security Officer or Student Affairs Head).
                </p>
                <p>
                  Once approved, signing in with your staff credentials will direct you straight to the Admin Worklist.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Link href="/staff/login" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    <span>Check Status</span>
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button variant="primary" size="sm" className="w-full">
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
