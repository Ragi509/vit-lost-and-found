"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PlusCircle,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Search,
  Bell,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatusBadge,
  StepIndicator,
} from "@vit/ui";
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

interface ActiveReport {
  id: string;
  name: string;
  location: string;
  status:
    | "searching"
    | "matched"
    | "verification_required"
    | "recovered"
    | "under_human_review";
  isEscalated: boolean;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  href?: string;
}

function StatCard({ label, value, icon, href }: StatCardProps) {
  const inner = (
    <Card className="p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function UserDashboard() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [matchAlert, setMatchAlert] = useState<MatchAlert | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [activeReports, setActiveReports] = useState<ActiveReport[]>([]);
  const [activeReportIndex, setActiveReportIndex] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  const fetchData = useCallback(async () => {
    let currentSession = getStoredSession();
    if (!currentSession) {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.session) {
            currentSession = meData.session;
            setUser(meData.session);
          }
        }
      } catch (_) {}
    }

    if (!currentSession) return;
    setUser(currentSession);

    const params = new URLSearchParams();
    if (currentSession.id) params.set("reporterId", currentSession.id);
    if (currentSession.email) params.set("reporterEmail", currentSession.email);

    try {
      // Fetch user's reports
      const repRes = await fetch(`/api/reports?${params.toString()}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        const reports: any[] = repData.reports || [];

        const ACTIVE_STATUSES = ["searching", "matched", "verification_required"];

        // Fetch escalations
        const escMap: Record<string, any> = {};
        try {
          const escRes = await fetch("/api/escalations");
          if (escRes.ok) {
            const escData = await escRes.json();
            (escData.escalations || []).forEach((e: any) => {
              escMap[e.report_id] = e;
            });
          }
        } catch (_) {}

        const liveActive: ActiveReport[] = reports
          .filter((r: any) => ACTIVE_STATUSES.includes(r.status))
          .map((r: any) => ({
            id: r.id,
            name: r.item_name,
            location: r.location,
            status: escMap[r.id]
              ? ("under_human_review" as const)
              : (r.status as ActiveReport["status"]),
            isEscalated: !!escMap[r.id],
          }));

        setActiveReports(liveActive);
        setActiveCount(liveActive.length);
        setRecoveredCount(reports.filter((r: any) => r.status === "recovered").length);
        setIsNewUser(reports.length === 0);
        // Reset index if current is out of bounds after refresh
        setActiveReportIndex((prev) => Math.min(prev, Math.max(0, liveActive.length - 1)));
      }

      // Fetch matches
      const matchParams = new URLSearchParams();
      if (currentSession.id) matchParams.set("userId", currentSession.id);
      if (currentSession.email) matchParams.set("email", currentSession.email);
      const matchRes = await fetch(`/api/matches?${matchParams.toString()}`);
      if (matchRes.ok) {
        const matchData = await matchRes.json();
        const pending = (matchData.matches || []).filter(
          (m: any) => m.status === "suggested"
        );
        setMatchCount(pending.length);

        if (pending.length > 0) {
          const top = pending[0];
          const pct = Math.round(top.confidence_score * 100);
          setMatchAlert({
            match_id: top.id,
            found_item_name: top.found_report?.item_name || "Found Item",
            found_location: top.found_report?.location || "Campus",
            holding_location: top.found_report?.holding_location || "Security Desk",
            confidence_score: top.confidence_score,
            approximate_label: `~${pct}% match`,
            lost_item_name: top.lost_report?.item_name || "Lost Item",
          });
        } else {
          setMatchAlert(null);
        }
      }

      // Fetch unread notifications
      const notifRes = await fetch("/api/notifications?unread=true");
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadCount(notifData.count ?? (notifData.notifications?.length ?? 0));
      }
    } catch (err) {
      console.warn("Dashboard data fetch notice:", err);
    }
  }, []);

  useEffect(() => {
    const loadSession = () => {
      const s = getStoredSession();
      if (s) setUser(s);
    };
    loadSession();
    window.addEventListener("vit_session_updated", loadSession);

    fetchData();

    const supabase = createClient();
    const session = getStoredSession();

    const channel = supabase
      .channel("dashboard_realtime_v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => { fetchData(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => { fetchData(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => { fetchData(); }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsLiveConnected(true);
      });

    return () => {
      window.removeEventListener("vit_session_updated", loadSession);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const userName = user?.fullName || "Student";
  const userRole = user ? `${user.role} • ${user.prn}` : "Authenticated Session";
  const activeReport = activeReports[activeReportIndex] ?? null;
  const totalActive = activeReports.length;

  // New user empty state
  if (isNewUser) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome, {userName}!
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {userRole} • {user?.department || "Vishwakarma Institute of Technology"}
          </p>
        </div>
        <Card className="p-10 text-center border-dashed space-y-4">
          <Sparkles className="w-10 h-10 mx-auto text-teal-500" />
          <h2 className="text-xl font-bold text-foreground">
            Get started with VIT Lost &amp; Found
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Report a lost or found item on campus. Our AI engine will automatically
            match your report with candidates using text and visual similarity.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
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
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {userName}
            </h1>
            {isLiveConnected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live</span>
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

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Reports"
          value={activeCount}
          icon={<Search className="w-5 h-5" />}
        />
        <StatCard
          label="AI Matches Pending"
          value={matchCount}
          icon={<Sparkles className="w-5 h-5" />}
          href="/matches"
        />
        <StatCard
          label="Recovered"
          value={recoveredCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Unread Alerts"
          value={unreadCount}
          icon={<Bell className="w-5 h-5" />}
          href="/notifications"
        />
      </div>

      {/* AI Match Alert Banner */}
      {matchAlert && matchAlert.confidence_score >= 0.4 && (
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
              Location: <strong>{matchAlert.found_location}</strong> • Current
              custody: <strong>{matchAlert.holding_location}</strong>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/matches">
              <Button variant="accent" size="sm">
                <span>Inspect Match &amp; Claim</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Active Report Lifecycle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Active Report Lifecycle
          </h2>
          <Link
            href="/my-reports"
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          >
            View all reports
          </Link>
        </div>

        {activeReport ? (
          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  {/* Report switcher when multiple active */}
                  {totalActive > 1 && (
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() =>
                          setActiveReportIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={activeReportIndex === 0}
                        className="p-0.5 rounded disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Previous report"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-muted-foreground font-medium">
                        Report {activeReportIndex + 1} of {totalActive}
                      </span>
                      <button
                        onClick={() =>
                          setActiveReportIndex((i) =>
                            Math.min(totalActive - 1, i + 1)
                          )
                        }
                        disabled={activeReportIndex === totalActive - 1}
                        className="p-0.5 rounded disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Next report"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <CardTitle className="text-base">{activeReport.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Reported at {activeReport.location}
                  </CardDescription>
                </div>
                <StatusBadge status={activeReport.status} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <StepIndicator
                currentStep={
                  activeReport.isEscalated
                    ? "verify"
                    : activeReport.status === "matched" ||
                      activeReport.status === "verification_required"
                    ? "match"
                    : "report"
                }
                className="max-w-xl mx-auto"
              />
              <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>
                    {activeReport.isEscalated
                      ? "Campus security desk is manually reviewing physical logs"
                      : activeReport.status === "matched" ||
                        activeReport.status === "verification_required"
                      ? "Review candidate match and submit blind ownership proof"
                      : "AI engine is scanning found items for a match"}
                  </span>
                </div>
                {activeReport.isEscalated ? (
                  <Link href="/my-reports">
                    <Button variant="outline" size="sm">
                      <span>View Escalation Status</span>
                    </Button>
                  </Link>
                ) : (
                  <Link
                    href={
                      matchAlert
                        ? `/matches`
                        : "/matches"
                    }
                  >
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
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Active Reports
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              You currently have no active lost or found item reports in the campus system.
            </p>
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
