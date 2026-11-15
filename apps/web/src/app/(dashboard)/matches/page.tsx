"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  X,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ConfidenceMeter,
  EmptyState,
} from "@vit/ui";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

const CONFIDENCE_THRESHOLD = 0.4;

interface MatchItem {
  id: string;
  lost_item_name: string;
  found_item_name: string;
  category: string;
  location: string;
  date_found: string;
  holding_location: string;
  confidence_score: number;
  text_score: number;
  image_score?: number;
  category_score: number;
  photo_url?: string | null;
  category_match: boolean;
  location_similarity: number;
}

export default function MatchesListPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const fetchLiveMatches = useCallback(async () => {
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
      const res = await fetch(`/api/matches?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const formatted: MatchItem[] = (data.matches || [])
          .filter((m: any) => Number(m.confidence_score) >= CONFIDENCE_THRESHOLD)
          .map((m: any) => ({
            id: m.id,
            lost_item_name: m.lost_report?.item_name || "Lost Item",
            found_item_name: m.found_report?.item_name || "Found Item",
            category: m.found_report?.category || "Belongings",
            location: m.found_report?.location || "Campus",
            date_found: m.found_report?.date_time
              ? new Date(m.found_report.date_time).toLocaleDateString()
              : "Recently",
            holding_location: m.found_report?.holding_location || "Central Security Desk",
            confidence_score: Number(m.confidence_score),
            text_score: Number(m.text_score ?? 0),
            image_score: m.image_score != null ? Number(m.image_score) : undefined,
            category_score: Number(m.category_score ?? 0),
            photo_url: m.found_report?.photo_url ?? null,
            category_match: Number(m.category_score) >= 0.9,
            location_similarity: Number(m.location_score ?? 0),
          }))
          .sort((a: MatchItem, b: MatchItem) => b.confidence_score - a.confidence_score);
        setMatches(formatted);
      }
    } catch (e) {
      console.warn("Matches fetch notice:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveMatches();

    const supabase = createClient();

    const tableChannel = supabase
      .channel("matches_postgres_changes_v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => { fetchLiveMatches(); }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsLiveConnected(true);
      });

    const broadcastChannel = supabase
      .channel("vit_live_events_matches")
      .on("broadcast", { event: "new_match" }, () => { fetchLiveMatches(); })
      .subscribe();

    return () => {
      supabase.removeChannel(tableChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [fetchLiveMatches]);

  const handleDismiss = async (id: string) => {
    setDismissing(id);
    try {
      await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.warn("Dismiss match notice:", e);
      // Optimistically remove anyway so UX is responsive
      setMatches((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDismissing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Similarity Engine</span>
            {isLiveConnected && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono">
                Live
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            AI Matches
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Ranked by multi-modal text and visual cosine similarity. Review each
            candidate to verify ownership.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLiveMatches} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No AI matches yet"
          description="We'll notify you when we find a candidate. The engine continuously scans incoming found reports for similarity."
          action={
            <Link href="/browse">
              <Button variant="outline" size="sm">
                <span>Browse All Campus Items</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((match) => (
            <Card
              key={match.id}
              className="overflow-hidden border border-border shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b border-border relative">
                  {match.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.photo_url}
                      alt={match.found_item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                        {match.found_item_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{match.category}</p>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleDismiss(match.id)}
                      disabled={dismissing === match.id}
                      className="p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-500 hover:text-red-600 transition-colors shadow-sm disabled:opacity-50"
                      title="Not My Item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {match.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400">
                      ~{Math.round(match.confidence_score * 100)}% Match
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-foreground">{match.lost_item_name}</span>
                    {" "}→{" "}
                    <span className="font-medium text-foreground">{match.found_item_name}</span>
                  </div>
                  <CardTitle className="text-base font-bold">{match.found_item_name}</CardTitle>
                  <CardDescription className="text-xs">
                    Current holding desk: <strong>{match.holding_location}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  <ConfidenceMeter
                    confidenceScore={match.confidence_score}
                    textScore={match.text_score}
                    imageScore={match.image_score}
                    categoryScore={match.category_score}
                    showBreakdown={true}
                  />

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{match.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{match.date_found}</span>
                    </div>
                  </div>

                  {/* "Why this match" expandable */}
                  <div className="border-t border-border pt-2">
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === match.id ? null : match.id)
                      }
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedId === match.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      Why this match?
                    </button>
                    {expandedId === match.id && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground pl-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              match.category_match
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-500"
                            }
                          >
                            {match.category_match ? "✓" : "✗"}
                          </span>
                          <span>Category match ({match.category})</span>
                        </div>
                        <div>
                          Location similarity:{" "}
                          <span className="font-medium text-foreground">
                            {Math.round(match.location_similarity * 100)}%
                          </span>
                        </div>
                        <div>
                          Text similarity:{" "}
                          <span className="font-medium text-foreground">
                            {Math.round(match.text_score * 100)}%
                          </span>
                        </div>
                        {match.image_score != null && (
                          <div>
                            Image similarity:{" "}
                            <span className="font-medium text-foreground">
                              {Math.round(match.image_score * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-border flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismiss(match.id)}
                  disabled={dismissing === match.id}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Not My Item</span>
                </Button>
                <Link href={`/claim/${match.id}`}>
                  <Button variant="primary" size="sm">
                    <span>Claim this Item</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
