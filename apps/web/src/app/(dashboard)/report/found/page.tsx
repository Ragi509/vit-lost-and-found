"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Building, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, LoadingState } from "@vit/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

export default function ReportFoundPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [holdingLocations, setHoldingLocations] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    description: "",
    dateTime: "",
    location: "",
    holdingLocation: "",
    finderNotes: "",
  });

  useEffect(() => {
    async function loadReferenceData() {
      try {
        const res = await fetch("/api/reference-data");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories);
            setFormData((prev) => ({
              ...prev,
              category: prev.category || data.categories[0],
            }));
          }
          if (Array.isArray(data.locations) && data.locations.length > 0) {
            setLocations(data.locations);
            setFormData((prev) => ({
              ...prev,
              location: prev.location || data.locations[0],
            }));
          }
          if (Array.isArray(data.holdingLocations) && data.holdingLocations.length > 0) {
            setHoldingLocations(data.holdingLocations);
            setFormData((prev) => ({
              ...prev,
              holdingLocation: prev.holdingLocation || data.holdingLocations[0],
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to load reference data:", err);
      }
    }
    loadReferenceData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reportId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "found-" + Date.now();
    const session = getStoredSession();
    let uploadedPhotoUrl = previewUrl;

    // Upload to partitioned storage bucket 'found-item-photos'
    let photoBucket = "found-item-photos";
    let photoPath = `${session?.id || "anonymous"}/${reportId}/photo.jpg`;
    if (photoFile) {
      try {
        const supabase = createClient();
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        photoPath = `${session?.id || "anonymous"}/${reportId}/photo.${fileExt}`;
        
        let { error: uploadError } = await supabase.storage
          .from("found-item-photos")
          .upload(photoPath, photoFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          // Fallback to legacy bucket if needed
          const legacyPath = `${reportId}/photo.${fileExt}`;
          await supabase.storage.from("item-photos").upload(legacyPath, photoFile, { cacheControl: "3600", upsert: true });
          const { data: pubData } = supabase.storage.from("item-photos").getPublicUrl(legacyPath);
          if (pubData?.publicUrl) uploadedPhotoUrl = pubData.publicUrl;
        } else {
          const { data: pubData } = supabase.storage.from("found-item-photos").getPublicUrl(photoPath);
          if (pubData?.publicUrl) uploadedPhotoUrl = pubData.publicUrl;
        }
      } catch (err) {
        console.warn("Storage upload exception:", err);
      }
    }

    let persistedReportId = reportId;

    // Call live /api/reports endpoint to persist to Supabase & run similarity scan
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          reportId: reportId,
          reporterId: session?.id,
          reporterEmail: session?.email,
          type: "found",
          itemName: formData.itemName,
          category: formData.category,
          description: formData.description,
          photoUrl: uploadedPhotoUrl,
          photoBucket,
          photoPath,
          location: formData.location,
          dateTime: formData.dateTime,
          holdingLocation: formData.holdingLocation,
          finderNotes: formData.finderNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.report?.id) {
        persistedReportId = data.report.id;
      }

      // Broadcast event via Supabase Realtime channel
      const supabase = createClient();
      const channel = supabase.channel("vit_live_events");
      await channel.send({
        type: "broadcast",
        event: "new_report",
        payload: { reportId: persistedReportId, type: "found", item: formData.itemName },
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
        id: persistedReportId,
        type: "found",
        item_name: formData.itemName,
        category: formData.category,
        location: formData.location,
        holdingLocation: formData.holdingLocation,
        dateTime: formData.dateTime || new Date().toISOString(),
        description: formData.description,
        photo_url: previewUrl,
        status: "searching",
      });
      localStorage.setItem("vit_user_reports", JSON.stringify(storedReports));
    } catch (e) {
      console.warn("Local storage cache warning:", e);
    }

    setIsSubmitting(false);
    router.push("/my-reports");
  };

  if (isSubmitting) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <LoadingState
          steps={[
            "Recording found item intake securely in database...",
            photoFile ? "Uploading high-resolution photograph to encrypted item-photos storage..." : "Processing item metadata...",
            "Extracting visual features and generating 384-dimensional text embedding...",
            "Scanning live campus lost item reports via pgvector similarity search...",
            "Registering custody record at designated security desk...",
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#23395B] dark:hover:text-slate-200 mb-2 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Found Property Custody
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
          Report a Found Item
        </h1>
        <p className="text-sm text-[#718096] dark:text-slate-400 mt-1 max-w-2xl">
          Help return lost items to their owners. Public descriptions should include observable physical details, while custody is tracked at designated desks.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <Input
              label="Item Name & Brief Identifier"
              id="itemName"
              type="text"
              placeholder="e.g. Dell laptop with charger"
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
                  className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-[#202B3C] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#23395B]/15 focus:border-[#23395B] shadow-xs transition-colors"
                  required
                >
                  {categories.map((c) => (
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
                  className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-[#202B3C] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#23395B]/15 focus:border-[#23395B] shadow-xs transition-colors"
                  required
                >
                  {locations.map((l) => (
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
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-[#202B3C] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#23395B]/15 focus:border-[#23395B] shadow-xs transition-colors"
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
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-[#202B3C] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#23395B]/15 focus:border-[#23395B] shadow-xs transition-colors"
                required
              >
                {holdingLocations.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                The designated campus desk where the verified owner will present their confirmation token for custody release.
              </p>
            </div>

            {/* Public Description */}
            <Textarea
              label="Public Visual Description"
              id="description"
              placeholder="Describe color, general brand, sleeve or accessories, and condition..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />

            {/* Responsive Photo Upload Control */}
            <PhotoUpload
              label="Photograph of Found Item"
              sublabel="Upload a clear photograph taken at the location (Max 5MB • JPG, PNG, WEBP)"
              value={photoFile}
              onChange={setPhotoFile}
              previewUrl={previewUrl}
              onPreviewChange={setPreviewUrl}
            />

            {/* Confidential Finder Notes (Never exposed to claimant) */}
            <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Confidential Staff / Custody Notes (Internal Only)
              </label>
              <Textarea
                id="finderNotes"
                placeholder="Any private markings noticed that should NOT be visible to claimants during search (e.g. sticker placement, serial number, lock screen wallpaper)..."
                value={formData.finderNotes}
                onChange={(e) => setFormData({ ...formData, finderNotes: e.target.value })}
              />
              <p className="text-[11px] text-slate-500 font-medium">
                These notes are confidential to campus custody staff and will never be displayed on public browse pages.
              </p>
            </div>

            {/* Submit CTA */}
            <Button type="submit" variant="primary" size="lg" className="w-full rounded-xl shadow-sm text-sm font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Submit Found Item & Match Lost Reports</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
