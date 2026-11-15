"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Sparkles, PlusCircle, Compass, Home } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [unreadMatches, setUnreadMatches] = useState<number>(0);

  useEffect(() => {
    const updateSession = () => {
      const s = getStoredSession();
      setUser(s);
    };

    updateSession();
    window.addEventListener("vit_session_updated", updateSession);

    // Fetch live badges
    const fetchBadges = async () => {
      try {
        const s = getStoredSession();
        const userId = s?.id;
        const email = s?.email;
        const queryParams = new URLSearchParams();
        if (userId) queryParams.set("userId", userId);
        if (email) queryParams.set("email", email);

        // Fetch unread notifications count
        const notifRes = await fetch(`/api/notifications?${queryParams.toString()}`);
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          if (Array.isArray(notifData.notifications)) {
            const unread = notifData.notifications.filter((n: any) => !n.read).length;
            setUnreadNotifs(unread);
          }
        }

        // Fetch unread/suggested AI matches count
        const matchRes = await fetch(`/api/matches?${queryParams.toString()}`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          if (typeof matchData.unreadCount === "number") {
            setUnreadMatches(matchData.unreadCount);
          } else if (Array.isArray(matchData.matches)) {
            const pending = matchData.matches.filter((m: any) => m.status === "suggested").length;
            setUnreadMatches(pending);
          }
        }
      } catch (e) {
        console.warn("Navbar badges notice:", e);
      }
    };

    fetchBadges();

    // Realtime listener
    const supabase = createClient();
    const channel = supabase
      .channel("navbar_realtime_badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchBadges()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => fetchBadges()
      )
      .subscribe();

    return () => {
      window.removeEventListener("vit_session_updated", updateSession);
      supabase.removeChannel(channel);
    };
  }, []);

  // Strict Navigation Order per prompt:
  // Dashboard, Report Lost, Report Found, AI Matches, Browse, My Reports, Notifications, Profile
  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/report/lost", label: "Report Lost", icon: PlusCircle },
    { href: "/report/found", label: "Report Found", icon: PlusCircle },
    { href: "/matches", label: "AI Matches", icon: Sparkles, badge: unreadMatches },
    { href: "/browse", label: "Browse", icon: Compass },
    { href: "/my-reports", label: "My Reports", icon: Search },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadNotifs },
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
        <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            VIT
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none text-slate-900 dark:text-slate-100">
              Lost & Found
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Vishwakarma Institute of Technology
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors relative ${
                  isActive
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-teal-600 text-white leading-tight">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile quick links or Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/matches"
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
            title="AI Matches"
          >
            <Sparkles className="w-4 h-4" />
            {unreadMatches > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-white dark:ring-slate-950" />
            )}
          </Link>

          <ThemeToggle />

          <Link
            href="/profile"
            aria-label="User Profile"
            className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-teal-500/30 transition-all shadow-sm"
          >
            {getInitials(user?.fullName || "VIT Student")}
          </Link>
        </div>
      </div>
    </header>
  );
}
