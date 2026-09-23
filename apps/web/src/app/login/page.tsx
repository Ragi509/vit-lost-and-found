"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound, CheckCircle2, Compass } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { getStoredSession, syncUserWithSupabase } from "@/lib/auth/session";

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

      await syncUserWithSupabase(email);
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
      <Card className="border border-slate-300 dark:border-slate-800 shadow-lg bg-card">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-900/50">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Sign In</span>
            </div>
            <Link
              href="/browse"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse Items</span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-extrabold text-foreground">
            {step === "email" ? "Sign In to VIT Account" : "Enter Verification Code"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {step === "email"
              ? "Access your dashboard, submit claims, and view verified profile credentials."
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-teal-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1">
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
                <span className="text-[11px] text-muted-foreground block">
                  Only official <code className="font-semibold text-foreground">@vit.edu</code> email addresses are permitted.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                <span>Continue with VIT Email</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1">
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
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Code expires in 10 minutes</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setError(null);
                    }}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
                  >
                    Change email
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
              >
                <span>Verify & Sign In</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-border flex flex-col gap-2 text-center text-xs text-muted-foreground">
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center gap-1.5 hover:text-foreground transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Campus Security or Staff? Sign in here</span>
            </Link>
            <Link
              href="/"
              className="hover:text-foreground transition-colors text-[11px]"
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
    <div className="w-full max-w-md mx-auto p-8 text-center text-sm text-muted-foreground">
      Loading sign-in portal...
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors">
      {/* Header */}
      <header className="border-b border-border py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            VIT
          </div>
          <div>
            <span className="font-bold text-base leading-none block">Lost & Found</span>
            <span className="text-[10px] text-muted-foreground">Vishwakarma Institute of Technology</span>
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
