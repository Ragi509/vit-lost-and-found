"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ShieldAlert, CheckCircle, Bell, ArrowRight, Check, RefreshCw } from "lucide-react";
import { Button, Card, EmptyState } from "@vit/ui";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

interface Notification {
  id: string;
  type: "match" | "verification" | "system";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "match" | "verification" | "system">("all");
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchLiveNotifications = async () => {
    setIsLoading(true);
    try {
      let session = getStoredSession();
      if (!session) {
        try {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.session) session = meData.session;
          }
        } catch (_) {}
      }

      const queryParams = new URLSearchParams();
      if (session?.id) queryParams.set("userId", session.id);
      if (session?.email) queryParams.set("email", session.email);
      const userParam = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await fetch(`/api/notifications${userParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && Array.isArray(data.notifications)) {
          const formatted: Notification[] = data.notifications.map((n: any) => ({
            id: n.id,
            type: n.type as any,
            title: n.title,
            body: n.body,
            timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            read: n.read || false,
            link: n.data?.match_id ? `/matches/${n.data.match_id}` : undefined,
          }));

          setNotifications(formatted);
        } else {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.warn("Notifications fetch notice:", e);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNotifications();

    const supabase = createClient();

    // 1. Postgres changes listener
    const tableChannel = supabase
      .channel("notifications_table_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload) => {
          console.log("Realtime notification event:", payload);
          fetchLiveNotifications();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    // 2. Broadcast listener
    const broadcastChannel = supabase
      .channel("vit_live_events")
      .on("broadcast", { event: "new_match" }, () => {
        fetchLiveNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tableChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, []);

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const session = getStoredSession();
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true, userId: session?.id }),
      });
    } catch (e) {
      console.warn("Mark all read notice:", e);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (e) {
      console.warn("Mark read notice:", e);
    }
  };

  const filtered = notifications.filter((n) => activeTab === "all" || n.type === activeTab);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Sparkles className="w-4 h-4 text-[#3A7D80]" />;
      case "verification":
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
              Campus Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#3A7D80] text-white shadow-xs">
                {unreadCount} unread
              </span>
            )}
            {isLiveConnected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live</span>
              </span>
            )}
          </div>
          <p className="text-sm text-[#718096] dark:text-slate-400">
            Real-time alerts for AI similarity matches, custody intake, and ownership review status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLiveNotifications} className="rounded-xl shadow-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="rounded-xl shadow-xs">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl w-fit">
        {(["all", "match", "verification", "system"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-slate-900 text-[#202B3C] dark:text-slate-100 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            {tab === "all" ? "All Alerts" : tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="You have no notifications in this category. Live match alerts and claim updates will appear here in real time."
          />
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.read
                  ? "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-80 hover:opacity-100"
                  : "border-teal-200 dark:border-teal-900/60 bg-gradient-to-r from-teal-50/50 to-white dark:from-teal-950/20 dark:to-slate-900 shadow-xs hover:shadow-md"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  n.read ? "bg-slate-100 dark:bg-slate-800" : "bg-teal-100 dark:bg-teal-900/60"
                }`}>
                  {getTypeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-sm font-bold truncate ${
                      n.read ? "text-[#202B3C] dark:text-slate-200" : "text-[#23395B] dark:text-sky-300"
                    }`}>
                      {n.title}
                    </h4>
                    <span className="text-[11px] font-medium text-slate-500 shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-[#718096] dark:text-slate-400 mt-1 leading-relaxed">{n.body}</p>

                  {n.link && (
                    <div className="mt-3">
                      <Link
                        href={n.link}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3A7D80] hover:text-[#23395B] dark:hover:text-sky-300 transition-colors"
                      >
                        <span>View Details & Evidence</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-[#3A7D80] shrink-0 mt-2 shadow-xs" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
