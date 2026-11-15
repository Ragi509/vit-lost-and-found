"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw,
  UserCheck,
  CheckCircle,
  AlertCircle,
  X,
} from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent, StatusBadge, EmptyState } from "@vit/ui";
import { getStoredSession } from "@/lib/auth/session";

interface BrowseItem {
  id: string;
  name: string;
  item_name?: string;
  category: string;
  type: "lost" | "found";
  location: string;
  date: string;
  status: "searching" | "matched" | "verification_required" | "recovered";
  description: string;
  photoUrl?: string | null;
  photo_url?: string | null;
  is_own?: boolean;
}

interface UserLostReport {
  id: string;
  item_name: string;
  category: string;
  location: string;
}

export default function BrowsePage() {
  const router = useRouter();
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"found" | "lost" | "all">("found"); // default Found
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  // Claim modal state
  const [selectedFoundItem, setSelectedFoundItem] = useState<BrowseItem | null>(null);
  const [userLostReports, setUserLostReports] = useState<UserLostReport[]>([]);
  const [selectedLostReportId, setSelectedLostReportId] = useState<string>("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  // 1. Load reference data
  useEffect(() => {
    async function loadRef() {
      try {
        const res = await fetch("/api/reference-data");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.categories)) setCategories(data.categories);
          if (Array.isArray(data.locations)) setLocations(data.locations);
        }
      } catch (_) {}
    }
    loadRef();
  }, []);

  // 2. Fetch browse items
  const fetchBrowseItems = async () => {
    setIsLoading(true);
    try {
      const session = getStoredSession();
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedLocation !== "all") params.set("location", selectedLocation);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (session?.id) params.set("userId", session.id);

      const res = await fetch(`/api/browse?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setItems(data.items);
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn("Browse fetch notice:", err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBrowseItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [typeFilter, selectedCategory, selectedLocation, searchQuery]);

  // Handle "This looks like my item"
  const handleInitiateClaim = async (foundItem: BrowseItem) => {
    setClaimError(null);
    setClaimSuccessMessage(null);
    setSelectedFoundItem(foundItem);

    const session = getStoredSession();
    if (!session?.id) {
      router.push("/login?redirect=/browse");
      return;
    }

    try {
      // Fetch user's active lost reports
      const res = await fetch(`/api/reports?reporterId=${session.id}&type=lost`);
      if (res.ok) {
        const data = await res.json();
        const lostList: UserLostReport[] = (data.reports || []).filter(
          (r: any) => r.type === "lost" && (r.status === "searching" || r.status === "matched")
        );

        if (lostList.length === 0) {
          // No active lost report -> redirect to report/lost with pre-filled category/location
          router.push(
            `/report/lost?category=${encodeURIComponent(foundItem.category)}&location=${encodeURIComponent(
              foundItem.location
            )}&foundId=${foundItem.id}`
          );
          return;
        }

        if (lostList.length === 1) {
          // Exactly 1 active lost report -> call claim directly
          await executeClaim(foundItem.id, lostList[0].id);
          return;
        }

        // Multiple active lost reports -> open modal to choose
        setUserLostReports(lostList);
        setSelectedLostReportId(lostList[0].id);
      }
    } catch (err: any) {
      setClaimError(err.message || "Failed to load your lost reports.");
    }
  };

  const executeClaim = async (foundReportId: string, lostReportId: string) => {
    setIsClaiming(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/browse/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foundReportId, lostReportId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error || "Failed to initiate claim.");
        setIsClaiming(false);
        return;
      }

      if (data.action === "routed_to_admin") {
        setClaimSuccessMessage(data.message || "Multiple claims detected. Sent to Campus Security for review.");
        setTimeout(() => {
          setSelectedFoundItem(null);
        }, 2500);
      } else if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.matchId) {
        router.push(`/claim/${data.matchId}`);
      }
    } catch (err: any) {
      setClaimError(err.message || "An unexpected error occurred.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Campus Catalog
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search campus-wide lost and found items. Recognise your item to initiate ownership proof.
          </p>
        </div>

        {/* View toggle & type buttons */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900">
            {(["found", "lost", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  typeFilter === t
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {t === "found" ? "Found Items" : t === "lost" ? "Lost Items" : "All"}
              </button>
            ))}
          </div>

          <div className="hidden sm:inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-900">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-400"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-400"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by keyword, brand, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          className="text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="all">All Campus Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Searching campus catalog...</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No campus items match your filters"
          description="Try broadening your search term or selecting 'All' in the category and location filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedLocation("all");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const photo = item.photoUrl || item.photo_url;
            const title = item.name || item.item_name || "Campus Item";

            return (
              <Card key={item.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.type === "lost"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                        }`}
                      >
                        {item.type}
                      </span>
                      {item.is_own && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Your report</span>
                        </span>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <CardTitle className="text-base font-bold mt-2 line-clamp-1">{title}</CardTitle>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.category}</p>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {photo && (
                    <div className="w-full h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo} alt={title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{item.description}</p>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {item.is_own ? (
                      <Link href="/my-reports" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <span>Manage in My Reports</span>
                        </Button>
                      </Link>
                    ) : item.type === "found" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleInitiateClaim(item)}
                        className="w-full text-xs flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>This looks like my item</span>
                      </Button>
                    ) : (
                      <Link href={`/report/found?matchedWith=${item.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                          <span>I found this item</span>
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const title = item.name || item.item_name || "Campus Item";
            return (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.type === "lost"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{title}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {item.category} • {item.location} • {item.date}
                  </p>
                </div>
                <div>
                  {!item.is_own && item.type === "found" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleInitiateClaim(item)}
                      className="text-xs"
                    >
                      <span>This looks like my item</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Claim Selection Modal (when user has multiple active lost reports) */}
      {selectedFoundItem && userLostReports.length > 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Which of your lost items is this?
              </h3>
              <button
                onClick={() => setSelectedFoundItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              You are claiming: <strong>{selectedFoundItem.name || selectedFoundItem.item_name}</strong> found at{" "}
              {selectedFoundItem.location}. Please select your corresponding lost report:
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {userLostReports.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLostReportId === r.id
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="lostReport"
                    value={r.id}
                    checked={selectedLostReportId === r.id}
                    onChange={() => setSelectedLostReportId(r.id)}
                    className="mt-0.5 text-teal-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{r.item_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {r.category} • {r.location}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {claimError && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/50 p-2 rounded">
                {claimError}
              </p>
            )}

            {claimSuccessMessage && (
              <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded">
                {claimSuccessMessage}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedFoundItem(null)} disabled={isClaiming}>
                <span>Cancel</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => executeClaim(selectedFoundItem.id, selectedLostReportId)}
                disabled={isClaiming || !selectedLostReportId}
              >
                {isClaiming ? "Linking..." : "Proceed to Verification"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
