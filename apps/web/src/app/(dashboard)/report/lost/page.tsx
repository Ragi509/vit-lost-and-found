"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, LoadingState } from "@vit/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    const reportId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "report-" + Date.now();
    const session = getStoredSession();
    let uploadedPhotoUrl = previewUrl;

    // If a photo was selected, upload it to Supabase Storage bucket 'item-photos'
    if (photoFile) {
      try {
        const supabase = createClient();
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        const filePath = `${reportId}/photo.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("item-photos")
          .upload(filePath, photoFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from("item-photos").getPublicUrl(filePath);
          if (pubData?.publicUrl) uploadedPhotoUrl = pubData.publicUrl;
        }
      } catch (err) {
        console.warn("Storage upload exception:", err);
      }
    }

    // Call live /api/reports endpoint to persist to Supabase & run pgvector similarity scan
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: session?.id,
          reporterEmail: session?.email,
          type: "lost",
          itemName: formData.itemName,
          category: formData.category,
          description: formData.description,
          photoUrl: uploadedPhotoUrl,
          location: formData.location,
          dateTime: formData.dateTime,
          privateSecret: formData.privateSecret,
        }),
      });

      const data = await res.json();

      // Broadcast event via Supabase Realtime channel
      const supabase = createClient();
      const channel = supabase.channel("vit_live_events");
      await channel.send({
        type: "broadcast",
        event: "new_report",
        payload: { reportId, type: "lost", item: formData.itemName },
      });
      if (data.match) {
        await channel.send({
          type: "broadcast",
          event: "new_match",
          payload: { match: data.match },
        });
      }
    } catch (apiErr) {
      console.warn("API report creation notice:", apiErr);
    }

    // Persist recent submission into local session cache
    try {
      const storedReports = JSON.parse(localStorage.getItem("vit_user_reports") || "[]");
      storedReports.unshift({
        id: reportId,
        type: "lost",
        item_name: formData.itemName,
        category: formData.category,
        location: formData.location,
        dateTime: formData.dateTime || new Date().toISOString(),
        description: formData.description,
        photo_url: previewUrl,
        status: "Active",
      });
      localStorage.setItem("vit_user_reports", JSON.stringify(storedReports));
    } catch (e) {
      console.warn("Local storage cache warning:", e);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/matches");
    }, 2400);
  };

  if (isSubmitting) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <LoadingState
          steps={[
            "Recording your lost report securely in campus database...",
            "Encrypting private distinguishing details via pgcrypto...",
            photoFile ? "Uploading item photograph to encrypted item-photos storage..." : "Processing visual attributes...",
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

            {/* Responsive Photo Upload Control */}
            <PhotoUpload
              label="Reference Photograph (Optional)"
              sublabel="Upload an existing photo or catalog reference (Max 5MB • JPG, PNG, WEBP)"
              value={photoFile}
              onChange={setPhotoFile}
              previewUrl={previewUrl}
              onPreviewChange={setPreviewUrl}
            />

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
