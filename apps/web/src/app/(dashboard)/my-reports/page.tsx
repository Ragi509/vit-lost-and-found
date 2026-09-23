"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, MapPin, Calendar, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";
import { getStoredSession } from "@/lib/auth/session";

interface Report {
  id: string;
  name: string;
  category: string;
  type: "lost" | "found";
  location: string;
  date: string;
  status: "searching" | "matched" | "verification_required" | "recovered";
  hasMatch?: boolean;
}

const DEFAULT_REPORTS: Report[] = [
  {
    id: "rep-001",
    name: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "lost",
    location: "D-Block, 3rd Floor Computer Lab 304",
    date: "Sep 21, 2026",
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
    status: "searching",
  },
  {
    id: "rep-003",
    name: "SanDisk 64GB USB Flash Drive",
    category: "Electronics",
    type: "lost",
    location: "Central Library Digital Section",
    date: "Sep 15, 2026",
    status: "recovered",
  },
];

export default function MyReportsPage() {
  const [reports, setReports] = useState<Report[]>(DEFAULT_REPORTS);
  const [activeTab, setActiveTab] = useState<"lost" | "found" | "resolved">("lost");
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyReports = async () => {
    setIsLoading(true);
    try {
      const session = getStoredSession();
      const userId = session?.id || "a1111111-1111-1111-1111-111111111111";

      const res = await fetch(`/api/reports?reporterId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.reports && data.reports.length > 0) {
          const live: Report[] = data.reports.map((r: any) => ({
            id: r.id,
            name: r.item_name,
            category: r.category,
            type: r.type,
            location: r.location,
            date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Today",
            status: r.status as any,
            hasMatch: r.status === "matched",
          }));

          setReports((prev) => {
            const ids = new Set(live.map((l) => l.id));
            return [...live, ...prev.filter((p) => !ids.has(p.id))];
          });
        }
      }

      // Also read from local cache
      const cached = JSON.parse(localStorage.getItem("vit_user_reports") || "[]");
      if (cached.length > 0) {
        const cachedFormatted: Report[] = cached.map((c: any) => ({
          id: c.id,
          name: c.item_name,
          category: c.category,
          type: c.type,
          location: c.location,
          date: "Recently",
          status: "searching",
        }));
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
            Track status, active matches, and verification outcomes for your submissions.
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
          {filteredReports.map((report) => (
            <Card key={report.id} className="p-5 border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                  <span className="text-xs text-muted-foreground">• {report.category}</span>
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

              <div className="flex items-center gap-2 shrink-0">
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
          ))}
        </div>
      )}
    </div>
  );
}
