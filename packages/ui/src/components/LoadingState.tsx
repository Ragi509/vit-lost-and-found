import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface LoadingStateProps {
  steps?: string[];
  intervalMs?: number;
  className?: string;
}

const defaultSteps = [
  "Analyzing your report details...",
  "Generating multi-modal embedding vectors...",
  "Scanning campus database for potential matches...",
  "Calculating cosine similarity across text & photo...",
  "Synthesizing match confidence score...",
];

export const LoadingState: React.FC<LoadingStateProps> = ({
  steps = defaultSteps,
  intervalMs = 1800,
  className,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (steps.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1 < steps.length ? prev + 1 : prev));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [steps, intervalMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl bg-card border shadow-sm",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-teal-500/20 animate-ping absolute inset-0" />
        <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shadow-md">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400 dark:text-teal-600" />
        </div>
      </div>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 min-h-[1.5rem] transition-opacity duration-300">
        {steps[currentStepIndex]}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Please wait while the AI matching engine processes your request
      </p>
    </div>
  );
};
