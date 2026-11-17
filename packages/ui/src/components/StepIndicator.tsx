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
                    isDone ? "bg-[#3A7D80] dark:bg-teal-400" : "bg-slate-200 dark:bg-slate-800"
                  )}
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 shadow-xs",
                  isDone
                    ? "bg-[#3A7D80] border-[#3A7D80] text-white dark:bg-teal-500 dark:border-teal-500"
                    : isCurrent
                    ? "bg-[#23395B] border-[#23395B] text-white dark:bg-sky-400 dark:border-sky-400 dark:text-slate-950 shadow-md ring-4 ring-[#8ECAE6]/30 dark:ring-sky-400/20"
                    : "bg-white border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium tracking-tight transition-colors",
                  isCurrent
                    ? "text-[#23395B] dark:text-sky-300 font-bold"
                    : isDone
                    ? "text-[#3A7D80] dark:text-teal-400 font-semibold"
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
