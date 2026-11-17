import React from "react";
import { Sparkles, FileText, Image as ImageIcon, Tag } from "lucide-react";
import { cn } from "../lib/utils";

interface ConfidenceMeterProps {
  confidenceScore: number; // 0 to 1
  textScore?: number;      // 0 to 1
  imageScore?: number;     // 0 to 1
  categoryScore?: number;  // 0 to 1
  showBreakdown?: boolean;
  className?: string;
}

export const ConfidenceMeter: React.FC<ConfidenceMeterProps> = ({
  confidenceScore,
  textScore,
  imageScore,
  categoryScore,
  showBreakdown = true,
  className,
}) => {
  // Format as approximate percentage e.g. ~92%
  const percentage = Math.round(confidenceScore * 100);
  const approximateLabel = `~${percentage}% match`;

  // Color tone based on confidence bracket
  const getBadgeColor = (score: number) => {
    if (score >= 0.8) return "bg-teal-50 text-[#3A7D80] border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60";
    if (score >= 0.5) return "bg-sky-50 text-sky-800 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const getBarColor = (score: number) => {
    if (score >= 0.8) return "bg-gradient-to-r from-teal-500 to-[#3A7D80]";
    if (score >= 0.5) return "bg-gradient-to-r from-sky-400 to-[#23395B]";
    return "bg-slate-400 dark:bg-slate-500";
  };

  return (
    <div className={cn("p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 text-card-foreground shadow-xs space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/60 flex items-center justify-center text-[#3A7D80] dark:text-teal-300">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            AI Similarity Score
          </span>
        </div>
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border tracking-tight shadow-xs", getBadgeColor(confidenceScore))}>
          {approximateLabel}
        </span>
      </div>

      {/* Main bar */}
      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getBarColor(confidenceScore))}
          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
        />
      </div>

      {/* Breakdown Factors */}
      {showBreakdown && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-xs">
          {textScore !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>Text: <strong className="font-medium text-slate-900 dark:text-slate-200">~{Math.round(textScore * 100)}%</strong></span>
            </div>
          )}
          {imageScore !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>Image: <strong className="font-medium text-slate-900 dark:text-slate-200">~{Math.round(imageScore * 100)}%</strong></span>
            </div>
          )}
          {categoryScore !== undefined && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Tag className="w-3.5 h-3.5 shrink-0 text-slate-500" />
              <span>Category: <strong className="font-medium text-slate-900 dark:text-slate-200">{categoryScore > 0.5 ? "Match" : "Diff"}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
