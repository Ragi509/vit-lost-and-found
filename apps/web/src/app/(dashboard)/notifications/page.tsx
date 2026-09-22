"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ShieldAlert, CheckCircle, Bell, ArrowRight, Check } from "lucide-react";
import { Button, Card, EmptyState } from "@vit/ui";

interface Notification {
  id: string;
  type: "match" | "verification" | "system";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    type: "match",
    title: "High Similarity Match Detected (~91%)",
    body: "A Texas Instruments Graphing Calculator found at D-Block Computer Lab closely matches your lost report.",
    timestamp: "10 minutes ago",
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
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<"all" | "match" | "verification" | "system">("all");

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time alerts for AI matches, custody handovers, and ownership reviews.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-3.5 h-3.5 mr-1.5" />
            <span>Mark all as read</span>
          </Button>
        )}
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
            {tab === "all" ? "All Alerts" : tab === "match" ? "Matches" : tab === "verification" ? "Verification" : "System"}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You are all caught up. Notifications for newly found matches will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border-border transition-colors flex items-start justify-between gap-4 ${
                !n.read ? "bg-teal-50/20 dark:bg-teal-950/10 border-l-4 border-l-teal-600" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                  {getTypeIcon(n.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{n.title}</h4>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">{n.timestamp}</span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {n.link && (
                  <Link href={n.link}>
                    <Button variant="outline" size="sm">
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
