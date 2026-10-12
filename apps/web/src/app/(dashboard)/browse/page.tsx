"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Filter, LayoutGrid, List, MapPin, Calendar, Building, Sparkles, RefreshCw } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  type: "lost" | "found";
  location: string;
  date: string;
  status: "searching" | "matched" | "verification_required" | "recovered";
  holdingLocation?: string;
  description: string;
  photoUrl?: string | null;
}

const DEMO_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "6a426f9d-091d-4acf-972c-9e9857175c4c",
    name: "Dell Inspiron 15 3520 Laptop (Silver-Grey)",
    category: "Laptops & Accessories",
    type: "lost",
    location: "Mechanical Lab 304, Ground Floor",
    date: "Today",
    status: "matched",
    description: "Silver-grey Dell Inspiron 15 in dark grey sleeve with charger.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/67b5c191-c247-4952-b8ec-fbbfa076413d/photo.jpg",
  },
  {
    id: "067ab840-b288-4dde-9d82-f2ef7ab888f7",
    name: "Dell laptop with charger",
    category: "Laptops & Accessories",
    type: "found",
    location: "Mechanical Lab 304, Ground Floor",
    date: "Today",
    status: "matched",
    holdingLocation: "Central Campus Security Desk (Building B)",
    description: "Found on desk in Mechanical Lab. Transferred to central security custody.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/67b5c191-c247-4952-b8ec-fbbfa076413d/photo.jpg",
  },
  {
    id: "91436be5-94b6-4d50-8352-412937616517",
    name: "Casio fx-991CW ClassWiz Scientific Calculator",
    category: "Study Material",
    type: "lost",
    location: "Drafting Hall 102, Main Building",
    date: "Today",
    status: "matched",
    description: "Black and white scientific calculator with slide-on cover.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/6eb4c842-8353-48ee-a979-994ae7918a28/photo.jpg",
  },
  {
    id: "3ece4c3c-74f3-4f73-9cec-280f2ea82012",
    name: "Casio scientific calculator with white cover",
    category: "Study Material",
    type: "found",
    location: "Drafting Hall 102, Main Building",
    date: "Today",
    status: "matched",
    holdingLocation: "D-Block Security Counter",
    description: "Found on bench in drafting hall. Held at D-Block security counter.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/6eb4c842-8353-48ee-a979-994ae7918a28/photo.jpg",
  },
  {
    id: "1c103700-2f47-444a-93b4-4bb7233f6dd9",
    name: "boAt Airdopes 141 ANC Wireless Earbuds (White)",
    category: "Audio & Accessories",
    type: "lost",
    location: "Central Library Reading Room (2nd Floor)",
    date: "Today",
    status: "matched",
    description: "White earbuds case with blue braided strap attached.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/f87038b5-555e-4c54-8fc7-961f74a87a0e/photo.jpg",
  },
  {
    id: "c2654025-a287-4a6c-95d4-295aa4f039f2",
    name: "White boAt wireless earbuds case with blue strap",
    category: "Audio & Accessories",
    type: "found",
    location: "Central Library Reading Room (2nd Floor)",
    date: "Today",
    status: "matched",
    holdingLocation: "Library Circulation Desk",
    description: "Found on study table in central library. Blue strap attached.",
    photoUrl: "https://ruvkhuocnixoouphosku.supabase.co/storage/v1/object/public/item-photos/f87038b5-555e-4c54-8fc7-961f74a87a0e/photo.jpg",
  },
];

export default function BrowsePage() {
  const [items, setItems] = useState<CatalogItem[]>(DEMO_CATALOG_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveReports = async () => {
    setIsLoading(true);
    try {
      let escalationsMap: Record<string, boolean> = {};
      try {
        const escRes = await fetch("/api/escalations");
        if (escRes.ok) {
          const escData = await escRes.json();
          if (escData.escalations && Array.isArray(escData.escalations)) {
            escData.escalations.forEach((e: any) => {
              escalationsMap[e.report_id] = true;
            });
          }
        }
      } catch (e) {}

      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        if (data.reports && Array.isArray(data.reports) && data.reports.length > 0) {
          const liveFormatted: CatalogItem[] = data.reports.map((r: any) => ({
            id: r.id,
            name: r.item_name,
            category: r.category,
            type: r.type,
            location: r.location,
            date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Recently",
            status: escalationsMap[r.id] ? ("under_human_review" as any) : (r.status as any),
            holdingLocation: r.holding_location,
            description: r.description,
            photoUrl: r.photo_url,
          }));

          setItems(liveFormatted);
        } else {
          setItems(DEMO_CATALOG_ITEMS);
        }
      } else {
        setItems(DEMO_CATALOG_ITEMS);
      }
    } catch (e) {
      console.warn("Live reports fetch notice:", e);
      setItems(DEMO_CATALOG_ITEMS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveReports();
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Campus Item Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search active lost reports and items currently held at campus security desks.
          </p>
        </div>

        {/* View Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLiveReports} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Sync</span>
          </Button>

          <div className="inline-flex rounded-lg border border-border p-1 bg-card">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs ${
                viewMode === "grid" ? "bg-slate-100 dark:bg-slate-800 text-foreground" : "text-muted-foreground"
              }`}
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md text-xs ${
                viewMode === "list" ? "bg-slate-100 dark:bg-slate-800 text-foreground" : "text-muted-foreground"
              }`}
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items by name, campus location, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex rounded-lg border border-border overflow-hidden p-0.5 bg-card">
          {(["all", "lost", "found"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                typeFilter === type
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type === "all" ? "All Items" : type === "lost" ? "Lost Reports" : "Found Items"}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No Matching Belongings Found"
          description="Try broadening your search query or switching between Lost and Found filters."
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden border-border flex flex-col justify-between">
              <div>
                {/* Photo or Category Placeholder */}
                <div className="h-40 w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-b border-border overflow-hidden">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="p-4 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        {item.category}
                      </span>
                      <p className="font-bold text-sm text-foreground line-clamp-1">{item.name}</p>
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.type === "lost"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                      }`}
                    >
                      {item.type}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                  <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 text-xs text-muted-foreground pt-0">
                  <p className="line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    {item.holdingLocation && (
                      <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Desk: {item.holdingLocation}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="p-4 pt-0">
                <Link href={item.type === "found" ? `/report/lost` : `/report/found`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <span>{item.type === "found" ? "This looks like my item" : "I found this item"}</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-4 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === "lost"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                    }`}
                  >
                    {item.type}
                  </span>
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-muted-foreground">• {item.category}</span>
                </div>
                <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                  <span>Location: {item.location}</span>
                  {item.holdingLocation && <span>Custody: {item.holdingLocation}</span>}
                  <span>Date: {item.date}</span>
                </div>
              </div>

              <div className="shrink-0">
                <Link href={item.type === "found" ? `/report/lost` : `/report/found`}>
                  <Button variant="outline" size="sm">
                    <span>{item.type === "found" ? "Claim Item" : "Report"}</span>
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
