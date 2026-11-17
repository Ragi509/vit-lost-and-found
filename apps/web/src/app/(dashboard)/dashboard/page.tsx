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
  iconBg: string;
  iconColor: string;
  href?: string;
  trendText?: string;
}

function StatCard({ label, value, icon, iconBg, iconColor, href, trendText }: StatCardProps) {
  const inner = (
    <Card className="p-5 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/85">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${iconBg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">{value}</p>
        {trendText && (
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>{trendText}</span>
          </p>
        )}
      </div>
    </Card>
  );
  if (href) return <Link href={href} className="block">{inner}</Link>;
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
      {/* Greeting Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50/50 to-teal-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-teal-950/20 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
                Welcome back, {userName}
              </h1>
              {isLiveConnected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Realtime Live</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {userRole} • {user?.department || "Vishwakarma Institute of Technology, Pune"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/report/lost">
              <Button variant="primary" size="md">
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>Report Lost Item</span>
              </Button>
            </Link>
            <Link href="/report/found">
              <Button variant="outline" size="md">
                <PlusCircle className="w-4 h-4 mr-1.5 text-[#3A7D80]" />
                <span>Report Found Item</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Active Reports"
          value={activeCount}
          icon={<Search className="w-5 h-5" />}
          iconBg="bg-sky-50 dark:bg-sky-950/50"
          iconColor="text-sky-600 dark:text-sky-400"
          href="/my-reports"
          trendText="Ongoing campus tracking"
        />
        <StatCard
          label="AI Matches Pending"
          value={matchCount}
          icon={<Sparkles className="w-5 h-5" />}
          iconBg="bg-teal-50 dark:bg-teal-950/50"
          iconColor="text-[#3A7D80] dark:text-teal-300"
          href="/matches"
          trendText="Ready for your verification"
        />
        <StatCard
          label="Items Recovered"
          value={recoveredCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBg="bg-emerald-50 dark:bg-emerald-950/50"
          iconColor="text-emerald-600 dark:text-emerald-400"
          href="/my-reports"
          trendText="Successfully closed"
        />
        <StatCard
          label="Security Alerts"
          value={unreadCount}
          icon={<Bell className="w-5 h-5" />}
          iconBg="bg-amber-50 dark:bg-amber-950/50"
          iconColor="text-amber-600 dark:text-amber-400"
          href="/notifications"
          trendText="Notifications & status"
        />
      </div>

      {/* AI Match Alert Banner */}
      {matchAlert && matchAlert.confidence_score >= 0.4 && (
        <div className="p-6 rounded-2xl border border-[#3A7D80]/40 dark:border-teal-700/60 bg-gradient-to-r from-teal-50/90 via-sky-50/50 to-white dark:from-teal-950/50 dark:via-slate-900/80 dark:to-slate-900/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-[#3A7D80] text-white shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{matchAlert.approximate_label}</span>
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                High-confidence match for your lost <strong className="text-slate-800 dark:text-slate-200">{matchAlert.lost_item_name}</strong>
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Found: {matchAlert.found_item_name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Found at: <strong className="font-semibold">{matchAlert.found_location}</strong> • Current custody: <strong className="font-semibold text-[#3A7D80] dark:text-teal-300">{matchAlert.holding_location}</strong>
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
          <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {/* Report switcher when multiple active */}
                  {totalActive > 1 && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <button
                        onClick={() =>
                          setActiveReportIndex((i) => Math.max(0, i - 1))
                        }
                        disabled={activeReportIndex === 0}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                        aria-label="Previous report"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold tracking-tight">
                        Report {activeReportIndex + 1} of {totalActive}
                      </span>
                      <button
                        onClick={() =>
                          setActiveReportIndex((i) =>
                            Math.min(totalActive - 1, i + 1)
                          )
                        }
                        disabled={activeReportIndex === totalActive - 1}
                        className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                        aria-label="Next report"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">{activeReport.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5 font-medium text-slate-500 dark:text-slate-400">
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
                className="max-w-xl mx-auto py-2"
              />
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#3A7D80] shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">
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
