"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PlusCircle, MapPin, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";

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

const MY_REPORTS: Report[] = [
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
  const [activeTab, setActiveTab] = useState<"lost" | "found" | "resolved">("lost");

  const filteredReports = MY_REPORTS.filter((r) => {
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
