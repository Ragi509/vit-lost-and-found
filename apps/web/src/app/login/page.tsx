"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound, CheckCircle2, Compass } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { getStoredSession, setStoredSession, syncUserWithSupabase } from "@/lib/auth/session";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated, redirect to destination
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      router.replace(redirectTarget);
    }
  }, [router, redirectTarget]);

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
        "Access is restricted to official VIT institutional emails (must end in @vit.edu)."
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
          setError("Resend API Key is not configured. Please contact administrator or check server configuration.");
        } else {
          setError(data.error || "Failed to dispatch verification code.");
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
        setError(data.error || "Invalid or expired verification code.");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        setStoredSession(data.session);
      } else {
        await syncUserWithSupabase(email);
      }
      setIsLoading(false);

      // Successfully authenticated -> forward to the intended destination (e.g. /profile)
      const destination = redirectTarget.startsWith("/") ? redirectTarget : "/dashboard";
      router.push(destination);
    } catch (err: any) {
      console.warn("User session sync error:", err);
      setError("An error occurred during verification. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="space-y-1.5 p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#3A7D80] dark:text-teal-300 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-900/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Sign In</span>
            </div>
            <Link
              href="/browse"
              className="text-xs font-semibold text-[#718096] hover:text-[#202B3C] dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse Items</span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-extrabold text-[#202B3C] dark:text-slate-100 pt-1">
            {step === "email" ? "Sign In to VIT Account" : "Enter Verification Code"}
          </CardTitle>
          <CardDescription className="text-xs text-[#718096]">
            {step === "email"
              ? "Access your dashboard, manage claims, and inspect campus recoveries."
              : `Enter the 6-digit code sent to ${email}`}
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
                  placeholder="firstname.lastnameYY@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <span className="text-[11px] text-[#718096] block font-medium">
                  Only official <code className="font-bold text-[#202B3C] dark:text-slate-200">@vit.edu</code> email addresses are permitted.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-xl shadow-xs text-sm font-semibold"
                isLoading={isLoading}
              >
                <span>Continue with VIT Email</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Input
                  label="6-Digit Verification Code"
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                  className="font-mono text-center tracking-widest text-lg"
                />
                <div className="flex items-center justify-between text-[11px] text-[#718096] pt-1 font-medium">
                  <span>Code expires in 10 minutes</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError(null);
                    }}
                    className="text-[#3A7D80] hover:text-[#23395B] dark:text-teal-400 hover:underline font-semibold"
                  >
                    Change email
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-xl shadow-xs text-sm font-semibold"
                isLoading={isLoading}
              >
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 text-center text-xs text-[#718096]">
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center gap-1.5 font-medium hover:text-[#23395B] dark:hover:text-slate-200 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#3A7D80]" />
              <span>Campus Security or Staff? Sign in here</span>
            </Link>
            <Link
              href="/"
              className="hover:text-[#23395B] dark:hover:text-slate-200 transition-colors text-[11px] font-medium"
            >
              ← Back to Campus Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoginLoadingSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto p-12 text-center text-sm text-[#718096]">
      <div className="w-8 h-8 rounded-full border-2 border-[#23395B] border-t-transparent animate-spin mx-auto mb-3" />
      <p>Loading sign-in portal...</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9FC] dark:bg-slate-950 text-[#202B3C] dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 py-3.5 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
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
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <Suspense fallback={<LoginLoadingSkeleton />}>
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
