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
  Building,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
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
              ? new Date(m.found_report.date_time).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#3A7D80] border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>AI Similarity Engine</span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
            AI Matches & Correlations
          </h1>
          <p className="text-sm text-[#718096] dark:text-slate-400 mt-1 max-w-2xl">
            Ranked by multi-modal text and visual cosine similarity. Compare candidate items side-by-side and initiate blind ownership verification to reclaim.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLiveMatches}
            isLoading={isLoading}
            className="rounded-xl shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Refresh Scan</span>
          </Button>
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No AI matches yet"
          description="The multi-modal similarity engine continuously scans incoming found item reports across all campus intake desks and will notify you when a high-probability candidate is registered."
          action={
            <Link href="/browse">
              <Button variant="outline" size="sm" className="rounded-xl">
                <span>Browse Campus Catalog</span>
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matches.map((match) => {
            const matchScorePct = Math.round(match.confidence_score * 100);
            const isHighConfidence = matchScorePct >= 80;

            return (
              <Card
                key={match.id}
                className="overflow-hidden border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Visual Header / Photo Preview */}
                  <div className="h-48 w-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border-b border-slate-200/80 dark:border-slate-800 relative overflow-hidden">
                    {match.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={match.photo_url}
                        alt={match.found_item_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-1">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center mx-auto text-slate-400">
                          <Sparkles className="w-6 h-6 text-[#3A7D80]" />
                        </div>
                        <p className="font-bold text-sm text-[#202B3C] dark:text-slate-200 pt-1">
                          {match.found_item_name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">{match.category}</p>
                      </div>
                    )}

                    {/* Gradient overlay for badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                    {/* Match Score Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-md backdrop-blur-md ${
                        isHighConfidence
                          ? "bg-emerald-600/90 text-white"
                          : "bg-[#23395B]/90 text-white"
                      }`}>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>~{matchScorePct}% Match</span>
                      </span>
                    </div>

                    {/* Dismiss Button */}
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleDismiss(match.id)}
                        disabled={dismissing === match.id}
                        className="p-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-white transition-all shadow-sm disabled:opacity-50"
                        title="Not My Item (Dismiss Match)"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Bottom overlay info */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white text-xs flex items-center justify-between font-medium drop-shadow-sm">
                      <span className="bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-md truncate max-w-[200px]">
                        {match.category}
                      </span>
                      <span className="bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md">
                        {match.date_found}
                      </span>
                    </div>
                  </div>

                  <CardHeader className="pb-3 pt-4">
                    {/* Comparison Pill Banner */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-xs mb-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Your Lost Report:</span>
                        <span className="font-semibold text-[#202B3C] dark:text-slate-200 truncate max-w-[180px]">{match.lost_item_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#3A7D80] uppercase tracking-wider">Recovered Candidate:</span>
                        <span className="font-bold text-[#23395B] dark:text-sky-300 truncate max-w-[180px]">{match.found_item_name}</span>
                      </div>
                    </div>

                    <CardTitle className="text-base font-bold text-[#202B3C] dark:text-slate-100">
                      {match.found_item_name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                      Current Holding Desk: <strong className="text-[#202B3C] dark:text-slate-200 font-semibold">{match.holding_location}</strong>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0">
                    <ConfidenceMeter
                      confidenceScore={match.confidence_score}
                      textScore={match.text_score}
                      imageScore={match.image_score}
                      categoryScore={match.category_score}
                      showBreakdown={true}
                    />

                    {/* Meta info tags */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-[#3A7D80] shrink-0" />
                        <span className="truncate">{match.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/40 dark:border-slate-800">
                        <Building className="w-3.5 h-3.5 text-[#23395B] dark:text-sky-400 shrink-0" />
                        <span className="truncate">{match.holding_location}</span>
                      </div>
                    </div>

                    {/* "Why this match?" accordion */}
                    <div className="border-t border-slate-200/70 dark:border-slate-800 pt-3">
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === match.id ? null : match.id)
                        }
                        className="w-full flex items-center justify-between text-xs font-semibold text-[#3A7D80] hover:text-[#23395B] dark:hover:text-sky-300 transition-colors py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Why was this match flagged?</span>
                        </span>
                        {expandedId === match.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {expandedId === match.id && (
                        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              {match.category_match ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-amber-500" />
                              )}
                              <span>Category Match:</span>
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{match.category}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Text Description Overlap:</span>
                            <span className="font-semibold text-[#202B3C] dark:text-slate-200">
                              {Math.round(match.text_score * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Campus Location Proximity:</span>
                            <span className="font-semibold text-[#202B3C] dark:text-slate-200">
                              {Math.round(match.location_similarity * 100)}%
                            </span>
                          </div>
                          {match.image_score != null && (
                            <div className="flex items-center justify-between">
                              <span>Visual Feature Vector Similarity:</span>
                              <span className="font-semibold text-[#202B3C] dark:text-slate-200">
                                {Math.round(match.image_score * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDismiss(match.id)}
                    disabled={dismissing === match.id}
                    className="rounded-xl text-xs hover:border-red-300 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Not Mine</span>
                  </Button>
                  <div className="flex items-center gap-2">
                    <Link href={`/matches/${match.id}`}>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs">
                        <span>Compare</span>
                      </Button>
                    </Link>
                    <Link href={`/claim/${match.id}`}>
                      <Button variant="primary" size="sm" className="rounded-xl text-xs shadow-xs">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                        <span>Claim Item</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
