"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Check, X, AlertTriangle, KeyRound, Copy, CheckCircle2, Filter, LogOut } from "lucide-react";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, StatusBadge } from "@vit/ui";

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

export default function AdminConsolePage() {
  const [claims, setClaims] = useState<PendingClaim[]>(INITIAL_CLAIMS);
  const [selectedClaim, setSelectedClaim] = useState<PendingClaim | null>(INITIAL_CLAIMS[0] || null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Invite generation state
  const [newInviteCode, setNewInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleApprove = (claimId: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    setSelectedClaim(claims.find((c) => c.id !== claimId) || null);
    setActionMessage("Claim approved. Handover confirmation token dispatched to claimant.");
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleReject = (claimId: string) => {
    if (!rejectReason.trim()) {
      alert("A mandatory rejection reason is required.");
      return;
    }
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
    setSelectedClaim(claims.find((c) => c.id !== claimId) || null);
    setIsRejecting(false);
    setRejectReason("");
    setActionMessage("Claim rejected and feedback reason recorded.");
    setTimeout(() => setActionMessage(null), 4000);
  };

  const generateInviteCode = () => {
    const code = "VIT-INV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewInviteCode(code);
    setCopied(false);
  };

  const copyInviteCode = () => {
    if (!newInviteCode) return;
    navigator.clipboard.writeText(newInviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Plainer, Worklist-Focused Header */}
      <header className="border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs">
            VIT
          </div>
          <div>
            <span className="font-bold text-sm leading-none block">Staff Security Console</span>
            <span className="text-[10px] text-slate-500">Adjudication Worklist • Bibwewadi & Kondhwa</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={generateInviteCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Issue Admin Invite</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Link>
        </div>
      </header>

      {/* Main Worklist Split Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Banner for Generated Invite Code */}
        {newInviteCode && (
          <div className="p-3.5 rounded border border-slate-400 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold block">Generated Single-Use Staff Admin Invite Code:</span>
              <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{newInviteCode}</span>
              <p className="text-[11px] text-slate-500">Valid for 7 days. Give this to new campus security or lab staff.</p>
            </div>
            <button
              onClick={copyInviteCode}
              className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 flex items-center gap-1 bg-slate-100 dark:bg-slate-800"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Code"}</span>
            </button>
          </div>
        )}

        {actionMessage && (
          <div className="p-3 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Review Queue Worklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-300 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Pending Adjudication ({claims.length})
              </span>
              <span className="text-[11px] text-slate-500">Confidence 40-70% / Conflicts</span>
            </div>

            {claims.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs text-slate-500">
                No claims pending review. All campus reports adjudicated.
              </div>
            ) : (
              claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => {
                    setSelectedClaim(claim);
                    setIsRejecting(false);
                  }}
                  className={`p-3.5 rounded border cursor-pointer transition-colors text-xs space-y-1 ${
                    selectedClaim?.id === claim.id
                      ? "border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-900 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{claim.item_name}</span>
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold">
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

          {/* Right Column: Evidence Inspection & Actions */}
          <div className="lg:col-span-2">
            {selectedClaim ? (
              <Card className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded shadow-none">
                <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{selectedClaim.item_name}</CardTitle>
                      <CardDescription className="text-xs">
                        Holding Desk: <strong>{selectedClaim.holding_location}</strong>
                      </CardDescription>
                    </div>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border">
                      AI Similarity: ~{Math.round(selectedClaim.similarity_score * 100)}%
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5 text-xs">
                  {/* Escalation Context */}
                  <div className="p-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-300">
                    <span className="font-semibold block">Escalation Trigger:</span>
                    <span>{selectedClaim.reason_for_escalation}</span>
                  </div>

                  {/* Side-by-side Evidence (Secrets masked) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                        Claimant Submission
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedClaim.claimant_name}</p>
                      <p className="text-slate-500 text-[11px]">{selectedClaim.claimant_email}</p>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                          Distinguishing Detail Provided:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          &ldquo;{selectedClaim.claimant_statement}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                        Found Item Intake Details
                      </span>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedClaim.location}</p>
                      <p className="text-slate-500 text-[11px]">Category: {selectedClaim.category}</p>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">
                          Finder / Intake Notes:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
                          &ldquo;{selectedClaim.finder_statement}&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Form Input */}
                  {isRejecting && (
                    <div className="p-3.5 rounded border border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20 space-y-2">
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

                  {/* Action Buttons (Color reserved strictly for Approve/Reject) */}
                  {!isRejecting && (
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setIsRejecting(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-red-700 hover:bg-red-800 text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject Claim</span>
                      </button>

                      <button
                        onClick={() => handleApprove(selectedClaim.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Ownership</span>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="p-12 text-center border border-slate-300 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-xs text-slate-500">
                Select a pending claim from the queue to inspect evidence.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
