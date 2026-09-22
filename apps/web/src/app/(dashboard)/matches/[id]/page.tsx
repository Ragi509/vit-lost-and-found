"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Calendar, Building, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, ConfidenceMeter } from "@vit/ui";

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  // Mock data for side-by-side comparison
  const match = {
    id: params.id,
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
      description: "Black Texas Instruments graphing calculator left on a desk after Advanced Mathematics lecture. Has a yellow battery cover tape.",
    },
    found_item: {
      title: "Texas Instruments Graphing Calculator",
      category: "Academic Tools & Calculators",
      reporter: "Campus Student Section",
      location: "D-Block, Computer Lab 304",
      date: "September 21, 2026 • 4:15 PM",
      holding_location: "D-Block Security Counter (Ground Floor)",
      description: "Found a black TI calculator on desk 14 after the afternoon practical session. Screen in good condition with slide cover attached.",
    },
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
                ~91% Similarity
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
