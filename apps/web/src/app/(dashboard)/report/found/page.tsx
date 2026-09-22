"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Building, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardContent, LoadingState } from "@vit/ui";

const CAMPUS_LOCATIONS = [
  "Central Library - 2nd Floor Reading Room",
  "Central Library - Ground Floor Digital Section",
  "D-Block - 3rd Floor Computer Lab 304",
  "D-Block - 1st Floor Electronics Lab",
  "B-Block - Mechanical Workshop Area",
  "Sharad Arena / Open Amphitheatre",
  "Sports Complex - Badminton Court Bench",
  "Student Cafeteria / Canteen Main Area",
  "Main Security Gate 1 Entrance",
];

const HOLDING_LOCATIONS = [
  "Central Library Helpdesk (Ground Floor)",
  "D-Block Security Counter (Ground Floor)",
  "B-Block Department Office",
  "Main Security Gate 1 Lost & Found Custody Desk",
  "Student Affairs Section (Sharad Arena Building)",
  "Sports Gymkhana Office Desk",
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

export default function ReportFoundPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    category: ITEM_CATEGORIES[0],
    description: "",
    dateTime: "",
    location: CAMPUS_LOCATIONS[0],
    holdingLocation: HOLDING_LOCATIONS[0],
    finderNotes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/dashboard");
    }, 2400);
  };

  if (isSubmitting) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <LoadingState
          steps={[
            "Registering found item in campus custody database...",
            "Indexing holding desk location and finder details...",
            "Extracting multi-modal features for vector indexing...",
            "Checking active lost reports for high-confidence matches...",
          ]}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Report a Found Item
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Log an unattended or turned-in item into the campus recovery system and specify which authorized desk holds custody.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Item Name & General Description"
              id="itemName"
              type="text"
              placeholder="e.g. Texas Instruments Scientific Calculator"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />

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
                  Where Was It Found?
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Current Holding Desk (Physical Custody)
              </label>
              <select
                value={formData.holdingLocation}
                onChange={(e) => setFormData({ ...formData, holdingLocation: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
              >
                {HOLDING_LOCATIONS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                The physical desk where the verified owner will present their confirmation code for handover.
              </p>
            </div>

            <Textarea
              label="Public Physical Description"
              id="description"
              placeholder="State color, brand, condition, and any external markings that help the owner identify it..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Item Photo (Recommended for AI Matching)
              </label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-slate-400 transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/30">
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Click or drag photo here (Max 5MB • JPG, PNG, WEBP)
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Finder&apos;s Confidential Notes (Optional)
              </label>
              <Textarea
                id="finderNotes"
                placeholder="Internal notes, e.g. handed over to Officer Shinde at 4:30 PM..."
                value={formData.finderNotes}
                onChange={(e) => setFormData({ ...formData, finderNotes: e.target.value })}
              />
              <p className="text-[11px] text-slate-500">
                Kept confidential between finder and campus security staff.
              </p>
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              <span>Submit Found Item Record</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
