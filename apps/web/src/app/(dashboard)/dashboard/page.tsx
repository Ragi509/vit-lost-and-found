"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, Search, Clock, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, StatusBadge, StepIndicator } from "@vit/ui";
import { getStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

interface MatchAlert {
  match_id: string;
  found_item_name: string;
  found_location: string;
  holding_location: string;
  confidence_score: number;
  approximate_label: string;
  lost_item_name: string;
}

export default function UserDashboard() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeReportsCount, setActiveReportsCount] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [matchAlert, setMatchAlert] = useState<MatchAlert | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [activeReportInfo, setActiveReportInfo] = useState<{
    id: string;
    name: string;
    location: string;
    status: "searching" | "matched" | "verification_required" | "recovered" | "under_human_review";
    isEscalated: boolean;
  } | null>(null);

  useEffect(() => {
    // 1. Resolve user identity from session
    const loadSession = () => {
      const session = getStoredSession();
      if (session) {
        setUser(session);
      } else {
        setUser(null);
      }
    };

    loadSession();
    window.addEventListener("vit_session_updated", loadSession);

    // 2. Fetch live data and setup Supabase Realtime listener
    const supabase = createClient();

    const fetchLiveMetrics = async () => {
      try {
        // Count active reports
        const { count: repCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true });
        if (repCount !== null && repCount !== undefined) {
          setActiveReportsCount(repCount);
        }

        // Count recovered items
        const { count: recCount } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "recovered");
        if (recCount !== null && recCount !== undefined) {
          setRecoveredCount(recCount);
        } else {
          setRecoveredCount(0);
        }

        // Check user's active report and escalation first
        const currentSession = getStoredSession();
        if (currentSession?.id) {
          const userRepRes = await fetch(`/api/reports?reporterId=${currentSession.id}`);
          if (userRepRes.ok) {
            const repData = await userRepRes.json();
            if (repData.reports && repData.reports.length > 0) {
              const latestRep = repData.reports[0];
              let isEsc = false;
              try {
                const escRes = await fetch(`/api/escalations?reportId=${latestRep.id}`);
                if (escRes.ok) {
                  const escData = await escRes.json();
                  if (escData.escalation) isEsc = true;
                }
              } catch (e) {}

              setActiveReportInfo({
                id: latestRep.id,
                name: latestRep.item_name,
                location: latestRep.location,
                status: isEsc ? "under_human_review" : (latestRep.status as any),
                isEscalated: isEsc,
              });
            } else {
              setActiveReportInfo(null);
            }
          }

          // Fetch matches for user's reports
          const userMatchesRes = await fetch(`/api/matches?userId=${currentSession.id}`);
          if (userMatchesRes.ok) {
            const matchData = await userMatchesRes.json();
            if (matchData.matches && matchData.matches.length > 0) {
              const m = matchData.matches[0];
              const pct = Math.round(m.confidence_score * 100);
              setMatchAlert({
                match_id: m.id,
                found_item_name: m.found_report?.item_name || "Found Item",
                found_location: m.found_report?.location || "Campus",
                holding_location: m.found_report?.holding_location || "Security Desk",
                confidence_score: m.confidence_score,
                approximate_label: `~${pct}% match`,
                lost_item_name: m.lost_report?.item_name || "Lost Item",
              });
            } else {
              setMatchAlert(null);
            }
          }
        } else {
          setActiveReportInfo(null);
          setMatchAlert(null);
        }
      } catch (err) {
        console.warn("Live metric fetch notice:", err);
      }
    };

    fetchLiveMetrics();

    // 3. Supabase Realtime Subscription (WebSocket live updates)
    const channel = supabase
      .channel("dashboard_realtime_events")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          console.log("Realtime Match Event received:", payload);
          fetchLiveMetrics();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        (payload) => {
          console.log("Realtime Report Event received:", payload);
          fetchLiveMetrics();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    return () => {
      window.removeEventListener("vit_session_updated", loadSession);
      supabase.removeChannel(channel);
    };
  }, []);

  const userName = user?.fullName || "Student";
  const userRole = user ? `${user.role} • ${user.prn}` : "Authenticated Session";

  return (
    <div className="space-y-8">
      {/* Greeting and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {userName}
            </h1>
            {isLiveConnected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Feed</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {userRole} • {user?.department || "Vishwakarma Institute of Technology"}
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
            <CardTitle className="text-2xl font-bold">{activeReportsCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
            Scanning across Bibwewadi & Kondhwa
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
            <CardTitle className="text-2xl font-bold text-teal-950 dark:text-teal-100">
              {matchAlert ? "1 Match Found" : "0 Matches"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-teal-800 dark:text-teal-300">
            {matchAlert ? `High similarity candidate (${matchAlert.approximate_label})` : "Scanning incoming reports..."}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold">Campus Recoveries</CardDescription>
            <CardTitle className="text-2xl font-bold">{recoveredCount}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-500 dark:text-slate-400">
            Belongings successfully returned to owners
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
                Candidate for your lost {matchAlert.lost_item_name}
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

      {/* Primary Lifecycle Stepper & Active Reports */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Active Report Lifecycle
          </h2>
          <Link href="/my-reports" className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">
            View all reports
          </Link>
        </div>

        {activeReportInfo ? (
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{activeReportInfo.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Reported lost at {activeReportInfo.location}
                  </CardDescription>
                </div>
                <StatusBadge status={activeReportInfo.status} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <StepIndicator currentStep={activeReportInfo.isEscalated ? "verify" : "match"} className="max-w-xl mx-auto" />
              <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>
                    {activeReportInfo.isEscalated
                      ? "Next step: Campus security desk is manually reviewing physical logs and custody"
                      : "Next step: Review candidate match and submit blind ownership proof"}
                  </span>
                </div>
                {activeReportInfo.isEscalated ? (
                  <Link href="/my-reports">
                    <Button variant="outline" size="sm">
                      <span>View Escalation Status</span>
                    </Button>
                  </Link>
                ) : (
                  <Link href={matchAlert ? `/matches/${matchAlert.match_id}` : "/matches"}>
                    <Button variant="outline" size="sm">
                      <span>View Match Comparison</span>
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Active Reports Submitted</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">You currently have no active lost or found item reports in the campus system.</p>
            <Link href="/report/lost">
              <Button variant="primary" size="sm">
                <PlusCircle className="w-4 h-4 mr-2" />
                <span>File a Lost Item Report</span>
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
