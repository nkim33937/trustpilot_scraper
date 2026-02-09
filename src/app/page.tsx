"use client";

import { useState, useCallback, useRef } from "react";
import {
  Business,
  EnrichedBusiness,
  Category,
  ScrapeResult,
} from "@/lib/types";
import { TRUSTPILOT_CATEGORIES } from "@/lib/categories";
import CategorySelector from "@/components/category-selector";
import FiltersPanel from "@/components/filters-panel";
import ResultsTable from "@/components/results-table";
import ProgressBar from "@/components/progress-bar";
import ExportButton from "@/components/export-button";

type AppStatus = "idle" | "scanning" | "enriching" | "done" | "error";

export default function Home() {
  const [categories] = useState<Category[]>(TRUSTPILOT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(3);
  const [minReviewsPerMonth, setMinReviewsPerMonth] = useState(10);

  const [businesses, setBusinesses] = useState<(Business | EnrichedBusiness)[]>(
    []
  );
  const [status, setStatus] = useState<AppStatus>("idle");
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [lastSearchMode, setLastSearchMode] = useState<"category" | "search">("category");

  // Enrichment tracking
  const [enrichingDomains, setEnrichingDomains] = useState<Set<string>>(
    new Set()
  );
  const [enrichProgress, setEnrichProgress] = useState({
    current: 0,
    total: 0,
  });
  const abortRef = useRef(false);

  const handleSearch = useCallback(
    async (page: number = 1) => {
      if (!searchQuery.trim()) return;

      setStatus("scanning");
      setError("");
      setLastSearchMode("search");
      if (page === 1) {
        setBusinesses([]);
        setCurrentPage(1);
      }

      try {
        const params = new URLSearchParams({
          query: searchQuery.trim(),
          page: page.toString(),
          minRating: minRating.toString(),
        });

        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to search");
        }

        const data: ScrapeResult = await res.json();

        if (page === 1) {
          setBusinesses(data.businesses);
        } else {
          setBusinesses((prev) => [...prev, ...data.businesses]);
        }

        setCurrentPage(data.currentPage);
        setHasMore(data.hasMore);
        setTotalResults(data.totalResults);
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search");
        setStatus("error");
      }
    },
    [searchQuery, minRating]
  );

  const handleScan = useCallback(
    async (page: number = 1) => {
      if (!selectedCategory) return;

      setStatus("scanning");
      setError("");
      setLastSearchMode("category");
      if (page === 1) {
        setBusinesses([]);
        setCurrentPage(1);
      }

      try {
        const params = new URLSearchParams({
          category: selectedCategory,
          page: page.toString(),
          minRating: minRating.toString(),
        });

        const res = await fetch(`/api/scrape?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to scrape");
        }

        const data: ScrapeResult = await res.json();

        if (page === 1) {
          setBusinesses(data.businesses);
        } else {
          setBusinesses((prev) => [...prev, ...data.businesses]);
        }

        setCurrentPage(data.currentPage);
        setHasMore(data.hasMore);
        setTotalResults(data.totalResults);
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to scan");
        setStatus("error");
      }
    },
    [selectedCategory, minRating]
  );

  const handleLoadMore = useCallback(() => {
    if (lastSearchMode === "search") {
      handleSearch(currentPage + 1);
    } else {
      handleScan(currentPage + 1);
    }
  }, [handleScan, handleSearch, currentPage, lastSearchMode]);

  const enrichSingle = useCallback(async (business: Business) => {
    setEnrichingDomains((prev) => new Set(prev).add(business.domain));

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businesses: [business] }),
      });

      if (!res.ok) throw new Error("Failed to enrich");

      const data = await res.json();
      const enriched = data.enrichedBusinesses[0];

      if (enriched) {
        setBusinesses((prev) =>
          prev.map((b) =>
            b.domain === business.domain ? enriched : b
          )
        );
      }
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setEnrichingDomains((prev) => {
        const next = new Set(prev);
        next.delete(business.domain);
        return next;
      });
    }
  }, []);

  const enrichAll = useCallback(async () => {
    const unenriched = businesses.filter(
      (b) => !("enriched" in b && b.enriched)
    ) as Business[];

    if (unenriched.length === 0) return;

    setStatus("enriching");
    abortRef.current = false;
    setEnrichProgress({ current: 0, total: unenriched.length });

    const BATCH_SIZE = 3;
    let completed = 0;

    for (let i = 0; i < unenriched.length; i += BATCH_SIZE) {
      if (abortRef.current) break;

      const batch = unenriched.slice(i, i + BATCH_SIZE);
      const batchDomains = new Set(batch.map((b) => b.domain));
      setEnrichingDomains((prev) => new Set([...prev, ...batchDomains]));

      try {
        const res = await fetch("/api/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businesses: batch }),
        });

        if (res.ok) {
          const data = await res.json();
          const enrichedResults = data.enrichedBusinesses as (
            | EnrichedBusiness
            | null
          )[];

          setBusinesses((prev) =>
            prev.map((b) => {
              const enrichedMatch = enrichedResults.find(
                (e) => e && e.domain === b.domain
              );
              return enrichedMatch || b;
            })
          );
        }
      } catch (err) {
        console.error("Batch enrich error:", err);
      } finally {
        setEnrichingDomains((prev) => {
          const next = new Set(prev);
          batchDomains.forEach((d) => next.delete(d));
          return next;
        });
        completed += batch.length;
        setEnrichProgress({ current: completed, total: unenriched.length });
      }
    }

    setStatus("done");
  }, [businesses]);

  const handleStopEnrichment = useCallback(() => {
    abortRef.current = true;
  }, []);

  // Filter enriched results by min reviews per month
  const filteredBusinesses = businesses.filter((b) => {
    if ("enriched" in b && b.enriched) {
      return (b as EnrichedBusiness).reviewsLastMonth >= minReviewsPerMonth;
    }
    // Show unenriched businesses (haven't checked reviews/month yet)
    return true;
  });

  const enrichedCount = businesses.filter(
    (b) => "enriched" in b && b.enriched
  ).length;
  const qualifiedCount = businesses.filter(
    (b) =>
      "enriched" in b &&
      b.enriched &&
      (b as EnrichedBusiness).reviewsLastMonth >= minReviewsPerMonth
  ).length;

  const isWorking = status === "scanning" || status === "enriching";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100">
                TrustPilot Lead Scraper
              </h1>
              <p className="text-xs text-zinc-500">Whop GTM Engineering</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {businesses.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span>
                  <span className="font-mono font-medium text-zinc-200">
                    {businesses.length}
                  </span>{" "}
                  scraped
                </span>
                {enrichedCount > 0 && (
                  <span>
                    <span className="font-mono font-medium text-green-400">
                      {qualifiedCount}
                    </span>{" "}
                    qualified
                  </span>
                )}
              </div>
            )}
            <ExportButton
              businesses={filteredBusinesses}
              disabled={isWorking}
            />
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="border-b border-zinc-800 bg-zinc-950/50">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search by company name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="search"
                className="text-sm font-medium text-zinc-400"
              >
                Search Company
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <input
                    id="search"
                    type="text"
                    placeholder="e.g. Shopify, Stripe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim()) {
                        handleSearch(1);
                      }
                    }}
                    disabled={isWorking}
                    className="w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={() => handleSearch(1)}
                  disabled={!searchQuery.trim() || isWorking}
                  className="rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "scanning" && lastSearchMode === "search" ? (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden self-stretch py-1 sm:flex sm:items-center">
              <div className="h-8 w-px bg-zinc-700" />
            </div>

            {/* Category selector */}
            <div className="min-w-[280px] flex-1">
              <CategorySelector
                categories={categories}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                disabled={isWorking}
              />
            </div>
            <FiltersPanel
              minRating={minRating}
              minReviewsPerMonth={minReviewsPerMonth}
              onMinRatingChange={setMinRating}
              onMinReviewsPerMonthChange={setMinReviewsPerMonth}
              disabled={isWorking}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleScan(1)}
                disabled={!selectedCategory || isWorking}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "scanning" && lastSearchMode === "category" ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Scanning...
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                      />
                    </svg>
                    Scan Category
                  </>
                )}
              </button>
              {businesses.length > 0 && (
                <button
                  onClick={
                    status === "enriching" ? handleStopEnrichment : enrichAll
                  }
                  disabled={
                    status === "scanning" ||
                    enrichedCount === businesses.length
                  }
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    status === "enriching"
                      ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                      : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                  }`}
                >
                  {status === "enriching" ? (
                    <>
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      Stop Enrichment
                    </>
                  ) : enrichedCount === businesses.length ? (
                    "All Enriched"
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Enrich All ({businesses.length - enrichedCount})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {status === "enriching" && (
        <div className="border-b border-zinc-800 bg-zinc-950/30">
          <div className="mx-auto max-w-7xl px-6 py-3">
            <ProgressBar
              current={enrichProgress.current}
              total={enrichProgress.total}
              label="Enriching businesses..."
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Stats bar */}
        {businesses.length > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>
                Showing{" "}
                <span className="font-medium text-zinc-300">
                  {filteredBusinesses.length}
                </span>{" "}
                businesses
                {totalResults > 0 && (
                  <> of {totalResults.toLocaleString()} in category</>
                )}
              </span>
              {enrichedCount > 0 &&
                enrichedCount < businesses.length && (
                  <span className="text-zinc-600">
                    ({enrichedCount} enriched, {businesses.length - enrichedCount}{" "}
                    pending)
                  </span>
                )}
            </div>
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={isWorking}
                className="text-sm font-medium text-violet-400 hover:text-violet-300 disabled:opacity-50"
              >
                Load more results (page {currentPage + 1})
              </button>
            )}
          </div>
        )}

        <ResultsTable
          businesses={filteredBusinesses}
          onEnrichSingle={enrichSingle}
          enrichingDomains={enrichingDomains}
        />

        {/* Load More Button */}
        {hasMore && businesses.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={isWorking}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              Load More Results
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
