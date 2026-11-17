import React from "react";
import { FolderSearch } from "lucide-react";
import { cn } from "../lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderSearch,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 backdrop-blur-xs transition-all",
        className
      )}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[#3A7D80] dark:text-sky-300 shadow-xs mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
