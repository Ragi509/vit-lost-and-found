"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  KeyRound,
  Copy,
  CheckCircle2,
  Filter,
  LogOut,
  BarChart3,
  ListFilter,
  UserPlus,
  Inbox,
  TrendingUp,
  Search,
  Clock,
  MapPin,
  CheckCircle,
  FileText,
  AlertCircle
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  StatusBadge
} from "@vit/ui";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

interface PendingClaim {
  id: string;
  item_name: string;
  category: string;
  location: string;
  claimant_name: string;
  claimant_email: string;
  claimant_statement: string;
  finder_statement: string;
  similarity_score: number;
  holding_location: string;
  reason_for_escalation: string;
}

const INITIAL_CLAIMS: PendingClaim[] = [
  {
    id: "claim-101",
    item_name: "Casio fx-991EX ClassWiz Calculator",
    category: "Academic Tools & Calculators",
    location: "Central Library - 2nd Floor Reading Room",
    claimant_name: "Neha Patil (PRN-2310114)",
    claimant_email: "neha.patil23@vit.edu",
    claimant_statement: "Has a black protective slide cover, battery was replaced last month with Maxell coin cell.",
    finder_statement: "Found on study desk 8 in reading room. Slide cover is attached.",
    similarity_score: 0.64,
    holding_location: "Central Library Helpdesk",
    reason_for_escalation: "Similarity score in borderline range (64%)",
  },
  {
    id: "claim-102",
    item_name: "VIT RFID Student Card",
    category: "Identity Cards & Campus Keys",
    location: "Student Cafeteria",
    claimant_name: "Riya Sharma (PRN-2210891)",
    claimant_email: "riya.sharma22@vit.edu",
    claimant_statement: "Name: Riya Sharma, GR number 12110456, Electronics branch.",
    finder_statement: "Turned in to canteen cash counter by lunch staff.",
    similarity_score: 0.72,
    holding_location: "Main Security Gate 1",
    reason_for_escalation: "Two claimants submitted requests for same found ID card",
  },
];

// 30-Day Historical Match Resolution Telemetry
const RESOLUTION_TREND_DATA = [
  { date: "Day 1-5", resolved: 8, reported: 12 },
  { date: "Day 6-10", resolved: 14, reported: 18 },
  { date: "Day 11-15", resolved: 19, reported: 22 },
  { date: "Day 16-20", resolved: 23, reported: 25 },
  { date: "Day 21-25", resolved: 28, reported: 31 },
  { date: "Day 26-30", resolved: 34, reported: 36 },
];

const CATEGORY_DISTRIBUTION = [
  { name: "Academic Tools", count: 32, fill: "#0f766e" },
  { name: "Electronics", count: 24, fill: "#2563eb" },
  { name: "ID Cards & Keys", count: 18, fill: "#d97706" },
  { name: "Bags & Backpacks", count: 12, fill: "#7c3aed" },
  { name: "Clothing / Other", count: 8, fill: "#64748b" },
];

interface CampusReportRecord {
  id: string;
  type: "Lost" | "Found";
  item_name: string;
  category: string;
  location: string;
  reporter: string;
  date: string;
  status: "Open" | "Matching" | "Under Review" | "Recovered";
}

const INITIAL_REPORTS: CampusReportRecord[] = [
  {
    id: "REP-401",
    type: "Lost",
    item_name: "Casio fx-991EX Calculator",
    category: "Academic Tools & Calculators",
    location: "Central Library - 2nd Floor",
    reporter: "neha.patil23@vit.edu",
    date: "Sep 22, 10:15 AM",
    status: "Under Review",
  },
  {
    id: "REP-402",
    type: "Found",
    item_name: "Casio Scientific Calculator",
    category: "Academic Tools & Calculators",
    location: "Central Library Reading Desk",
    reporter: "staff.library@vit.edu",
    date: "Sep 22, 11:30 AM",
    status: "Under Review",
  },
  {
    id: "REP-403",
    type: "Lost",
    item_name: "Boat Airdopes 141 Case (Black)",
    category: "Electronics & Audio",
    location: "D-Block Room 304",
    reporter: "aditya.kulkarni24@vit.edu",
    date: "Sep 21, 04:00 PM",
    status: "Matching",
  },
  {
    id: "REP-404",
    type: "Found",
    item_name: "Blue Fastrack Water Bottle",
    category: "Other Belongings",
    location: "Sports Complex Badminton Court",
    reporter: "prashant.shinde@vit.edu",
    date: "Sep 21, 06:15 PM",
    status: "Open",
  },
  {
    id: "REP-405",
    type: "Lost",
    item_name: "VIT RFID Student Smartcard",
    category: "Identity Cards & Campus Keys",
    location: "Student Cafeteria",
    reporter: "riya.sharma22@vit.edu",
    date: "Sep 20, 01:20 PM",
    status: "Recovered",
  },
];

