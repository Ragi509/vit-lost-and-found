import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#23395B] dark:bg-sky-400 text-white dark:text-slate-950 flex items-center justify-center font-bold text-xs tracking-wider shadow-xs">
            VIT
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Vishwakarma Institute of Technology, Pune
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Campus Lost & Found Platform • Bibwewadi, Pune 411037
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/browse" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            Browse Catalog
          </Link>
          <Link href="/matches" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            AI Matches
          </Link>
          <Link href="/profile" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
            Profile
          </Link>
          {/* Discreet Staff Login Link */}
          <Link
            href="/staff/login"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-all font-medium text-[11px] hover:shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3A7D80] dark:text-sky-400" />
            <span>Staff Portal</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
