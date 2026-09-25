"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, MapPin, Calendar, ArrowRight, CheckCircle2, RefreshCw, ShieldAlert, AlertCircle, X } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";
import { getStoredSession } from "@/lib/auth/session";

interface Report {
  id: string;
  name: string;
  category: string;
  type: "lost" | "found";
  location: string;
  date: string;
  createdAt?: string;
  status: "searching" | "matched" | "verification_required" | "recovered" | "under_human_review";
  hasMatch?: boolean;
  escalation?: {
    id: string;
    status: string;
    admin_notes?: string;
  };
}

const DEFAULT_REPORTS: Report[] = [
  {
    id: "rep-001",
    name: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "lost",
    location: "D-Block, 3rd Floor Computer Lab 304",
    date: "Sep 21, 2026",
    createdAt: "2026-09-21T10:00:00.000Z",
    status: "matched",
    hasMatch: true,
  },
  {
    id: "rep-002",
    name: "Decathlon 1L Stainless Steel Bottle",
    category: "Accessories",
    type: "found",
    location: "Sports Complex - Badminton Bench",
    date: "Sep 22, 2026",
    createdAt: "2026-09-22T12:00:00.000Z",
    status: "searching",
  },
  {
    id: "rep-003",
    name: "SanDisk 64GB USB Flash Drive",
    category: "Electronics",
    type: "lost",
    location: "Central Library Digital Section",
    date: "Sep 15, 2026",
    createdAt: "2026-09-15T09:00:00.000Z",
    status: "recovered",
  },
];

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>(DEFAULT_REPORTS);
  const [activeTab, setActiveTab] = useState<"lost" | "found" | "resolved">("lost");
  const [isLoading, setIsLoading] = useState(false);
  const [thresholdHours, setThresholdHours] = useState<number>(72);
  const [selectedForEscalation, setSelectedForEscalation] = useState<Report | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateSuccessMsg, setEscalateSuccessMsg] = useState<string | null>(null);
  const [escalateErrorMsg, setEscalateErrorMsg] = useState<string | null>(null);

  const fetchMyReports = async () => {
    setIsLoading(true);
    try {
      const session = getStoredSession();
      const userId = session?.id || "a1111111-1111-1111-1111-111111111111";

      // 1. Fetch escalations map
      const escalationsMap: Record<string, any> = {};
      try {
        const escRes = await fetch("/api/escalations");
        if (escRes.ok) {
          const escData = await escRes.json();
          if (escData.escalations && Array.isArray(escData.escalations)) {
            escData.escalations.forEach((e: any) => {
              escalationsMap[e.report_id] = e;
            });
          }
        }
      } catch (err) {
        console.warn("Escalations fetch notice:", err);
      }

      // 2. Fetch live reports
      const res = await fetch(`/api/reports?reporterId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.reports && data.reports.length > 0) {
          const live: Report[] = data.reports.map((r: any) => {
            const esc = escalationsMap[r.id];
            const displayStatus = esc ? "under_human_review" : (r.status as any);
            return {
              id: r.id,
              name: r.item_name,
              category: r.category,
              type: r.type,
              location: r.location,
              date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Today",
              createdAt: r.created_at || r.date_time,
              status: displayStatus,
              hasMatch: r.status === "matched",
              escalation: esc ? { id: esc.id, status: esc.status, admin_notes: esc.admin_notes } : undefined,
            };
          });

          setReports((prev) => {
            const ids = new Set(live.map((l) => l.id));
            return [...live, ...prev.filter((p) => !ids.has(p.id))];
          });
        }
      }

      // 3. Also read from local cache
      const cached = JSON.parse(localStorage.getItem("vit_user_reports") || "[]");
      if (cached.length > 0) {
        const cachedFormatted: Report[] = cached.map((c: any) => {
          const esc = escalationsMap[c.id];
          return {
            id: c.id,
            name: c.item_name,
            category: c.category,
            type: c.type,
            location: c.location,
            date: "Recently",
            createdAt: c.created_at || new Date().toISOString(),
            status: esc ? "under_human_review" : "searching",
            escalation: esc ? { id: esc.id, status: esc.status, admin_notes: esc.admin_notes } : undefined,
          };
        });
        setReports((prev) => {
          const ids = new Set(prev.map((p) => p.id));
          return [...cachedFormatted.filter((c) => !ids.has(c.id)), ...prev];
        });
      }
    } catch (e) {
      console.warn("My reports fetch notice:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, []);

  const isEligibleForEscalation = (report: Report): boolean => {
    if (report.type !== "lost") return false;
    if (report.status !== "searching") return false;
    if (report.hasMatch) return false;
    if (report.escalation) return false;

    const createdTime = report.createdAt ? new Date(report.createdAt).getTime() : 0;
    if (!createdTime) return false;

    const ageHours = (Date.now() - createdTime) / (1000 * 60 * 60);
    return ageHours >= thresholdHours;
  };

  const handleConfirmEscalate = async () => {
    if (!selectedForEscalation) return;
    setIsEscalating(true);
    setEscalateErrorMsg(null);

    try {
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: selectedForEscalation.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEscalateErrorMsg(data.error || "Failed to escalate report");
        return;
      }

      setEscalateSuccessMsg("Report escalated to Campus Security Desk. A staff member is now reviewing your case.");
      // Update local report status
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedForEscalation.id
            ? {
                ...r,
                status: "under_human_review",
                escalation: { id: data.escalation.id, status: "pending" },
              }
            : r
        )
      );

      // Close modal after brief pause
      setTimeout(() => {
        setSelectedForEscalation(null);
        setEscalateSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setEscalateErrorMsg(err.message || "Network error occurred");
    } finally {
      setIsEscalating(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (activeTab === "resolved") return r.status === "recovered";
    return r.type === activeTab && r.status !== "recovered";
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            My Campus Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track status, active matches, and security desk escalations for your submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMyReports} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Sync</span>
          </Button>
          <Link href="/report/lost">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              <span>Report Lost</span>
            </Button>
          </Link>
          <Link href="/report/found">
            <Button variant="outline" size="sm">
              <span>Report Found</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["lost", "found", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "lost" ? "My Lost Items" : tab === "found" ? "My Found Submissions" : "Resolved / Recovered"}
          </button>
        ))}
      </div>

      {/* Report Cards */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} items`}
          description="You do not have any active reports under this category."
        />
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const eligible = isEligibleForEscalation(report);

            return (
              <Card key={report.id} className="p-5 border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.status} />
                    <span className="text-xs text-muted-foreground">• {report.category}</span>
                    {report.escalation && (
                      <span className="text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                        Human Review: {report.escalation.status}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground">{report.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{report.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{report.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {eligible && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedForEscalation(report);
                        setEscalateErrorMsg(null);
                        setEscalateSuccessMsg(null);
                      }}
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-purple-600 dark:text-purple-400" />
                      <span>Escalate to Security</span>
                    </Button>
                  )}

                  {report.hasMatch && (
                    <Link href="/matches/match-001">
                      <Button variant="accent" size="sm">
                        <span>View AI Match (~91%)</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  )}

                  {report.status === "recovered" && (
                    <Link href="/recovered/rec-001">
                      <Button variant="outline" size="sm">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        <span>View Handover Pass</span>
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Escalation Confirmation Modal */}
      {selectedForEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-base text-foreground">Escalate Case to Campus Security Desk</h3>
              </div>
              <button
                onClick={() => setSelectedForEscalation(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-muted-foreground">
                No automatic AI match was detected for <strong className="text-foreground">{selectedForEscalation.name}</strong> after the standard search window.
              </p>

              <div className="p-4 rounded-lg bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-2 text-xs text-purple-900 dark:text-purple-200">
                <p className="font-semibold text-sm">What happens upon escalation?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Your report details are forwarded immediately to the Lost & Found office / Campus Security Desk worklist.</li>
                  <li>A security officer manually checks physical custody logs and inventory across campuses.</li>
                  <li>Your report status updates to <strong>Under Human Review</strong>, and you will receive an in-app confirmation.</li>
                </ul>
              </div>

              {escalateErrorMsg && (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{escalateErrorMsg}</span>
                </div>
              )}

              {escalateSuccessMsg && (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{escalateSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedForEscalation(null)}
                disabled={isEscalating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmEscalate}
                isLoading={isEscalating}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Confirm Escalation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
