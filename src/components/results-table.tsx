"use client";

import { useState } from "react";
import { Business, EnrichedBusiness, SortField, SortDirection } from "@/lib/types";

interface ResultsTableProps {
  businesses: (Business | EnrichedBusiness)[];
  onEnrichSingle: (business: Business) => void;
  enrichingDomains: Set<string>;
}

function isEnriched(b: Business | EnrichedBusiness): b is EnrichedBusiness {
  return "enriched" in b && b.enriched === true;
}

function StarDisplay({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="h-4 w-4 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalf && (
        <svg
          className="h-4 w-4 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <defs>
            <linearGradient id="halfGrad">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#3f3f46" />
            </linearGradient>
          </defs>
          <path
            fill="url(#halfGrad)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="h-4 w-4 text-zinc-700"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-medium text-zinc-300">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function SocialBadge({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-violet-400 transition-colors hover:bg-zinc-700"
    >
      {label}
    </a>
  );
}

export default function ResultsTable({
  businesses,
  onEnrichSingle,
  enrichingDomains,
}: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalReviews");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...businesses].sort((a, b) => {
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "domain":
        aVal = a.domain.toLowerCase();
        bVal = b.domain.toLowerCase();
        break;
      case "starRating":
        aVal = a.starRating;
        bVal = b.starRating;
        break;
      case "totalReviews":
        aVal = a.totalReviews;
        bVal = b.totalReviews;
        break;
      case "reviewsLastMonth":
        aVal = isEnriched(a) ? a.reviewsLastMonth : -1;
        bVal = isEnriched(b) ? b.reviewsLastMonth : -1;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="h-3 w-3 text-zinc-600" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2l3 4H3l3-4zm0 8L3 6h6l-3 4z" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="h-3 w-3 text-violet-400" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 2l4 5H2l4-5z" />
      </svg>
    ) : (
      <svg className="h-3 w-3 text-violet-400" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 10L2 5h8l-4 5z" />
      </svg>
    );
  };

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 py-16 text-center">
        <svg
          className="mb-4 h-12 w-12 text-zinc-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <p className="text-lg font-medium text-zinc-500">No results yet</p>
        <p className="mt-1 text-sm text-zinc-600">
          Select a category and scan to find businesses
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/80">
            <th className="px-4 py-3 font-medium text-zinc-400">
              <button
                className="inline-flex items-center gap-1 hover:text-zinc-200"
                onClick={() => handleSort("name")}
              >
                Company <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-zinc-400">
              <button
                className="inline-flex items-center gap-1 hover:text-zinc-200"
                onClick={() => handleSort("starRating")}
              >
                Rating <SortIcon field="starRating" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-zinc-400">
              <button
                className="inline-flex items-center gap-1 hover:text-zinc-200"
                onClick={() => handleSort("totalReviews")}
              >
                Total Reviews <SortIcon field="totalReviews" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-zinc-400">
              <button
                className="inline-flex items-center gap-1 hover:text-zinc-200"
                onClick={() => handleSort("reviewsLastMonth")}
              >
                Last 30d <SortIcon field="reviewsLastMonth" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium text-zinc-400">Website</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Contact</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Socials</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Location</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((business, idx) => {
            const enriched = isEnriched(business);
            const isEnriching = enrichingDomains.has(business.domain);

            return (
              <tr
                key={`${business.domain}-${idx}`}
                className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-900/50"
              >
                <td className="px-4 py-3">
                  <div>
                    <a
                      href={business.trustpilotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-zinc-200 hover:text-violet-400"
                    >
                      {business.name}
                    </a>
                    <p className="text-xs text-zinc-500">{business.domain}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StarDisplay rating={business.starRating} />
                </td>
                <td className="px-4 py-3 font-mono text-zinc-300">
                  {business.totalReviews.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {enriched ? (
                    <span
                      className={`font-mono font-medium ${
                        business.reviewsLastMonth >= 10
                          ? "text-green-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {business.reviewsLastMonth}
                    </span>
                  ) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3">
                  {enriched && business.websiteUrl ? (
                    <a
                      href={business.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300"
                    >
                      {business.websiteUrl
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                    </a>
                  ) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3">
                  {enriched && business.email ? (
                    <a
                      href={`mailto:${business.email}`}
                      className="text-violet-400 hover:text-violet-300"
                    >
                      {business.email}
                    </a>
                  ) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {enriched ? (
                    <div className="flex flex-wrap gap-1">
                      <SocialBadge
                        href={business.socialLinks.facebook}
                        label="FB"
                      />
                      <SocialBadge
                        href={business.socialLinks.twitter}
                        label="X"
                      />
                      <SocialBadge
                        href={business.socialLinks.instagram}
                        label="IG"
                      />
                      <SocialBadge
                        href={business.socialLinks.linkedin}
                        label="LI"
                      />
                      <SocialBadge
                        href={business.socialLinks.youtube}
                        label="YT"
                      />
                      {!business.socialLinks.facebook &&
                        !business.socialLinks.twitter &&
                        !business.socialLinks.instagram &&
                        !business.socialLinks.linkedin &&
                        !business.socialLinks.youtube && (
                          <span className="text-xs text-zinc-600">None</span>
                        )}
                    </div>
                  ) : (
                    <span className="text-zinc-600">--</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {business.location || "--"}
                </td>
                <td className="px-4 py-3">
                  {!enriched && (
                    <button
                      onClick={() => onEnrichSingle(business)}
                      disabled={isEnriching}
                      className="inline-flex items-center gap-1 rounded-md bg-violet-600/20 px-2.5 py-1 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isEnriching ? (
                        <>
                          <svg
                            className="h-3 w-3 animate-spin"
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
                          Enriching...
                        </>
                      ) : (
                        "Enrich"
                      )}
                    </button>
                  )}
                  {enriched && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-500">
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Done
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
