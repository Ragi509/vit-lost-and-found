import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive" | "accent";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading = false, children, disabled, ...props }, ref) => {
    const variantStyles = {
      primary: "bg-[#23395B] text-white hover:bg-[#1b2d48] dark:bg-sky-400 dark:text-slate-950 dark:hover:bg-sky-300 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0",
      secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700/80 hover:-translate-y-0.5 active:translate-y-0",
      outline: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0",
      ghost: "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100",
      destructive: "bg-[#D95D5D] text-white hover:bg-[#c64d4d] dark:bg-red-600 dark:hover:bg-red-500 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0",
      accent: "bg-[#3A7D80] text-white hover:bg-[#2e6366] dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
      md: "h-10 px-4 text-sm rounded-xl gap-2",
      lg: "h-12 px-6 text-base rounded-xl gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium tracking-tight transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#23395B]/40 dark:focus-visible:ring-sky-400/40 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
