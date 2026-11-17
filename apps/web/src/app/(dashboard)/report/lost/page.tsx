"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck, CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent, LoadingState } from "@vit/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { createClient } from "@/lib/supabase/client";
import { getStoredSession } from "@/lib/auth/session";

export default function ReportLostPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    description: "",
    dateTime: "",
    location: "",
    privateSecret: "",
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

    const reportId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "report-" + Date.now();
    const session = getStoredSession();
    let uploadedPhotoUrl = previewUrl;

    // Upload to partitioned storage bucket 'lost-item-photos'
    let photoBucket = "lost-item-photos";
    let photoPath = `${session?.id || "anonymous"}/${reportId}/photo.jpg`;
    if (photoFile) {
      try {
        const supabase = createClient();
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        photoPath = `${session?.id || "anonymous"}/${reportId}/photo.${fileExt}`;
        
        let { error: uploadError } = await supabase.storage
          .from("lost-item-photos")
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
          const { data: pubData } = supabase.storage.from("lost-item-photos").getPublicUrl(photoPath);
          if (pubData?.publicUrl) uploadedPhotoUrl = pubData.publicUrl;
        }
      } catch (err) {
        console.warn("Storage upload exception:", err);
      }
    }

    let persistedReportId = reportId;

    // Call live /api/reports endpoint to persist to Supabase & run pgvector similarity scan
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          reportId: reportId,
          reporterId: session?.id,
          reporterEmail: session?.email,
          type: "lost",
          itemName: formData.itemName,
          category: formData.category,
          description: formData.description,
          photoUrl: uploadedPhotoUrl,
          photoBucket,
          photoPath,
          location: formData.location,
          dateTime: formData.dateTime,
          privateSecret: formData.privateSecret,
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
        payload: { reportId: persistedReportId, type: "lost", item: formData.itemName },
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
        id: persistedReportId,
        type: "lost",
        item_name: formData.itemName,
        category: formData.category,
        location: formData.location,
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
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#23395B] dark:hover:text-slate-200 mb-2 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            Lost Property Intake
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#202B3C] dark:text-slate-100">
          Report a Lost Item
        </h1>
        <p className="text-sm text-[#718096] dark:text-slate-400 mt-1 max-w-2xl">
          Provide as much physical detail as possible to help the campus matching engine pair your report with recovered items across campus intake desks.
        </p>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <Input
              label="Item Name & Model"
              id="itemName"
              type="text"
              placeholder="e.g. Dell Inspiron 15 3520 laptop (silver-grey)"
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
                  Campus Location Lost
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
                Date & Estimated Time Lost
              </label>
              <input
                type="datetime-local"
                value={formData.dateTime}
                onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-[#202B3C] dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#23395B]/15 focus:border-[#23395B] shadow-xs transition-colors"
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
            <div className="p-5 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-br from-teal-50/50 to-emerald-50/30 dark:from-teal-950/20 dark:to-emerald-950/10 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-[#3A7D80] dark:text-teal-300 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
                    Private Distinguishing Detail (Cryptographically Protected)
                  </h4>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400">Used for blind ownership verification</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Specify a unique physical feature known <strong>only to you as the legitimate owner</strong> (e.g. serial number prefix, engraving, scratch on bottom bezel, specific text written inside cover).
              </p>
              <Textarea
                id="privateSecret"
                placeholder="e.g. Scratch on top right bezel, initials AJ written inside battery compartment with silver marker."
                value={formData.privateSecret}
                onChange={(e) => setFormData({ ...formData, privateSecret: e.target.value })}
                required
              />
              <div className="flex items-center gap-1.5 text-[11px] text-[#3A7D80] dark:text-teal-400 font-medium pt-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Encrypted using pgcrypto. Never exposed to any other student, finder, or in public search results.
                </span>
              </div>
            </div>

            {/* Submit CTA */}
            <Button type="submit" variant="primary" size="lg" className="w-full rounded-xl shadow-sm text-sm font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Submit Lost Report & Run AI Match Scan</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
