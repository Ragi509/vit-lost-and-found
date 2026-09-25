"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X, MapPin, Calendar, Tag, ShieldCheck, RefreshCw } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, ConfidenceMeter, EmptyState } from "@vit/ui";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

interface MatchItem {
  id: string;
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
  photo_placeholder_bg?: string;
  is_new?: boolean;
}

const DEFAULT_MATCHES: MatchItem[] = [
  {
    id: "match-001",
    found_item_name: "Texas Instruments Graphing Calculator",
    category: "Academic Tools & Calculators",
    location: "D-Block, Computer Lab 304",
    date_found: "Yesterday, 4:15 PM",
    holding_location: "D-Block Security Counter (Ground Floor)",
    confidence_score: 0.91,
    text_score: 0.91,
    image_score: 0.88,
    category_score: 1.0,
    photo_placeholder_bg: "bg-slate-800 text-slate-200",
  },
  {
    id: "match-002",
    found_item_name: "Casio fx-991EX Scientific Calculator",
    category: "Academic Tools & Calculators",
    location: "Central Library - 2nd Floor",
    date_found: "2 days ago",
    holding_location: "Central Library Helpdesk",
    confidence_score: 0.54,
    text_score: 0.58,
    image_score: 0.42,
    category_score: 1.0,
    photo_placeholder_bg: "bg-slate-700 text-slate-200",
  },
];

export default function MatchesListPage() {
  const [matches, setMatches] = useState<MatchItem[]>(DEFAULT_MATCHES);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchLiveMatches = async () => {
    try {
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        if (data.matches && data.matches.length > 0) {
          const formatted: MatchItem[] = data.matches
            .filter((m: any) => Number(m.confidence_score) >= 0.40)
            .map((m: any) => ({
              id: m.id,
              found_item_name: m.found_report?.item_name || "Recovered Campus Item",
              category: m.found_report?.category || "Belongings",
              location: m.found_report?.location || "Campus Facility",
              date_found: m.found_report?.date_time ? new Date(m.found_report.date_time).toLocaleDateString() : "Recently",
              holding_location: m.found_report?.holding_location || "Central Security Desk",
              confidence_score: Number(m.confidence_score),
              text_score: Number(m.text_score),
              image_score: m.image_score ? Number(m.image_score) : undefined,
              category_score: Number(m.category_score),
              photo_url: m.found_report?.photo_url,
            }));

          // Merge without duplicates and sort highest-confidence-first
          setMatches((prev) => {
            const existingIds = new Set(formatted.map((f) => f.id));
            const merged = [...formatted, ...prev.filter((p) => !existingIds.has(p.id) && p.confidence_score >= 0.40)];
            return merged.sort((a, b) => b.confidence_score - a.confidence_score);
          });
        }
      }
    } catch (e) {
      console.warn("Matches fetch notice:", e);
    }
  };

  useEffect(() => {
    fetchLiveMatches();

    const supabase = createClient();

    // 1. Supabase Postgres changes listener on 'matches' table
    const tableChannel = supabase
      .channel("matches_postgres_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload) => {
          console.log("Realtime match change detected:", payload);
          fetchLiveMatches();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    // 2. Realtime broadcast channel listener
    const broadcastChannel = supabase
      .channel("vit_live_events")
      .on("broadcast", { event: "new_match" }, (payload) => {
        console.log("Broadcast new_match event:", payload);
        fetchLiveMatches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tableChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, []);

  const handleDismiss = (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Similarity Engine</span>
            {isLiveConnected && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-mono">
                Live Subscription Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Potential Matches for Your Reports
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Ranked by multi-modal text and visual cosine similarity. Review each candidate to verify ownership.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchLiveMatches} isLoading={isLoading}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Refresh List</span>
        </Button>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          title="No Potential Matches Yet"
          description="The AI matching engine is continuously monitoring newly reported found items on campus. You will receive an instant notification when a candidate exceeds confidence thresholds."
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
            <Card key={match.id} className="overflow-hidden border border-border shadow-sm flex flex-col justify-between">
              <div>
                {/* Visual Thumbnail */}
                <div className="h-44 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b border-border relative">
                  {match.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={match.photo_url} alt={match.found_item_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{match.found_item_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{match.category}</p>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleDismiss(match.id)}
                      className="p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-500 hover:text-red-600 transition-colors shadow-sm"
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
                  <CardTitle className="text-lg font-bold">{match.found_item_name}</CardTitle>
                  <CardDescription className="text-xs">
                    Current holding desk: <strong>{match.holding_location}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Detailed Confidence Breakdown */}
                  <ConfidenceMeter
                    confidenceScore={match.confidence_score}
                    textScore={match.text_score}
                    imageScore={match.image_score}
                    categoryScore={match.category_score}
                    showBreakdown={true}
                  />

                  {/* Metadata Tags */}
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
                </CardContent>
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 text-[11px] text-teal-800 dark:text-teal-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Blind Proof Verification</span>
                </div>
                <Link href={`/claim/${match.id}`}>
                  <Button variant="primary" size="sm">
                    <span>Claim Item</span>
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
