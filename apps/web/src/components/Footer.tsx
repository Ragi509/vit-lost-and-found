import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Vishwakarma Institute of Technology, Pune
          </p>
          <p className="mt-0.5">
            Centralized Campus Lost & Found System • 666, Upper Indiranagar, Bibwewadi, Pune 411037
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/browse" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Browse Directory
          </Link>
          <Link href="/profile" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            Profile Settings
          </Link>
          {/* Discreet Staff Login Link (Low-emphasis secondary text link) */}
          <Link
            href="/staff/login"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors underline-offset-4 hover:underline"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Staff login</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
