"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, User, PlusCircle, Compass, Home } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(1);

  useEffect(() => {
    const updateSession = () => {
      const s = getStoredSession();
      setUser(s);
    };

    updateSession();
    window.addEventListener("vit_session_updated", updateSession);

    // Check notifications
    const supabase = createClient();
    const checkNotifs = async () => {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("read_status", false);
        if (count !== null && count !== undefined) {
          setUnreadCount(count > 0 ? count : 1);
        }
      } catch (e) {
        console.warn("Notifications badge count notice:", e);
      }
    };
    checkNotifs();

    // Realtime notification channel
    const channel = supabase
      .channel("navbar_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          checkNotifs();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("vit_session_updated", updateSession);
      supabase.removeChannel(channel);
    };
  }, []);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/browse", label: "Browse", icon: Compass },
    { href: "/my-reports", label: "My Reports", icon: Search },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "VIT";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            VIT
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm sm:text-base leading-none text-slate-900 dark:text-slate-100">
              Lost & Found
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Vishwakarma Institute of Technology
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-600 text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons & Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/report/lost"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Report Lost</span>
            </Link>
            <Link
              href="/report/found"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <span>Report Found</span>
            </Link>
          </div>

          <ThemeToggle />

          <Link
            href="/profile"
            aria-label="User Profile"
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-teal-500/30 transition-all shadow-sm"
          >
            {getInitials(user?.fullName || "Ragini Kengale")}
          </Link>
        </div>
      </div>
    </header>
  );
}
