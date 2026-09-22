"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Building, ShieldCheck, QrCode, ArrowRight, Printer, Share2 } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, StepIndicator, StatusBadge } from "@vit/ui";

export default function RecoveredPage({ params }: { params: { id: string } }) {
  const recoveryData = {
    itemName: "TI-84 Plus CE Graphing Calculator",
    token: "VIT-REC-89240",
    pickupDesk: "D-Block Security Counter (Ground Floor)",
    officer: "Officer Shinde (Campus Security)",
    holdingHours: "Monday to Saturday, 9:00 AM – 6:00 PM",
    timestamp: "Verified Today at 4:32 PM",
    reporterName: "Aditya Joshi",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Indicator */}
      <StepIndicator currentStep="recover" />

      {/* Main Success Card */}
      <Card className="border-emerald-300 dark:border-emerald-800 shadow-md">
        <CardHeader className="text-center pb-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="flex justify-center mb-1">
            <StatusBadge status="recovered" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Item Successfully Verified & Ready for Recovery
          </CardTitle>
          <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
            Ownership has been confirmed via blind vector verification.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6 text-xs">
          {/* Pickup Token Box */}
          <div className="p-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Official Pickup Handover Code
              </span>
              <span className="text-2xl font-mono font-extrabold text-emerald-900 dark:text-emerald-200 tracking-wider">
                {recoveryData.token}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Present this code and your physical VIT student ID card at the security counter.
              </p>
            </div>
            <div className="w-16 h-16 bg-white dark:bg-slate-900 p-2 rounded-lg border border-border flex items-center justify-center shadow-sm shrink-0">
              <QrCode className="w-12 h-12 text-slate-900 dark:text-slate-100" />
            </div>
          </div>

          {/* Custody & Pickup Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Physical Custody & Handover Desk
            </h4>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-border space-y-2.5">
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <Building className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold block">{recoveryData.pickupDesk}</span>
                  <span className="text-slate-500 text-[11px]">Primary Custody Officer: {recoveryData.officer}</span>
                </div>
              </div>
              <div className="text-slate-600 dark:text-slate-400 pt-1 border-t border-border">
                <span>Operational Hours: </span>
                <strong className="text-slate-800 dark:text-slate-200">{recoveryData.holdingHours}</strong>
              </div>
            </div>
          </div>

          {/* Handover Checklist */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              What to bring for pickup:
            </h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Original physical VIT Student / Faculty ID card (RFID)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>This digital confirmation screen or code <strong>{recoveryData.token}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sign the physical campus property ledger upon handover</span>
              </li>
            </ul>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Print Handover Pass</span>
            </Button>
            <Link href="/dashboard" className="flex-1">
              <Button variant="primary" size="md" className="w-full">
                <span>Return to Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
