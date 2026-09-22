"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, X, MapPin, Calendar, Tag, ShieldCheck } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, ConfidenceMeter, EmptyState } from "@vit/ui";

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
  photo_placeholder_bg: string;
}

const mockMatches: MatchItem[] = [
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
  const [matches, setMatches] = useState<MatchItem[]>(mockMatches);

  const handleDismiss = (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Similarity Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Potential Matches for Your Reports
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Ranked by multi-modal text and visual cosine similarity. Review each candidate to verify ownership.
        </p>
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
                  <div className="text-center p-4">
                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{match.found_item_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{match.category}</p>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleDismiss(match.id)}
                      className="p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-500 hover:text-red-600 transition-colors shadow-sm"
                      title="Not My Item"
                      aria-label="Not My Item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <CardHeader className="p-5 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{match.found_item_name}</CardTitle>
                    <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>Found at: {match.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date: {match.date_found}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Custody: {match.holding_location}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-3">
                  <ConfidenceMeter
                    confidenceScore={match.confidence_score}
                    textScore={match.text_score}
                    imageScore={match.image_score}
                    categoryScore={match.category_score}
                    showBreakdown={true}
                  />
                </CardContent>
              </div>

              {/* Action Footer */}
              <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-border mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(match.id)}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Not My Item</span>
                </Button>

                <Link href={`/matches/${match.id}`}>
                  <Button variant="primary" size="sm">
                    <span>View Match</span>
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
