import React from "react";
import { cn } from "../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, label, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23395B]/20 dark:focus-visible:ring-sky-400/30 focus:border-[#23395B] dark:focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[#D95D5D] focus-visible:ring-[#D95D5D]/25 focus:border-[#D95D5D]",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-[#D95D5D]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
