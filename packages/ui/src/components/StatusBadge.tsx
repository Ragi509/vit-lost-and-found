import React from "react";
import { Search, Sparkles, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

export type ReportStatus =
  | "searching"
  | "matched"
  | "verification_required"
  | "recovered";

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

const statusConfig: Record<
  ReportStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; style: string }
> = {
  searching: {
    label: "Searching",
    icon: Search,
    style: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
  },
  matched: {
    label: "Matched",
    icon: Sparkles,
    style: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
  },
  verification_required: {
    label: "Verification Required",
    icon: ShieldAlert,
    style: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
  },
  recovered: {
    label: "Recovered",
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || statusConfig.searching;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors shadow-sm",
        config.style,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};
