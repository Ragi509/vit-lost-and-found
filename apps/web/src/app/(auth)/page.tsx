"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, ShieldCheck, Sparkles, CheckCircle2, AlertCircle, Building2, KeyRound } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { syncUserWithSupabase } from "@/lib/auth/session";

export default function LandingLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Domain-only validation: Must end in @vit.edu (allows student name+year as well as staff/faculty patterns)
  const validateEmailDomain = (inputEmail: string): boolean => {
    const clean = inputEmail.trim().toLowerCase();
    return clean.endsWith("@vit.edu");
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email) {
      setError("Please enter your institutional email.");
      return;
    }

    if (!validateEmailDomain(email)) {
      setError(
        "Access is restricted to official VIT institutional emails (must end in @vit.edu). Non-institutional addresses are blocked."
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (res.ok && data.success) {
        setStep("otp");
        if (data.message) {
          setInfoMessage(data.message);
        }
      } else {
        if (data.error && data.error.includes("RESEND_API_KEY")) {
          setError("Resend API Key is not yet configured. Please provide your Resend API key to enable live email delivery.");
        } else {
          setError(data.error || "Failed to dispatch verification email.");
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Failed to connect to authentication service.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.length < 6) {
      setError("Please enter the 6-digit OTP code sent to your VIT email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid verification code.");
        setIsLoading(false);
        return;
      }

      await syncUserWithSupabase(email);
      setIsLoading(false);
      router.push("/dashboard");
    } catch (err: any) {
      console.warn("User session sync error:", err);
      setError("An error occurred during verification. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9FC] dark:bg-slate-950 text-[#202B3C] dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 py-3.5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#23395B] to-[#3A7D80] text-white flex items-center justify-center font-extrabold text-sm tracking-wider shadow-sm">
            VIT
          </div>
          <div>
            <span className="font-extrabold text-base leading-none block text-[#202B3C] dark:text-slate-100">
              Lost & Found
            </span>
            <span className="text-[10px] text-[#718096] dark:text-slate-400 font-medium">
              Vishwakarma Institute of Technology, Pune
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/browse"
            className="text-xs font-semibold text-[#718096] hover:text-[#23395B] dark:hover:text-slate-200 hidden sm:inline-flex items-center gap-1.5 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Campus Catalog</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* Left: Value Proposition */}
        <div className="flex-1 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#3A7D80] border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>AI-Assisted Campus Recovery Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.12] text-[#202B3C] dark:text-slate-100">
            Reclaim lost items on campus with <span className="text-[#23395B] dark:text-sky-400">AI precision</span> & cryptographic trust.
          </h1>

          <p className="text-base sm:text-lg text-[#718096] dark:text-slate-300 leading-relaxed">
            No more lost calculators in WhatsApp batch chats or cluttered notice boards. Report lost or found belongings across Bibwewadi & Kondhwa campuses with multi-modal AI matching and secure blind verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#3A7D80] flex items-center justify-center mb-2.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202B3C] dark:text-slate-100">Vector Matching</h4>
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-1">Multi-modal text & image similarity</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202B3C] dark:text-slate-100">Blind Verification</h4>
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-1">Private marks verified server-side</p>
            </div>
            <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2.5">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202B3C] dark:text-slate-100">Custody Desks</h4>
              <p className="text-xs text-[#718096] dark:text-slate-400 mt-1">Direct recovery via security desks</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/browse">
              <Button variant="outline" size="md" className="rounded-xl shadow-xs">
                <Search className="w-4 h-4 mr-2 text-[#3A7D80]" />
                <span>Browse Campus Directory</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Institutional Login Card */}
        <div className="w-full max-w-md">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="space-y-1.5 p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3A7D80] dark:text-teal-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Institutional Authentication</span>
              </div>
              <CardTitle className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100">
                {step === "email" ? "Student & Staff Sign In" : "Enter Verification OTP"}
              </CardTitle>
              <CardDescription className="text-xs text-[#718096]">
                {step === "email"
                  ? "Enter your official @vit.edu email to receive a secure sign-in OTP."
                  : `Enter the 6-digit code dispatched to ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 sm:p-7 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-[#3A7D80] dark:text-teal-200 flex items-start gap-2 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3A7D80]" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {step === "email" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Input
                      label="VIT Institutional Email"
                      id="email"
                      type="email"
                      placeholder="ragini.kengale24@vit.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-[#718096] font-medium">
                      Restricted strictly to the official <code className="font-bold text-[#202B3C] dark:text-slate-200">@vit.edu</code> domain (Students, Faculty, Staff).
                    </p>
                  </div>
                  <Button type="submit" variant="primary" className="w-full rounded-xl shadow-xs text-sm font-semibold" isLoading={isLoading}>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Input
                      label="6-Digit OTP Code"
                      id="otp"
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      className="font-mono text-center tracking-widest text-lg"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full rounded-xl shadow-xs text-sm font-semibold" isLoading={isLoading}>
                    <span>Verify & Continue</span>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    className="w-full text-center text-xs text-[#718096] hover:text-[#202B3C] dark:hover:text-slate-200 transition-colors pt-1 font-medium"
                  >
                    Use a different email address
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <Link
                  href="/staff/login"
                  className="inline-flex items-center gap-1.5 text-xs text-[#718096] hover:text-[#23395B] dark:hover:text-slate-200 font-medium transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#3A7D80]" />
                  <span>Campus Security or Staff? Sign in here</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
