"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PlusCircle, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Search, Clock } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, StatusBadge, StepIndicator } from "@vit/ui";

export default function UserDashboard() {
  const [userName] = useState("Aditya Joshi");
  const [userRole] = useState("Student • Electronics Engg (3rd Year)");

  // Mock active user report with an AI match alert
  const activeReport = {
    id: "rep-001",
    item_name: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools",
    type: "lost" as const,
    location: "D-Block, 3rd Floor Computer Lab 304",
    date_time: "Yesterday, 3:30 PM",
    status: "matched" as const,
  };

  const matchAlert = {
    match_id: "match-001",
    found_item_name: "Texas Instruments Graphing Calculator",
    found_location: "D-Block, Computer Lab 304",
    holding_location: "D-Block Security Counter (Ground Floor)",
    confidence_score: 0.91,
    approximate_label: "~91% match",
  };

  return (
    <div className="space-y-8">
      {/* Greeting and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {userRole} • Vishwakarma Institute of Technology
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/report/lost">
            <Button variant="primary" size="md">
              <PlusCircle className="w-4 h-4 mr-2" />
              <span>Report Lost Item</span>
            </Button>
          </Link>
          <Link href="/report/found">
            <Button variant="outline" size="md">
              <span>Report Found Item</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Active Reports</CardDescription>
            <CardTitle className="text-2xl font-bold">1</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
            1 Lost item actively scanning
          </CardContent>
        </Card>

        <Card className="border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold text-teal-700 dark:text-teal-400">
                AI Match Alert
              </CardDescription>
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-teal-950 dark:text-teal-100">1 Match Found</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-teal-800 dark:text-teal-300">
            High similarity candidate (~91%)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Campus Recoveries</CardDescription>
            <CardTitle className="text-2xl font-bold">42</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
            Belongings successfully returned this term
          </CardContent>
        </Card>
      </div>

      {/* High-Priority AI Match Banner */}
      {matchAlert && (
        <div className="p-5 rounded-xl border border-teal-300 dark:border-teal-800 bg-gradient-to-r from-teal-50/80 to-blue-50/50 dark:from-teal-950/40 dark:to-blue-950/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{matchAlert.approximate_label}</span>
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Candidate for your lost TI-84 Calculator
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Found: {matchAlert.found_item_name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Location: <strong>{matchAlert.found_location}</strong> • Current custody:{" "}
              <strong>{matchAlert.holding_location}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/matches/${matchAlert.match_id}`}>
              <Button variant="accent" size="sm">
                <span>Inspect Match & Claim</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Primary Primary Flow Stepper & Active Reports */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Active Report Lifecycle
          </h2>
          <Link href="/my-reports" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">
            View all reports
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{activeReport.item_name}</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Reported lost at {activeReport.location} • {activeReport.date_time}
                </CardDescription>
              </div>
              <StatusBadge status={activeReport.status} />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <StepIndicator currentStep="match" className="max-w-xl mx-auto" />
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                <span>Next step: Review candidate match and submit blind ownership proof</span>
              </div>
              <Link href={`/matches/${matchAlert.match_id}`}>
                <Button variant="outline" size="sm">
                  <span>View Match Comparison</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
