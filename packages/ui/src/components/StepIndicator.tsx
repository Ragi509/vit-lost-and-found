import React from "react";
import { FileText, Sparkles, ShieldCheck, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

export type StepKey = "report" | "match" | "verify" | "recover";

interface StepIndicatorProps {
  currentStep: StepKey;
  className?: string;
}

const steps: { key: StepKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "report", label: "Report", icon: FileText },
  { key: "match", label: "Match", icon: Sparkles },
  { key: "verify", label: "Verify", icon: ShieldCheck },
  { key: "recover", label: "Recover", icon: CheckCircle },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, className }) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <nav aria-label="Progress" className={cn("w-full py-3", className)}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <li key={step.key} className="relative flex-1 flex flex-col items-center">
              {idx !== 0 && (
                <div
                  className={cn(
                    "absolute top-4 -left-1/2 w-full h-0.5 -z-0 transition-colors duration-300",
                    isDone ? "bg-teal-600 dark:bg-teal-500" : "bg-slate-200 dark:bg-slate-700"
                  )}
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300",
                  isDone
                    ? "bg-teal-600 border-teal-600 text-white dark:bg-teal-500 dark:border-teal-500"
                    : isCurrent
                    ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-md ring-4 ring-teal-500/20"
                    : "bg-white border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-500"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-tight transition-colors",
                  isCurrent
                    ? "text-slate-900 dark:text-slate-100 font-semibold"
                    : isDone
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
