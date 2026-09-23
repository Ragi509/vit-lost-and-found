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

const DEFAULT_ITEMS: CatalogItem[] = [
  {
    id: "item-001",
    name: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "lost",
    location: "D-Block, Computer Lab 304",
    date: "Yesterday",
    status: "matched",
    description: "Black Texas Instruments graphing calculator left on a desk after Advanced Mathematics lecture.",
  },
  {
    id: "item-002",
    name: "Texas Instruments Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "found",
    location: "D-Block, Computer Lab 304",
    date: "Yesterday",
    status: "matched",
    holdingLocation: "D-Block Security Counter",
    description: "Found on desk 14 after afternoon practical session. Screen in good condition.",
  },
  {
    id: "item-003",
    name: "Apple AirPods Pro Gen 2",
    category: "Electronics & Audio",
    type: "lost",
    location: "Central Library - 2nd Floor",
    date: "2 days ago",
    status: "searching",
    description: "AirPods Pro wireless earbuds inside a matte black Spigen rugged case with carabiner clip.",
  },
  {
    id: "item-004",
    name: "Decathlon 1L Stainless Steel Bottle",
    category: "Accessories",
    type: "found",
    location: "Sports Complex - Badminton Bench",
    date: "3 hours ago",
    status: "searching",
    holdingLocation: "Sports Gymkhana Office Desk",
    description: "Matte blue metal water bottle found on the bench beside outdoor badminton court.",
  },
  {
    id: "item-005",
    name: "VIT Student RFID ID Card (GR: 12110456)",
    category: "Identity Cards & Campus Keys",
    type: "found",
    location: "Student Cafeteria Main Area",
    date: "Today, 11:30 AM",
    status: "verification_required",
    holdingLocation: "Main Security Gate 1",
    description: "Turned in by canteen staff. Student name: Riya Sharma (Electronics).",
  },
];

export default function BrowsePage() {
  const [items, setItems] = useState<CatalogItem[]>(DEFAULT_ITEMS);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);

  const fetchLiveReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        if (data.reports && data.reports.length > 0) {
          const liveFormatted: CatalogItem[] = data.reports.map((r: any) => ({
            id: r.id,
            name: r.item_name,
            category: r.category,
            type: r.type,
            location: r.location,
            date: r.date_time ? new Date(r.date_time).toLocaleDateString() : "Recently",
            status: r.status as any,
            holdingLocation: r.holding_location,
            description: r.description,
            photoUrl: r.photo_url,
          }));

          setItems((prev) => {
            const ids = new Set(liveFormatted.map((f) => f.id));
            return [...liveFormatted, ...prev.filter((p) => !ids.has(p.id))];
          });
        }
      }
    } catch (e) {
      console.warn("Live reports fetch notice:", e);
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
