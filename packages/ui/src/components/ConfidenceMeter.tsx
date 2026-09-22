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
    if (score >= 0.8) return "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800";
    if (score >= 0.5) return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  };

  const getBarColor = (score: number) => {
    if (score >= 0.8) return "bg-teal-600 dark:bg-teal-400";
    if (score >= 0.5) return "bg-blue-600 dark:bg-blue-400";
    return "bg-slate-400 dark:bg-slate-500";
  };

  return (
    <div className={cn("p-4 rounded-xl border bg-card text-card-foreground shadow-sm space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI Similarity Score
          </span>
        </div>
        <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", getBadgeColor(confidenceScore))}>
          {approximateLabel}
        </span>
      </div>

      {/* Main bar */}
      <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
