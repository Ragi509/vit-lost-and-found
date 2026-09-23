"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardContent, LoadingState } from "@vit/ui";
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

const HOLDING_LOCATIONS = [
  "Central Library Helpdesk (Ground Floor)",
  "Main Security Gate 1 Security Office",
  "D-Block Security Counter (Ground Floor)",
  "Student Activities Center (SAC Desk)",
  "Hostel Warden Office (Saraswati Block)",
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    const reportId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "found-" + Date.now();
    const session = getStoredSession();
    let uploadedPhotoUrl = previewUrl;

    // If photo is present, upload to Supabase Storage bucket 'item-photos'
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

    // Call live /api/reports endpoint to persist to Supabase & run similarity scan
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: session?.id,
          reporterEmail: session?.email,
          type: "found",
          itemName: formData.itemName,
          category: formData.category,
          description: formData.description,
          photoUrl: uploadedPhotoUrl,
          location: formData.location,
          dateTime: formData.dateTime,
          holdingLocation: formData.holdingLocation,
          finderNotes: formData.finderNotes,
        }),
      });

      const data = await res.json();

      // Broadcast event via Supabase Realtime channel
      const supabase = createClient();
      const channel = supabase.channel("vit_live_events");
      await channel.send({
        type: "broadcast",
        event: "new_report",
        payload: { reportId, type: "found", item: formData.itemName },
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

    // Persist into user reports cache
    try {
      const storedReports = JSON.parse(localStorage.getItem("vit_user_reports") || "[]");
      storedReports.unshift({
        id: reportId,
        type: "found",
        item_name: formData.itemName,
        category: formData.category,
        location: formData.location,
        holdingLocation: formData.holdingLocation,
        dateTime: formData.dateTime || new Date().toISOString(),
        description: formData.description,
        photo_url: previewUrl,
        status: "Holding at Desk",
      });
      localStorage.setItem("vit_user_reports", JSON.stringify(storedReports));
    } catch (e) {
      console.warn("Local storage cache warning:", e);
    }

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
            "Registering recovered item intake record...",
            photoFile ? "Uploading high-resolution photograph to encrypted item-photos storage..." : "Processing item metadata...",
            "Indexing physical holding desk location...",
            "Triggering CLIP multi-modal embedding pipeline...",
            "Querying outstanding lost item registry for immediate candidate pairing...",
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
          Report a Found Item
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Thank you for turning in a lost item. Details entered here will help security desk verify the legitimate owner.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <Input
              label="Found Item Title"
              id="itemName"
              type="text"
              placeholder="e.g. Blue HP Pavilion Laptop Charger"
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
                  Campus Spot Where Found
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
                Date & Time Found
              </label>
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                className="flex h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                required
              />
            </div>

            {/* Custody / Holding Location */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Physical Custody Holding Desk
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

            {/* Responsive Photo Upload Control */}
            <PhotoUpload
              label="Item Photograph (Recommended for AI Matching)"
              sublabel="Click or drag photo here (Max 5MB • JPG, PNG, WEBP)"
              value={photoFile}
              onChange={setPhotoFile}
              previewUrl={previewUrl}
              onPreviewChange={setPreviewUrl}
            />

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
