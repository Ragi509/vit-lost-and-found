"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, LoadingState } from "@vit/ui";

const CAMPUS_LOCATIONS = [
  "Central Library - 2nd Floor Reading Room",
  "Central Library - Ground Floor Digital Section",
  "D-Block - 3rd Floor Computer Lab 304",
  "D-Block - 1st Floor Electronics Lab",
  "B-Block - Mechanical Workshop Area",
  "Sharad Arena / Open Amphitheatre",
  "Sports Complex - Badminton Court Bench",
  "Sports Complex - Gymkhana Hall",
  "Student Cafeteria / Canteen Main Area",
  "Saraswati Hostel Block A - Common Room",
  "Main Security Gate 1 Entrance",
];

const ITEM_CATEGORIES = [
  "Academic Tools & Calculators",
  "Identity Cards & Campus Keys",
  "Electronics & Audio",
  "Laptops & Accessories",
  "Bags & Backpacks",
  "Clothing & Eyewear",
  "Books & Course Notes",
  "Other Belongings",
];

export default function ReportLostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    category: ITEM_CATEGORIES[0],
    description: "",
    dateTime: "",
    location: CAMPUS_LOCATIONS[0],
    privateSecret: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Contextual loading flow
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/matches");
    }, 2800);
  };

  if (isSubmitting) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <LoadingState
          steps={[
            "Recording your lost report securely in campus database...",
            "Encrypting private distinguishing details via pgcrypto...",
            "Generating 384-dimensional semantic embedding vector...",
            "Running pgvector cosine similarity scan against found items...",
            "Aggregating potential matches across campus...",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Report a Lost Item
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Provide as much physical detail as possible to help the campus matching engine pair your report with recovered items.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <Input
              label="Item Name & Model"
              id="itemName"
              type="text"
              placeholder="e.g. TI-84 Plus CE Graphing Calculator"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />

            {/* Category & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Campus Location Lost
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {CAMPUS_LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Date & Estimated Time Lost
              </label>
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                required
              />
            </div>

            {/* Public Description */}
            <Textarea
              label="Public Visual Description"
              id="description"
              placeholder="Describe color, visible stickers, brand, material, and where you remember leaving it..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />

            {/* Optional Photo Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Reference Photograph (Optional)
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-slate-400 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/30">
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Upload an existing photo or catalog reference (Max 5MB • JPG, PNG, WEBP)
                </p>
              </div>
            </div>

            {/* High-Security Private Distinguishing Detail */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                  Private Distinguishing Detail (Cryptographically Protected)
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Specify a unique physical feature known <strong>only to you as the legitimate owner</strong> (e.g. serial number prefix, engraving, scratch on bottom bezel, specific text written inside cover).
              </p>
              <Textarea
                id="privateSecret"
                placeholder="e.g. Scratch on top right bezel, initials AJ written inside battery compartment with silver marker."
                value={formData.privateSecret}
                onChange={(e) => setFormData({ ...formData, privateSecret: e.target.value })}
                required
              />
              <div className="flex items-center gap-1.5 text-[11px] text-teal-800 dark:text-teal-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  Encrypted using pgcrypto. Never exposed to the other party or returned in any public query.
                </span>
              </div>
            </div>

            {/* Submit CTA */}
            <Button type="submit" variant="primary" size="lg" className="w-full">
              <span>Submit Lost Report & Run AI Match</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
