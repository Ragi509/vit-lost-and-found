"use client";

import React, { useState } from "react";
import { User, ShieldCheck, Moon, Sun, Bell, CheckCircle2, History, Building2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "@vit/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function ProfilePage() {
  const [profile] = useState({
    fullName: "Aditya Joshi",
    email: "aditya.joshi21@vit.edu",
    role: "Student",
    prn: "PRN-2110452",
    department: "Department of Electronics Engineering",
    campus: "Bibwewadi Main Campus, Pune",
    recoveredCount: 3,
    activeReportsCount: 1,
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Student Profile & Identity
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Verified institutional credentials and system preferences.
        </p>
      </div>

      {/* Identity Card */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xl shadow-md">
            AJ
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{profile.fullName}</CardTitle>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300">
                {profile.role}
              </span>
            </div>
            <CardDescription className="text-xs mt-0.5">{profile.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2 border-t border-border text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
              <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
                Institutional ID / PRN
              </span>
              <span className="text-foreground font-mono font-medium">{profile.prn}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
              <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
                Campus Location
              </span>
              <span className="text-foreground font-medium">{profile.campus}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border">
            <span className="text-slate-400 block font-semibold uppercase text-[10px] mb-0.5">
              Academic Department
            </span>
            <span className="text-foreground font-medium">{profile.department}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recovery Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4 border-border flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
            <History className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Active Submissions</span>
            <h4 className="text-xl font-bold text-foreground">{profile.activeReportsCount} report</h4>
          </div>
        </Card>

        <Card className="p-4 border-border flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">Belongings Recovered</span>
            <h4 className="text-xl font-bold text-foreground">{profile.recoveredCount} items returned</h4>
          </div>
        </Card>
      </div>

      {/* System Preferences & Theme */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">System Preferences</CardTitle>
          <CardDescription className="text-xs">Configure theme appearance and alert notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <span className="font-semibold text-foreground block">Appearance Mode</span>
              <span className="text-muted-foreground text-[11px]">
                Toggle between light and dark charcoal themes (WCAG AA compliant).
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div>
              <span className="font-semibold text-foreground block">Match Alerts & Push Notifications</span>
              <span className="text-muted-foreground text-[11px]">
                Receive instant browser push notifications when a candidate match is found.
              </span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notificationsEnabled ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
