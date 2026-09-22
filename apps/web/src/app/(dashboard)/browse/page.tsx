"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Filter, LayoutGrid, List, MapPin, Calendar, Building, Sparkles } from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";

const ALL_ITEMS = [
  {
    id: "item-001",
    name: "TI-84 Plus CE Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "lost" as const,
    location: "D-Block, Computer Lab 304",
    date: "Yesterday",
    status: "matched" as const,
    description: "Black Texas Instruments graphing calculator left on a desk after Advanced Mathematics lecture.",
  },
  {
    id: "item-002",
    name: "Texas Instruments Graphing Calculator",
    category: "Academic Tools & Calculators",
    type: "found" as const,
    location: "D-Block, Computer Lab 304",
    date: "Yesterday",
    status: "matched" as const,
    holdingLocation: "D-Block Security Counter",
    description: "Found on desk 14 after afternoon practical session. Screen in good condition.",
  },
  {
    id: "item-003",
    name: "Apple AirPods Pro Gen 2",
    category: "Electronics & Audio",
    type: "lost" as const,
    location: "Central Library - 2nd Floor",
    date: "2 days ago",
    status: "searching" as const,
    description: "AirPods Pro wireless earbuds inside a matte black Spigen rugged case with carabiner clip.",
  },
  {
    id: "item-004",
    name: "Decathlon 1L Stainless Steel Bottle",
    category: "Accessories",
    type: "found" as const,
    location: "Sports Complex - Badminton Bench",
    date: "3 hours ago",
    status: "searching" as const,
    holdingLocation: "Sports Gymkhana Office Desk",
    description: "Matte blue metal water bottle found on the bench beside outdoor badminton court.",
  },
  {
    id: "item-005",
    name: "VIT Student RFID ID Card (GR: 12110456)",
    category: "Identity Cards & Campus Keys",
    type: "found" as const,
    location: "Student Cafeteria Main Area",
    date: "Today, 11:30 AM",
    status: "verification_required" as const,
    holdingLocation: "Main Security Gate 1",
    description: "Turned in by canteen staff. Student name: Riya Sharma (Electronics).",
  },
];

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "lost" | "found">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredItems = ALL_ITEMS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
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

        {/* View Toggle */}
        <div className="flex items-center gap-2">
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

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, locations (e.g. Central Library, D-Block)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {(["all", "lost", "found"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors border ${
                typeFilter === t
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white dark:bg-slate-900 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Items" : t === "lost" ? "Lost" : "Found"}
            </button>
          ))}
        </div>
      </div>

      {/* Items Display */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No Belongings Found"
          description="Try adjusting your search terms or filters. If you lost an item, please submit an official report to activate AI matching."
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between border-border hover:shadow-md transition-shadow">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === "lost"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300"
                    }`}
                  >
                    {item.type}
                  </span>
                  <StatusBadge status={item.status} />
                </div>
                <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{item.description}</p>
                <div className="space-y-1 text-slate-500 dark:text-slate-400 pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.date}</span>
                  </div>
                  {item.holdingLocation && (
                    <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-medium">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Custody: {item.holdingLocation}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-4 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === "lost"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300"
                    }`}
                  >
                    {item.type}
                  </span>
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-muted-foreground">• {item.category}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0 text-left sm:text-right space-y-0.5">
                <div>{item.location}</div>
                <div>{item.date}</div>
                {item.holdingLocation && (
                  <div className="text-teal-700 dark:text-teal-400 font-medium">{item.holdingLocation}</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
