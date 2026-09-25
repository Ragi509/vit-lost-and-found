"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  Tag,
  Info,
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, ConfidenceMeter } from "@vit/ui";

interface MatchDetails {
  id: string;
  confidence_score: number;
  text_score: number;
  image_score?: number;
  category_score: number;
  lost_item: {
    title: string;
    category: string;
    reporter: string;
    location: string;
    date: string;
    description: string;
    photo_url?: string | null;
  };
  found_item: {
    title: string;
    category: string;
    reporter: string;
    location: string;
    date: string;
    holding_location: string;
    description: string;
    photo_url?: string | null;
  };
}

const DEFAULT_MATCH: MatchDetails = {
  id: "match-001",
  confidence_score: 0.907,
  text_score: 0.91,
  image_score: 0.88,
  category_score: 1.0,
  lost_item: {
    title: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools & Calculators",
    reporter: "You (Aditya Joshi)",
    location: "D-Block, 3rd Floor Computer Lab 304",
    date: "September 20, 2026 • 3:30 PM",
    description:
      "Black Texas Instruments graphing calculator left on a desk after Advanced Mathematics lecture. Has a yellow battery cover tape.",
  },
  found_item: {
    title: "Texas Instruments Graphing Calculator",
    category: "Academic Tools & Calculators",
    reporter: "Campus Student Section",
    location: "D-Block, Computer Lab 304",
    date: "September 21, 2026 • 4:15 PM",
    holding_location: "D-Block Security Counter (Ground Floor)",
    description:
      "Found a black TI calculator on desk 14 after the afternoon practical session. Screen in good condition with slide cover attached.",
  },
};

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<MatchDetails>(DEFAULT_MATCH);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMatch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/matches/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.match) {
            const m = data.match;
            setMatch({
              id: m.id,
              confidence_score: Number(m.confidence_score) || 0.85,
              text_score: Number(m.text_score) || 0.85,
              image_score: m.image_score ? Number(m.image_score) : undefined,
              category_score: Number(m.category_score) || 1.0,
              lost_item: {
                title: m.lost_report?.item_name || "Reported Lost Item",
                category: m.lost_report?.category || "Belongings",
                reporter: "You",
                location: m.lost_report?.location || "Campus Facility",
                date: m.lost_report?.date_time ? new Date(m.lost_report.date_time).toLocaleDateString() : "Recently",
                description: m.lost_report?.description || "No description provided.",
                photo_url: m.lost_report?.photo_url,
              },
              found_item: {
                title: m.found_report?.item_name || "Recovered Campus Item",
                category: m.found_report?.category || "Belongings",
                reporter: "Campus Custody Desk",
                location: m.found_report?.location || "Campus Facility",
                date: m.found_report?.date_time ? new Date(m.found_report.date_time).toLocaleDateString() : "Recently",
                holding_location: m.found_report?.holding_location || "Central Security Desk",
                description: m.found_report?.description || "No description provided.",
                photo_url: m.found_report?.photo_url,
              },
            });
          }
        }
      } catch (e) {
        console.warn("Match fetch warning:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatch();
  }, [params.id]);

  // Derive attribute-level comparison facts
  const isExactCategory =
    match.lost_item.category.trim().toLowerCase() === match.found_item.category.trim().toLowerCase();

  const lostLoc = match.lost_item.location.toLowerCase();
  const foundLoc = match.found_item.location.toLowerCase();
  const isLocationMatch =
    lostLoc.includes("d-block") && foundLoc.includes("d-block")
      ? true
      : lostLoc.includes("library") && foundLoc.includes("library")
      ? true
      : lostLoc.includes("sports") && foundLoc.includes("sports")
      ? true
      : lostLoc.includes("cafeteria") && foundLoc.includes("cafeteria")
      ? true
      : lostLoc === foundLoc;

  const textPct = Math.round(match.text_score * 100);
  const imagePct = match.image_score ? Math.round(match.image_score * 100) : null;
  const overallPct = Math.round(match.confidence_score * 100);

  // Generate plain-language reasoning paragraph
  const generateReasoningText = () => {
    const reasons: string[] = [];
    if (isExactCategory) {
      reasons.push(`both reports are classified under "${match.lost_item.category}"`);
    }
    if (isLocationMatch) {
      reasons.push(`both were reported in proximity within the same campus zone (${match.lost_item.location.split("-")[0].trim()})`);
    } else {
      reasons.push(`items were reported in different campus locations (${match.lost_item.location} vs ${match.found_item.location})`);
    }
    if (textPct >= 70) {
      reasons.push(`textual descriptions share strong semantic overlap (~${textPct}% similarity)`);
    }
    if (imagePct && imagePct >= 70) {
      reasons.push(`visual feature vectors indicate high geometric and color correspondence (~${imagePct}%)`);
    }

    if (reasons.length === 0) {
      return `The AI model detected an overall correlation of ~${overallPct}% across campus recovery databases.`;
    }

    return `The AI matching engine flagged this candidate because ${reasons.join(", ")}, producing a composite confidence of ~${overallPct}%.`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button & Header */}
      <div>
        <Link
          href="/matches"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Matches</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Match Comparison & Claim
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review side-by-side evidence to determine whether this matches your lost item.
            </p>
          </div>

          <Link href={`/claim/${match.id}`}>
            <Button variant="primary" size="md">
              <ShieldCheck className="w-4 h-4 mr-2" />
              <span>Claim This Item</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Confidence Meter Panel */}
      <ConfidenceMeter
        confidenceScore={match.confidence_score}
        textScore={match.text_score}
        imageScore={match.image_score}
        categoryScore={match.category_score}
        showBreakdown={true}
      />

      {/* NEW: Attribute-Level "Why This Match" Explanation Card (US-6) */}
      <Card className="border-teal-200 dark:border-teal-900/60 bg-teal-50/30 dark:bg-teal-950/10 shadow-sm">
        <CardHeader className="pb-3 border-b border-teal-100 dark:border-teal-900/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Why This Match (AI Reasoning Breakdown)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Transparent attribute-level analysis generated by the campus matching pipeline.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Structured Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Category Match */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase text-[10px]">Category Match</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isExactCategory ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Exact Match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-amber-800 dark:text-amber-300">Related Category</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{match.lost_item.category}</p>
            </div>

            {/* Campus Location Match */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase text-[10px]">Location Proximity</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isLocationMatch ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Same Facility</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Different Zone</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {match.lost_item.location.split("-")[0].trim()}
              </p>
            </div>

            {/* Text Similarity */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase text-[10px]">Text Similarity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-foreground">~{textPct}%</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                  High
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Keyword & semantic vector overlap</p>
            </div>

            {/* Visual Match */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500">
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="font-semibold uppercase text-[10px]">Visual Match</span>
              </div>
              <div className="flex items-center gap-1.5">
                {imagePct !== null ? (
                  <>
                    <span className="text-base font-extrabold text-foreground">~{imagePct}%</span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                      Visual
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">Text-only analysis</span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {imagePct !== null ? "Embedding feature correlation" : "No photo attached to found item"}
              </p>
            </div>
          </div>

          {/* Plain-Language Explanation Callout */}
          <div className="p-3 rounded-lg bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-teal-950 dark:text-teal-200">
            <span className="font-semibold block mb-0.5">Plain-Language Summary:</span>
            <p className="leading-relaxed">{generateReasoningText()}</p>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Lost Report */}
        <Card className="border-border">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-border pb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Report</span>
            <CardTitle className="text-lg">{match.lost_item.title}</CardTitle>
            <CardDescription className="text-xs">{match.lost_item.category}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Location Reported:</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.lost_item.location}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Date & Time Lost:</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.lost_item.date}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Reported Description:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-border">
                {match.lost_item.description}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Found Candidate Item */}
        <Card className="border-teal-300 dark:border-teal-800">
          <CardHeader className="bg-teal-50/50 dark:bg-teal-950/20 border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                Found Candidate
              </span>
              <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                ~{overallPct}% Match
              </span>
            </div>
            <CardTitle className="text-lg">{match.found_item.title}</CardTitle>
            <CardDescription className="text-xs">{match.found_item.category}</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Location Found:</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.found_item.location}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Date & Time Found:</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.found_item.date}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Current Physical Custody:</span>
              <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 font-medium">
                <Building className="w-3.5 h-3.5 text-teal-600" />
                <span>{match.found_item.holding_location}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">Finder&apos;s Description:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-border">
                {match.found_item.description}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Claim Call to Action Notice */}
      <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-900 dark:text-slate-100">Ready to verify ownership?</p>
          <p>
            You will be prompted to enter your confidential distinguishing detail. <strong>No hint or correct answer is revealed.</strong>
          </p>
        </div>
        <Link href={`/claim/${match.id}`} className="shrink-0 w-full sm:w-auto">
          <Button variant="primary" size="md" className="w-full sm:w-auto">
            <span>Proceed to Blind Verification</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
