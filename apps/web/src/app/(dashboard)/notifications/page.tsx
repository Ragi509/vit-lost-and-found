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

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    type: "match",
    title: "High Similarity Match Detected (~91%)",
    body: "A Texas Instruments Graphing Calculator found at D-Block Computer Lab closely matches your lost report.",
    timestamp: "Just now",
    read: false,
    link: "/matches/match-001",
  },
  {
    id: "notif-002",
    type: "verification",
    title: "Claim Submitted to Security Desk",
    body: "Your verification request for the Decathlon bottle has been logged and assigned token VIT-REC-89240.",
    timestamp: "2 hours ago",
    read: true,
    link: "/recovered/item-001",
  },
  {
    id: "notif-003",
    type: "system",
    title: "VIT Email Domain Verified",
    body: "Your student institutional account is authenticated for the 2026 academic term.",
    timestamp: "1 day ago",
    read: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<"all" | "match" | "verification" | "system">("all");
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchLiveNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          const formatted: Notification[] = data.notifications.map((n: any) => ({
            id: n.id,
            type: n.type as any,
            title: n.title,
            body: n.body,
            timestamp: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
            read: n.read || false,
            link: n.data?.match_id ? `/matches/${n.data.match_id}` : undefined,
          }));

          setNotifications((prev) => {
            const ids = new Set(formatted.map((f) => f.id));
            return [...formatted, ...prev.filter((p) => !ids.has(p.id))];
          });
        }
      }
    } catch (e) {
      console.warn("Notifications fetch notice:", e);
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
        return <Sparkles className="w-4 h-4 text-teal-600" />;
      case "verification":
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white">
                {unreadCount} unread
              </span>
            )}
            {isLiveConnected && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time alerts for AI matches, custody handovers, and ownership reviews.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLiveNotifications}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh</span>
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>Mark all as read</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["all", "match", "verification", "system"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Notifications"
            description="You have no notifications in this category. Live match alerts will appear here in real time."
          />
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                n.read
                  ? "border-border bg-card opacity-80"
                  : "border-teal-300 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 shadow-sm"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getTypeIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground truncate">{n.title}</h4>
                    <span className="text-[11px] text-muted-foreground shrink-0">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>

                  {n.link && (
                    <div className="mt-3">
                      <Link
                        href={n.link}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-2" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