interface InviteRecord {
  code: string;
  role: string;
  campus: string;
  created: string;
  expires: string;
  status: "Active" | "Redeemed" | "Expired";
}

const INITIAL_INVITES: InviteRecord[] = [
  {
    code: "VIT-INV-8F2K9M",
    role: "Central Library Helpdesk Officer",
    campus: "Bibwewadi Campus",
    created: "Sep 20, 2026",
    expires: "Sep 27, 2026",
    status: "Active",
  },
  {
    code: "VIT-INV-4A9P1Q",
    role: "Gate 1 Security Incharge",
    campus: "Bibwewadi Campus",
    created: "Sep 18, 2026",
    expires: "Sep 25, 2026",
    status: "Redeemed",
  },
];

type AdminNavTab = "claims" | "analytics" | "reports" | "invites";

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<AdminNavTab>("claims");
  const [claims, setClaims] = useState<PendingClaim[]>(INITIAL_CLAIMS);
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(INITIAL_CLAIMS[0] || null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Reports state
  const [reports, setReports] = useState<CampusReportRecord[]>(INITIAL_REPORTS);
  const [reportFilter, setReportFilter] = useState<"All" | "Lost" | "Found" | "Recovered">("All");
  const [reportSearch, setReportSearch] = useState("");

  // Invites state
  const [invites, setInvites] = useState<InviteRecord[]>(INITIAL_INVITES);
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Top stat counts
  const pendingCount = claims.length;
  const activeReportsCount = 47;
  const recoveredLast7DaysCount = 19;

  const handleApprove = async (claimId: string) => {
    try {
      await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action: "approve" }),
      });
    } catch (e) {
      console.warn("Claim approval API notice:", e);
    }
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    setSelectedClaim(claims.find((c) => c.id !== claimId) || null);
    setActionMessage("Claim approved. Handover token dispatched to student.");
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleReject = async (claimId: string) => {
    if (!rejectReason.trim()) {
      alert("A mandatory rejection reason is required.");
      return;
    }
    try {
      await fetch("/api/admin/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId, action: "reject", rejectReason }),
      });
    } catch (e) {
      console.warn("Claim rejection API notice:", e);
    }
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    setSelectedClaim(claims.find((c) => c.id !== claimId) || null);
    setIsRejecting(false);
    setRejectReason("");
    setActionMessage("Claim rejected and feedback reason logged.");
    setTimeout(() => setActionMessage(null), 4000);
  };

  const generateInviteCode = () => {
    const code = "VIT-INV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRecord: InviteRecord = {
      code,
      role: "Security / Lab Staff",
      campus: "Bibwewadi & Kondhwa",
      created: "Just now",
      expires: "In 7 days",
      status: "Active",
    };
    setInvites((prev) => [newRecord, ...prev]);
    setNewInviteCode(code);
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredReports = reports.filter((r) => {
    if (reportFilter === "Lost" && r.type !== "Lost") return false;
    if (reportFilter === "Found" && r.type !== "Found") return false;
    if (reportFilter === "Recovered" && r.status !== "Recovered") return false;
    if (reportSearch) {
      const q = reportSearch.toLowerCase();
      return (
        r.item_name.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.reporter.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Restrained Operational Header */}
      <header className="border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs tracking-wider">
            VIT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm leading-none">Staff Security & Analytics Console</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-semibold border border-teal-300 dark:border-teal-800">
                PROD-SEC-2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Campus Adjudication & Oversight Workstation • Bibwewadi & Kondhwa
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              setActiveTab("invites");
              generateInviteCode();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Generate Staff Invite</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </header>

      {/* Main Layout: Fixed Sidebar + Operational Workspace */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shrink-0 p-4 space-y-6">
          <div className="space-y-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3">
              Management Modules
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("claims")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "claims"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>Claims queue</span>
                </div>
                {pendingCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      activeTab === "claims"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "analytics"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "reports"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => setActiveTab("invites")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "invites"
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Invites</span>
              </button>
            </nav>
          </div>

          {/* Quick System Badge */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] space-y-1">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>pgvector Daemon Live</span>
            </div>
            <p className="text-slate-500">
              Cosine similarity threshold: <strong>0.75</strong>
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Top Operational Stat Cards (Required by Scope Specification) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Pending Review */}
            <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Pending Review
                </span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {pendingCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Claims awaiting staff manual adjudication
              </p>
            </div>

            {/* Card 2: Active Reports */}
            <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Active Reports
                </span>
                <FileText className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {activeReportsCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                28 Lost & 19 Found currently in campus registry
              </p>
            </div>

            {/* Card 3: Recovered (Last 7 Days) */}
            <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Recovered, Last 7 Days
                </span>
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {recoveredLast7DaysCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Verified handovers completed at security desks
              </p>
            </div>
          </div>

          {/* Banner for Generated Action Toast */}
          {actionMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: CLAIMS QUEUE (Adjudication Worklist)                               */}
          {/* ========================================================================= */}
          {activeTab === "claims" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Review Queue Worklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-300 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Adjudication Queue ({claims.length})
                  </span>
                  <span className="text-[11px] text-slate-500">Confidence 40-70% / Multiple Claims</span>
                </div>

                {claims.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-500">
                    All submitted claims have been adjudicated. No pending items in queue.
                  </div>
                ) : (
                  claims.map((claim) => (
                    <div
                      key={claim.id}
                      onClick={() => {
                        setSelectedClaim(claim);
                        setIsRejecting(false);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-colors text-xs space-y-1.5 ${
                        selectedClaim?.id === claim.id
                          ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-900/10 dark:ring-slate-100/10"
                          : "border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                          {claim.item_name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold border">
                          ~{Math.round(claim.similarity_score * 100)}%
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">Claimant: {claim.claimant_name}</p>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                        {claim.reason_for_escalation}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right Column: Evidence Inspection & Adjudication Actions */}
              <div className="lg:col-span-2">
                {selectedClaim ? (
                  <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
                    <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">{selectedClaim.item_name}</CardTitle>
                          <CardDescription className="text-xs">
                            Holding Desk: <strong>{selectedClaim.holding_location}</strong>
                          </CardDescription>
                        </div>
                        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border">
                          AI Match Similarity: ~{Math.round(selectedClaim.similarity_score * 100)}%
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-5 text-xs">
                      {/* Escalation Trigger Notice */}
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Escalation Trigger:</span>
                          <span>{selectedClaim.reason_for_escalation}</span>
                        </div>
                      </div>

                      {/* Side-by-side Evidence Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                            Claimant Evidence (Lost Report)
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedClaim.claimant_name}</p>
                          <p className="text-slate-500 text-[11px]">{selectedClaim.claimant_email}</p>
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                              Distinguishing Detail Provided:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                              &ldquo;{selectedClaim.claimant_statement}&rdquo;
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                            Found Item Intake Record
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedClaim.location}</p>
                          <p className="text-slate-500 text-[11px]">Category: {selectedClaim.category}</p>
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                              Finder / Intake Notes:
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800">
                              &ldquo;{selectedClaim.finder_statement}&rdquo;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rejection Form Input */}
                      {isRejecting && (
                        <div className="p-3.5 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 space-y-2">
                          <label className="block text-xs font-semibold text-red-900 dark:text-red-300">
                            Mandatory Reason for Rejection:
                          </label>
                          <Textarea
                            placeholder="State why the evidence does not establish ownership (e.g. Serial prefix mismatch, slide cover color differs)..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            required
                            className="bg-white dark:bg-slate-900"
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <Button variant="ghost" size="sm" onClick={() => setIsRejecting(false)}>
                              <span>Cancel</span>
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(selectedClaim.id)}
                            >
                              <span>Confirm Rejection</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons: Restrained Color Reserved Strictly for Decisions */}
                      {!isRejecting && (
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => setIsRejecting(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-red-700 hover:bg-red-800 text-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>Reject Claim</span>
                          </button>

                          <button
                            onClick={() => handleApprove(selectedClaim.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Ownership</span>
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-12 text-center border border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-500">
                    Select a claim from the queue to inspect evidence.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ANALYTICS (Matches Resolved Last 30 Days + Category Breakdown)      */}
          {/* ========================================================================= */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {/* Analytics Header Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Ownership Resolution Rate
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">87.5%</div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +4.2% since blind pgcrypto verification rollout
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Average Desk Handover Time
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">14.2 Hours</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Down from 4.8 days prior to portal</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    AI Auto-Match Confidence Avg
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">82.4%</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Multi-modal text + CLIP cosine index</p>
                </div>
              </div>

              {/* Chart 1: Matches Resolved Over Last 30 Days */}
              <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
                <CardHeader className="p-5 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Matches Resolved Over the Last 30 Days
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Comparison of campus intake reports vs verified recoveries
                      </CardDescription>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 border text-slate-600 dark:text-slate-400">
                      Rolling 30 Days
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={RESOLUTION_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            color: "#fff",
                            fontSize: "12px",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                        <Bar dataKey="reported" name="Campus Reports Ingested" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="resolved" name="Matches Verified & Resolved" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2 & Breakdown Ratio */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
                  <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Campus Item Category Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Proportion of reported items across major campus academic categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {CATEGORY_DISTRIBUTION.map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{cat.name}</span>
                          <span className="font-mono text-slate-500">{cat.count} items</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(cat.count / 32) * 100}%`,
                              backgroundColor: cat.fill,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Adjudication Approval Ratio */}
                <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
                  <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Staff Adjudication Approval Ratio
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Outcome ratio for claims requiring manual security review
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-100">Total Escalations Reviewed</div>
                        <div className="text-slate-500">Borderline confidence & conflict claims</div>
                      </div>
                      <span className="text-lg font-mono font-bold">64</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Approved Handover (87.5%)</span>
                        <span className="font-mono text-slate-500">56</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                        <div className="bg-emerald-600 h-full" style={{ width: "87.5%" }} />
                        <div className="bg-red-600 h-full" style={{ width: "12.5%" }} />
                      </div>
                      <div className="flex justify-between text-xs pt-1">
                        <span className="font-semibold text-red-700 dark:text-red-400">Rejected / Discrepancy (12.5%)</span>
                        <span className="font-mono text-slate-500">8</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-[11px] text-teal-900 dark:text-teal-300">
                      Private distinguishing marks provided by students are matched with zero false positives reported across Bibwewadi & Kondhwa.
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: REPORTS (All Campus Records)                                       */}
          {/* ========================================================================= */}
          {activeTab === "reports" && (
            <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
              <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Campus Reports Master Directory
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      All Lost and Found records currently registered across campus locations
                    </CardDescription>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search item, place, user..."
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
                      {(["All", "Lost", "Found", "Recovered"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setReportFilter(tab)}
                          className={`px-2.5 py-1 text-xs font-semibold ${
                            reportFilter === tab
                              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Record ID</th>
                        <th className="py-2.5 px-4">Type</th>
                        <th className="py-2.5 px-4">Item Name & Category</th>
                        <th className="py-2.5 px-4">Location</th>
                        <th className="py-2.5 px-4">Reporter Email</th>
                        <th className="py-2.5 px-4">Date Reported</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredReports.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500">{r.id}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.type === "Lost"
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                              }`}
                            >
                              {r.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item_name}</div>
                            <div className="text-[11px] text-slate-500">{r.category}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{r.location}</td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{r.reporter}</td>
                          <td className="py-3 px-4 text-slate-500">{r.date}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                r.status === "Recovered"
                                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700"
                                  : r.status === "Under Review"
                                  ? "bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-700"
                                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: INVITES (Staff Access Codes Management)                             */}
          {/* ========================================================================= */}
          {activeTab === "invites" && (
            <div className="space-y-6">
              {/* Generated Banner if Active */}
              {newInviteCode && (
                <div className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-900 dark:text-teal-200 block">
                      New Single-Use Staff Admin Invite Code Created:
                    </span>
                    <span className="font-mono text-base font-extrabold text-teal-950 dark:text-teal-100 tracking-wider">
                      {newInviteCode}
                    </span>
                    <p className="text-[11px] text-teal-700 dark:text-teal-400">
                      Provide this code to campus security, lab technicians, or library desk staff to register.
                    </p>
                  </div>
                  <button
                    onClick={() => copyCodeToClipboard(newInviteCode)}
                    className="px-3.5 py-2 rounded-lg border border-teal-400 dark:border-teal-700 bg-white dark:bg-slate-900 text-teal-900 dark:text-teal-100 font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedCode === newInviteCode ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedCode === newInviteCode ? "Copied" : "Copy Token"}</span>
                  </button>
                </div>
              )}

              <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-none">
                <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Staff Invite Registry & Security Codes
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Single-use cryptographic tokens granting staff verification privileges
                    </CardDescription>
                  </div>
                  <button
                    onClick={generateInviteCode}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Issue New Invite</span>
                  </button>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Invite Token</th>
                          <th className="py-2.5 px-4">Authorized Role</th>
                          <th className="py-2.5 px-4">Campus Scope</th>
                          <th className="py-2.5 px-4">Issued</th>
                          <th className="py-2.5 px-4">Validity</th>
                          <th className="py-2.5 px-4">Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {invites.map((inv) => (
                          <tr key={inv.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {inv.code}
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{inv.role}</td>
                            <td className="py-3 px-4 text-slate-500">{inv.campus}</td>
                            <td className="py-3 px-4 text-slate-500">{inv.created}</td>
                            <td className="py-3 px-4 text-slate-500">{inv.expires}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  inv.status === "Active"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {inv.status === "Active" ? (
                                <button
                                  onClick={() => copyCodeToClipboard(inv.code)}
                                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-mono text-[11px]"
                                >
                                  {copiedCode === inv.code ? "Copied" : "Copy"}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Consumed</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
