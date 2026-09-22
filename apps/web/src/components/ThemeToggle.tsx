"use client";

import React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "./Providers";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 text-slate-500">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label="Light mode"
        className={`rounded-md p-1.5 transition-colors ${
          theme === "light"
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            : "hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label="Dark mode"
        className={`rounded-md p-1.5 transition-colors ${
          theme === "dark"
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            : "hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        aria-label="System preference"
        className={`rounded-md p-1.5 transition-colors ${
          theme === "system"
            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            : "hover:text-slate-900 dark:hover:text-slate-100"
        }`}
      >
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  );
}
