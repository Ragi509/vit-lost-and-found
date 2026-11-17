"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2, AlertCircle, Clock, RefreshCw, KeyRound } from "lucide-react";
import { Button, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, LoadingState } from "@vit/ui";
import { getStoredSession } from "@/lib/auth/session";

export default function ClaimVerificationPage({ params }: { params: { matchId: string } }) {
  const router = useRouter();
  const [detailInput, setDetailInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<"approved" | "escalated" | "rejected" | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationResult(null);
    setErrorMsg(null);

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

      const res = await fetch("/api/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: params.matchId,
          claimantId: session?.id,
          submittedSecretText: detailInput,
        }),
      });

      const data = await res.json();
      setIsVerifying(false);

      if (res.ok && data.result) {
        setSimilarity(data.similarity_score);
        setVerificationResult(data.result);
      } else {
        setErrorMsg(data.error || "Verification request failed. Please check your network or try again.");
      }
    } catch (err: any) {
      console.error("Verification API error:", err);
      setIsVerifying(false);
      setErrorMsg(err.message || "Unable to reach verification service.");
    }
  };

  if (isVerifying) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <LoadingState
          steps={[
            "Hashing and embedding your submitted distinguishing detail...",
            "Decrypting reference secret embedding in protected server memory...",
            "Computing cosine similarity vector distance server-side...",
            "Evaluating verification thresholds (Auto-approve >=80%, Escalate 50-79%)...",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          href={`/matches/${params.matchId}`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#23395B] dark:hover:text-slate-200 mb-2 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Match Detail</span>
        </Link>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-[#3A7D80] dark:text-teal-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#3A7D80] dark:text-teal-300">
            Trust-Critical Verification
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
          Blind Ownership Verification
        </h1>
        <p className="text-sm text-[#718096] dark:text-slate-400 mt-1">
          To prevent unauthorized claims, describe the private identifying mark you registered when reporting your lost item.
        </p>
      </div>

      {/* Result States */}
      {verificationResult === "approved" && (
        <Card className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md overflow-hidden animate-fadeIn">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
              Ownership Verified (~{Math.round((similarity || 0.88) * 100)}% Similarity)
            </CardTitle>
            <CardDescription className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              Your submitted description matched the registered encrypted secret above the 80% threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 pb-6 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              The item status has been updated to <strong className="text-emerald-900 dark:text-emerald-200">Recovered</strong>. Please view the pickup instructions for custody handover at the campus security desk.
            </p>
            <Link href={`/recovered/${params.matchId}`}>
              <Button variant="accent" size="md" className="rounded-xl shadow-xs">
                <span>View Pickup Instructions & Verification Token</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {verificationResult === "escalated" && (
        <Card className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 shadow-md overflow-hidden animate-fadeIn">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-amber-950 dark:text-amber-100">
              Claim Escalated for Staff Review (~{Math.round((similarity || 0.62) * 100)}% Similarity)
            </CardTitle>
            <CardDescription className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              Your answer showed partial similarity (50%–79%). Instead of auto-rejecting, this claim has been routed to the Staff Admin queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 pb-6 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              A campus administrator will review both descriptions at the holding desk and verify in person. You will receive an in-app alert once adjudicated.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="rounded-xl">
                  <span>Return to Dashboard</span>
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setVerificationResult(null);
                  setDetailInput("");
                }}
              >
                <span>Edit Submission</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {verificationResult === "rejected" && (
        <Card className="rounded-2xl border border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 shadow-md overflow-hidden animate-fadeIn">
          <CardHeader className="text-center pb-2 pt-6">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold text-red-950 dark:text-red-100">
              Verification Unsuccessful (~{Math.round((similarity || 0.31) * 100)}% Similarity)
            </CardTitle>
            <CardDescription className="text-xs text-red-800 dark:text-red-300 font-medium">
              The details provided did not align sufficiently with the registered secret (&lt; 50%).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2 pb-6 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
              You are not locked out. Please review what specific physical feature or marking you recorded when filing your report, then retry.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl shadow-xs"
              onClick={() => {
                setVerificationResult(null);
                setDetailInput("");
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retry Verification</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Blind Submission Form */}
      {!verificationResult && (
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden">
          <CardHeader className="pb-4 pt-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#3A7D80] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#202B3C] dark:text-slate-100">
                  Enter Distinguishing Detail Blind
                </CardTitle>
                <CardDescription className="text-xs text-[#718096]">
                  Zero hint is provided. Enter the unique mark, serial snippet, or physical feature that proves this item is yours.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">Examples of valid answers:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>&ldquo;Scratch on top right screen bezel, silver marker initials inside battery tray&rdquo;</li>
                  <li>&ldquo;Small tear on bottom left seam, contains a blue Parker pen inside&rdquo;</li>
                  <li>&ldquo;Serial number prefix 3892-A stamped on the bottom plate&rdquo;</li>
                </ul>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Textarea
                label="Your Ownership Detail"
                id="detailInput"
                placeholder="Enter the distinguishing detail you previously registered..."
                value={detailInput}
                onChange={(e) => setDetailInput(e.target.value)}
                required
                className="min-h-[120px]"
              />

              <Button type="submit" variant="primary" size="lg" className="w-full rounded-xl shadow-sm text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 mr-2" />
                <span>Submit Proof of Ownership</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
