"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Sparkles, PlusCircle, Compass, Home, Menu, X, Shield, ChevronRight } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getStoredSession, UserSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [unreadMatches, setUnreadMatches] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#23395B] to-[#1a2b45] dark:from-sky-500 dark:to-teal-600 text-white dark:text-slate-950 flex items-center justify-center font-extrabold text-sm tracking-wider shadow-sm group-hover:scale-105 transition-transform">
            VIT
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#23395B] dark:text-slate-100">
                Lost & Found
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#3A7D80] dark:bg-sky-400" />
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
              Vishwakarma Institute of Technology
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 relative ${
                  isActive
                    ? "bg-[#23395B]/10 text-[#23395B] dark:bg-sky-400/15 dark:text-sky-300 font-bold shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#23395B] dark:text-sky-400" : "text-slate-400 dark:text-slate-500"}`} />
                <span>{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#3A7D80] text-white leading-tight shadow-xs animate-pulse">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/matches"
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative"
            title="AI Matches"
          >
            <Sparkles className="w-4 h-4" />
            {unreadMatches > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#3A7D80] ring-2 ring-white dark:ring-slate-950" />
            )}
          </Link>

          <ThemeToggle />

          <Link
            href="/profile"
            aria-label="User Profile"
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-[#23395B] to-[#3A7D80] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:ring-2 hover:ring-[#8ECAE6]/40 transition-all">
              {getInitials(user?.fullName || "VIT Student")}
            </div>
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-[#23395B]/10 text-[#23395B] dark:bg-sky-400/15 dark:text-sky-300 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#23395B] dark:text-sky-400" : "text-slate-400"}`} />
                  <span>{link.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#3A7D80] text-white">
                      {link.badge}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/profile"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#23395B] to-[#3A7D80] text-white flex items-center justify-center text-[10px] font-bold">
                  {getInitials(user?.fullName || "VIT Student")}
                </div>
                <span>Profile & PRN Details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
