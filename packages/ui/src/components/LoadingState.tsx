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

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 p-5 shadow-xs space-y-4 animate-pulse",
        className
      )}
    >
      <div className="w-full h-40 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-slate-200/80 dark:bg-slate-800/80 rounded-md" />
        <div className="h-3 w-1/2 bg-slate-200/60 dark:bg-slate-800/60 rounded-md" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-6 w-20 bg-slate-200/60 dark:bg-slate-800/60 rounded-full" />
        <div className="h-6 w-16 bg-slate-200/60 dark:bg-slate-800/60 rounded-md" />
      </div>
    </div>
  );
};

export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className,
}) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
