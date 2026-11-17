"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  MapPin,
  Calendar,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";
import { getStoredSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

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
  photoUrl?: string | null;
  escalation?: {
    id: string;
    status: string;
    admin_notes?: string;
  };
}

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "lost" | "found" | "resolved">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [thresholdHours, setThresholdHours] = useState<number>(72);
  const [selectedForEscalation, setSelectedForEscalation] = useState<Report | null>(null);
  const [isEscalating, setIsEscalating] = useState(false);
  const [escalateSuccessMsg, setEscalateSuccessMsg] = useState<string | null>(null);
  const [escalateErrorMsg, setEscalateErrorMsg] = useState<string | null>(null);

  // Delete modal state
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchMyReports = async () => {
    setIsLoading(true);
    try {
      let session = getStoredSession();
      if (!session) {
        try {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.session) session = meData.session;
          }
        } catch (_) {}
      }

      // 1. Fetch escalations map
      const escalationsMap: Record<string, any> = {};
      try {
        const escRes = await fetch("/api/escalations");
        if (escRes.ok) {
          const escData = await escRes.json();
          if (Array.isArray(escData.escalations)) {
            escData.escalations.forEach((e: any) => {
              escalationsMap[e.report_id] = e;
            });
          }
        }
      } catch (err) {
        console.warn("Escalations fetch notice:", err);
      }

      // 2. Fetch live reports for current authenticated user
      const queryParams = new URLSearchParams();
      if (session?.id) queryParams.set("reporterId", session.id);
      if (session?.email) queryParams.set("reporterEmail", session.email);
      const res = await fetch(`/api/reports?${queryParams.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports)) {
          const live: Report[] = data.reports.map((r: any) => {
            const esc = escalationsMap[r.id];
            const displayStatus = esc ? "under_human_review" : (r.status as any);
            return {
              id: r.id,
              name: r.item_name,
              category: r.category,
              type: r.type,
              location: r.location,
              date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Recent",
              createdAt: r.created_at || r.date_time,
              status: displayStatus,
              hasMatch: r.status === "matched",
              photoUrl: r.photo_url,
              escalation: esc ? { id: esc.id, status: esc.status, admin_notes: esc.admin_notes } : undefined,
            };
          });

          // Reconcile and clean up localStorage cache with live database records
          try {
            const raw = typeof window !== "undefined" ? localStorage.getItem("vit_user_reports") : null;
            if (raw) {
              const local: any[] = JSON.parse(raw);
              const liveIds = new Set(live.map((r) => r.id));
              // Only keep local cache items that match live reports or are very recent (< 5 mins) pending sync
              const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
              const validLocal = local.filter((loc) => {
                if (liveIds.has(loc.id)) return true;
                const locTime = loc.dateTime ? new Date(loc.dateTime).getTime() : 0;
                return locTime > fiveMinsAgo;
              });
              localStorage.setItem("vit_user_reports", JSON.stringify(validLocal));

              validLocal.forEach((loc) => {
                if (!liveIds.has(loc.id)) {
                  live.unshift({
                    id: loc.id,
                    name: loc.item_name || loc.name || "Item",
                    category: loc.category || "General",
                    type: loc.type || "lost",
                    location: loc.location || "Campus",
                    date: "Today",
                    createdAt: loc.dateTime || new Date().toISOString(),
                    status: "searching",
                    photoUrl: loc.photoUrl,
                  });
                }
              });
            }
          } catch (_) {}

          setReports(live);
        } else {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    } catch (e) {
      console.warn("My reports fetch notice:", e);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReports();

    const supabase = createClient();
    const channel = supabase
      .channel("my_reports_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => {
        fetchMyReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isEligibleForEscalation = (report: Report): boolean => {
    if (report.type !== "lost") return false;
    if (report.status !== "searching") return false;
    if (report.escalation) return false;
    if (!report.createdAt) return false;

    const reportTime = new Date(report.createdAt).getTime();
    const now = Date.now();
    const elapsedHours = (now - reportTime) / (1000 * 60 * 60);
    return elapsedHours >= thresholdHours;
  };

  // Edit eligibility: active report (searching, matched, active) and no escalation/recovered
  const canEditReport = (report: Report) => {
    const s = (report.status || "").toLowerCase();
    return s !== "recovered" && s !== "under_human_review" && !report.escalation;
  };

  // Delete eligibility: not recovered and no active escalation
  const canDeleteReport = (report: Report) => {
    const s = (report.status || "").toLowerCase();
    return s !== "recovered" && s !== "under_human_review" && !report.escalation;
  };

  const handleEscalateSubmit = async () => {
    if (!selectedForEscalation) return;
    setIsEscalating(true);
    setEscalateSuccessMsg(null);
    setEscalateErrorMsg(null);

    try {
      const session = getStoredSession();
      const res = await fetch("/api/escalations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: selectedForEscalation.id,
          requestedBy: session?.id,
          requestedByEmail: session?.email,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEscalateSuccessMsg("Report escalated to Security Desk review.");
        setTimeout(() => {
          setSelectedForEscalation(null);
          setEscalateSuccessMsg(null);
          fetchMyReports();
        }, 1500);
      } else {
        setEscalateErrorMsg(data.error || "Failed to submit escalation.");
      }
    } catch (err: any) {
      setEscalateErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsEscalating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const session = getStoredSession();
      const queryParams = new URLSearchParams();
      if (session?.id) queryParams.set("userId", session.id);
      if (session?.email) queryParams.set("userEmail", session.email);
      const res = await fetch(`/api/reports/${reportToDelete.id}?${queryParams.toString()}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        // Immediately purge deleted item from local storage cache
        try {
          const raw = localStorage.getItem("vit_user_reports");
          if (raw) {
            const list = JSON.parse(raw).filter((x: any) => x.id !== reportToDelete.id);
            localStorage.setItem("vit_user_reports", JSON.stringify(list));
          }
        } catch (_) {}

        setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id));
        setReportToDelete(null);
      } else {
        setDeleteError(data.error || "Failed to delete report.");
      }
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (activeTab === "lost") return r.type === "lost" && r.status !== "recovered";
    if (activeTab === "found") return r.type === "found" && r.status !== "recovered";
    if (activeTab === "resolved") return r.status === "recovered";
    return true; // all
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
            My Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track, update, or remove your submitted campus lost and found reports.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/report/lost">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5" />
              <span>Report Lost</span>
            </Button>
          </Link>
          <Link href="/report/found">
            <Button variant="outline" size="sm">
              <PlusCircle className="w-4 h-4 mr-1.5 text-[#3A7D80]" />
              <span>Report Found</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Modern Pill Tabs */}
      <div className="inline-flex rounded-xl border border-slate-200/80 dark:border-slate-800 p-1 bg-slate-100/70 dark:bg-slate-900 shadow-2xs">
        {(["all", "lost", "found", "resolved"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-white dark:bg-slate-800 text-[#202B3C] dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {tab === "resolved" ? "Recovered & Resolved" : `${tab} Items`}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-24 text-slate-400 gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-[#3A7D80]" />
          <span className="text-sm font-medium">Loading your reports...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title={`No ${activeTab === "all" ? "" : activeTab} reports found`}
          description={
            activeTab === "resolved"
              ? "You do not have any recovered or resolved reports yet."
              : "You haven't submitted any reports matching this filter."
          }
          action={
            <Link href="/report/lost">
              <Button variant="primary" size="sm">
                File a Report
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => {
            const canEdit = canEditReport(report);
            const canDelete = canDeleteReport(report);
            const canEscalate = isEligibleForEscalation(report);

            return (
              <Card key={report.id} className="flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/85">
                <div>
                  {report.photoUrl ? (
                    <div className="w-full h-44 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={report.photoUrl}
                        alt={report.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs ${
                            report.type === "lost"
                              ? "bg-[#D95D5D] text-white"
                              : "bg-[#3A7D80] text-white"
                          }`}
                        >
                          {report.type}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 pb-0 flex items-center justify-between">
                      <span
                        className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          report.type === "lost"
                            ? "bg-rose-50 text-[#D95D5D] border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300"
                            : "bg-teal-50 text-[#3A7D80] border border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300"
                        }`}
                      >
                        {report.type}
                      </span>
                      <StatusBadge status={report.status} />
                    </div>
                  )}

                  <div className="p-5 space-y-3">
                    {report.photoUrl && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#3A7D80] dark:text-sky-300 font-bold uppercase tracking-wider">
                          {report.category}
                        </span>
                        <StatusBadge status={report.status} />
                      </div>
                    )}

                    <div>
                      {!report.photoUrl && (
                        <p className="text-xs text-[#3A7D80] dark:text-sky-300 font-bold uppercase tracking-wider mb-1">
                          {report.category}
                        </p>
                      )}
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-[#23395B] dark:group-hover:text-sky-300 transition-colors">
                        {report.name}
                      </h3>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#3A7D80] dark:text-sky-400" />
                        <span className="truncate">{report.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{report.date}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {canEdit ? (
                        <Link href={`/report/edit/${report.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                            <Edit2 className="w-3.5 h-3.5 mr-1 text-[#3A7D80]" />
                            <span>Edit</span>
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="h-8 px-2.5 text-xs opacity-50 cursor-not-allowed"
                          title={
                            report.status === "recovered"
                              ? "Item is resolved and archived"
                              : "Editing locked: verification claim in progress"
                          }
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          <span>Locked</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportToDelete(report)}
                        disabled={!canDelete}
                        className={`h-8 px-3 text-xs text-[#D95D5D] hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-700 ${!canDelete ? "opacity-50 cursor-not-allowed" : ""}`}
                        title={!canDelete ? "Cannot delete resolved or escalated item" : "Delete report"}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Delete</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {report.hasMatch && (
                        <Link href={`/matches`}>
                          <Button variant="accent" size="sm" className="h-8 px-2.5 text-xs">
                            <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-200" />
                            <span>Match</span>
                          </Button>
                        </Link>
                      )}

                      {canEscalate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedForEscalation(report)}
                          className="h-8 px-2.5 text-xs text-amber-600 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                          <span>Escalate</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold">Delete Report</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>&ldquo;{reportToDelete.name}&rdquo;</strong>? This will permanently
              remove your report, its uploaded photo, and any suggested matches.
            </p>
            {deleteError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-2 rounded">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReportToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
              >
                <span>Cancel</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {selectedForEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-bold">Escalate to Campus Security</h3>
              </div>
              <button
                onClick={() => setSelectedForEscalation(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This report has been active for more than {thresholdHours} hours without an automated AI match. Escalating
              sends this case to Campus Security staff for manual custody register check.
            </p>
            {escalateErrorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 p-2 rounded">
                {escalateErrorMsg}
              </p>
            )}
            {escalateSuccessMsg && (
              <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded">
                {escalateSuccessMsg}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedForEscalation(null)}
                disabled={isEscalating}
              >
                <span>Cancel</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleEscalateSubmit}
                disabled={isEscalating}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isEscalating ? "Submitting..." : "Confirm Escalation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
