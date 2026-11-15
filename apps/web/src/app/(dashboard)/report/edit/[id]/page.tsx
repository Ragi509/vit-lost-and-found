"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Save, AlertCircle } from "lucide-react";
import { Button, Input, Textarea, Card, CardHeader, CardTitle, CardDescription, CardContent } from "@vit/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { getStoredSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/client";

export default function EditReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [holdingLocations, setHoldingLocations] = useState<string[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemName: "",
    category: "",
    description: "",
    location: "",
    dateTime: "",
    holdingLocation: "",
    finderNotes: "",
    privateSecret: "",
  });

  // 1. Load reference data
  useEffect(() => {
    async function loadRef() {
      try {
        const res = await fetch("/api/reference-data");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.locations)) setLocations(data.locations);
          if (Array.isArray(data.holdingLocations)) setHoldingLocations(data.holdingLocations);
        }
      } catch (_) {}
    }
    loadRef();
  }, []);

  // 2. Load existing report
  useEffect(() => {
    async function loadReport() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/reports/${id}`);
        if (!res.ok) {
          const errData = await res.json();
          setErrorMsg(errData.error || "Failed to load report for editing.");
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const r = data.report;
        if (!r) {
          setErrorMsg("Report not found.");
          setIsLoading(false);
          return;
        }

        // Check if report is editable (searching or matched before verification/recovery)
        if (r.status === "recovered" || r.status === "under_human_review") {
          setErrorMsg(`Editing is locked because this report is in '${r.status}' state.`);
          setIsLoading(false);
          return;
        }

        setReportType(r.type);
        setOriginalUpdatedAt(r.updated_at || r.created_at);
        setPreviewUrl(r.photo_url || null);

        setFormData({
          itemName: r.item_name || "",
          category: r.category || "",
          description: r.description || "",
          location: r.location || "",
          dateTime: r.date_time ? new Date(r.date_time).toISOString().slice(0, 16) : "",
          holdingLocation: r.holding_location || "",
          finderNotes: r.finder_notes || "",
          privateSecret: "",
        });
      } catch (err: any) {
        setErrorMsg(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadReport();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const session = getStoredSession();
    let finalPhotoUrl = previewUrl;
    let photoBucket = reportType === "lost" ? "lost-item-photos" : "found-item-photos";
    let photoPath = `${session?.id || "user"}/${id}/photo.jpg`;

    // Upload new photo if selected
    if (photoFile) {
      try {
        const supabase = createClient();
        const fileExt = photoFile.name.split(".").pop() || "jpg";
        photoPath = `${session?.id || "user"}/${id}/photo.${fileExt}`;
        const { error: upErr } = await supabase.storage
          .from(photoBucket)
          .upload(photoPath, photoFile, { cacheControl: "3600", upsert: true });

        if (!upErr) {
          const { data: pubData } = supabase.storage.from(photoBucket).getPublicUrl(photoPath);
          if (pubData?.publicUrl) finalPhotoUrl = pubData.publicUrl;
        }
      } catch (err) {
        console.warn("Photo upload exception:", err);
      }
    }

    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId: session?.id,
          itemName: formData.itemName,
          category: formData.category,
          description: formData.description,
          location: formData.location,
          dateTime: formData.dateTime,
          photoUrl: finalPhotoUrl,
          photoBucket,
          photoPath,
          holdingLocation: reportType === "found" ? formData.holdingLocation : undefined,
          finderNotes: reportType === "found" ? formData.finderNotes : undefined,
          privateSecret: formData.privateSecret.trim() ? formData.privateSecret.trim() : undefined,
          updatedAt: originalUpdatedAt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to update report.");
        setIsSubmitting(false);
        return;
      }

      // Synchronize updated values into local storage cache
      try {
        const raw = localStorage.getItem("vit_user_reports");
        if (raw) {
          const list = JSON.parse(raw).map((item: any) => {
            if (item.id === id) {
              return {
                ...item,
                item_name: formData.itemName,
                category: formData.category,
                description: formData.description,
                location: formData.location,
                photo_url: finalPhotoUrl,
              };
            }
            return item;
          });
          localStorage.setItem("vit_user_reports", JSON.stringify(list));
        }
      } catch (_) {}

      router.push("/my-reports");
    } catch (err: any) {
      setErrorMsg(err.message || "Network error while saving changes.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500">
        <p className="text-sm">Loading report details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/my-reports" className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Edit {reportType === "lost" ? "Lost" : "Found"} Item Report
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Make updates to your submitted report while it is actively searching.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to edit</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Report Details</CardTitle>
          <CardDescription className="text-xs">
            Changes to description or category will re-align AI matching scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Item Name *"
              placeholder="e.g. Dell Inspiron 15 3520 Laptop"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              label="Description *"
              placeholder="Provide color, brand, condition, and visual identifiers..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location *
              </label>
              <select
                className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <Input
              type="datetime-local"
              label="Date & Approximate Time"
              value={formData.dateTime}
              onChange={(e) => setFormData({ ...formData, dateTime: e.target.value })}
            />

            {/* Found Item specific fields */}
            {reportType === "found" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Current Holding Location
                  </label>
                  <select
                    className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    value={formData.holdingLocation}
                    onChange={(e) => setFormData({ ...formData, holdingLocation: e.target.value })}
                  >
                    <option value="">Select security desk / holding location</option>
                    {holdingLocations.map((hl) => (
                      <option key={hl} value={hl}>
                        {hl}
                      </option>
                    ))}
                  </select>
                </div>

                <Textarea
                  label="Finder Confidential Notes"
                  placeholder="Notes for staff or yourself regarding where item was handed over..."
                  value={formData.finderNotes}
                  onChange={(e) => setFormData({ ...formData, finderNotes: e.target.value })}
                  rows={2}
                />
              </>
            )}

            {/* Lost Item Distinguishing Secret */}
            {reportType === "lost" && (
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Private Distinguishing Detail (Encrypted Secret)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hidden for your protection. Leave blank to keep existing secret, or enter a new value to replace it.
                </p>
                <Input
                  placeholder="Enter a new secret to replace existing (e.g. custom sticker on bottom)..."
                  value={formData.privateSecret}
                  onChange={(e) => setFormData({ ...formData, privateSecret: e.target.value })}
                />
              </div>
            )}

            {/* Photo update */}
            <div className="space-y-1">
              <PhotoUpload
                value={photoFile}
                onChange={(f: File | null) => setPhotoFile(f)}
                previewUrl={previewUrl}
                onPreviewChange={(u: string | null) => setPreviewUrl(u)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Link href="/my-reports">
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
              </Link>
              <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-1.5" />
                <span>{isSubmitting ? "Saving Changes..." : "Save Changes"}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
