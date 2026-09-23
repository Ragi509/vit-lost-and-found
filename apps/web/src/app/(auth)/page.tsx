"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
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
        // If Resend key is not wired yet, inform the user clearly while allowing fallback
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
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors">
      {/* Top Header */}
      <header className="border-b border-border py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            VIT
          </div>
          <div>
            <span className="font-bold text-base leading-none block">Lost & Found</span>
            <span className="text-[10px] text-muted-foreground">Vishwakarma Institute of Technology</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Hero & Auth Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left: Value Proposition */}
        <div className="flex-1 space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Assisted Campus Recovery Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-slate-100">
            Reclaim lost items on campus with cryptographic precision.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            No more lost calculators in WhatsApp batch chats or cluttered notice boards. Report lost or found belongings across Bibwewadi & Kondhwa campuses with multi-modal AI matching and secure blind verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-border bg-card">
              <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">Vector Matching</h4>
              <p className="text-xs text-muted-foreground mt-1">Multi-modal text & image similarity</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">Blind Verification</h4>
              <p className="text-xs text-muted-foreground mt-1">Private marks verified server-side</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">Official Desks</h4>
              <p className="text-xs text-muted-foreground mt-1">Direct recovery via security desks</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Link href="/browse">
              <Button variant="outline" size="md">
                <Search className="w-4 h-4 mr-2" />
                <span>Browse Campus Directory</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: Institutional Login Card */}
        <div className="w-full max-w-md">
          <Card className="shadow-lg border border-border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Campus Institutional Sign In</CardTitle>
              <CardDescription>
                {step === "email"
                  ? "Enter your official @vit.edu email to receive a sign-in OTP."
                  : `Enter the 6-digit code sent to ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {step === "email" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label="Institutional Email"
                    id="email"
                    type="email"
                    placeholder="ragini.kengale24@vit.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Restricted strictly to the official <code className="font-semibold text-foreground">@vit.edu</code> domain (Students, Faculty, Staff).
                  </p>
                  <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <Input
                    label="6-Digit OTP Code"
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                    <span>Verify & Continue</span>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setError(null);
                    }}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Use a different email
                  </button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Campus security or custody desk?{" "}
            <Link
              href="/staff/login"
              className="text-slate-700 dark:text-slate-300 hover:underline font-medium underline-offset-2"
            >
              Staff login
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
