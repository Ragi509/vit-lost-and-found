import React from "react";
import { Search, Sparkles, ShieldAlert, CheckCircle2, UserCheck } from "lucide-react";
import { cn } from "../lib/utils";

export type ReportStatus =
  | "searching"
  | "matched"
  | "verification_required"
  | "recovered"
  | "under_human_review"
  | "escalated";

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; style: string; dot: string }
> = {
  searching: {
    label: "Searching",
    icon: Search,
    style: "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
    dot: "bg-sky-500",
  },
  matched: {
    label: "Matched",
    icon: Sparkles,
    style: "bg-teal-50 text-[#3A7D80] border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60 font-semibold",
    dot: "bg-[#3A7D80] animate-pulse",
  },
  verification_required: {
    label: "Action Required",
    icon: ShieldAlert,
    style: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    dot: "bg-amber-500",
  },
  recovered: {
    label: "Recovered",
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
  },
  under_human_review: {
    label: "In Review",
    icon: UserCheck,
    style: "bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
  },
  escalated: {
    label: "In Review",
    icon: UserCheck,
    style: "bg-indigo-50 text-indigo-800 border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
    dot: "bg-indigo-500",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.searching;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border tracking-tight transition-all duration-150 shadow-xs",
        config.style,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span>{config.label}</span>
    </span>
  );
};
