import { Business, EnrichedBusiness } from "./types";

const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function randomDelay(min = 200, max = 500): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
}

export function parseRelativeDate(dateStr: string): Date {
  const now = new Date();
  const lower = dateStr.trim().toLowerCase();

  // Handle "X hours ago", "X minutes ago", etc.
  const agoMatch = lower.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    const d = new Date(now);
    switch (unit) {
      case "second": d.setSeconds(d.getSeconds() - amount); break;
      case "minute": d.setMinutes(d.getMinutes() - amount); break;
      case "hour": d.setHours(d.getHours() - amount); break;
      case "day": d.setDate(d.getDate() - amount); break;
      case "week": d.setDate(d.getDate() - amount * 7); break;
      case "month": d.setMonth(d.getMonth() - amount); break;
      case "year": d.setFullYear(d.getFullYear() - amount); break;
    }
    return d;
  }

  // Handle "a day ago", "an hour ago"
  if (lower.includes("a day ago") || lower.includes("1 day ago")) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }
  if (lower.includes("an hour ago") || lower.includes("1 hour ago")) {
    const d = new Date(now);
    d.setHours(d.getHours() - 1);
    return d;
  }

  // Handle "X days ago" pattern like "A day ago"
  if (lower === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d;
  }

  // Try to parse absolute dates like "January 28, 2026" or "Jan 28, 2026"
  const parsed = new Date(dateStr.trim());
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Fallback: return current date
  return now;
}

export function isWithinLastMonth(date: Date): boolean {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return date >= thirtyDaysAgo;
}

export function parseReviewCount(text: string): number {
  const cleaned = text.replace(/[,\s]/g, "").replace(/reviews?/i, "").trim();

  // Handle abbreviated counts like "47K", "1.2K", "206K"
  const kMatch = cleaned.match(/^([\d.]+)K$/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  const mMatch = cleaned.match(/^([\d.]+)M$/i);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 1000000);
  }

  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export function parseStarRating(text: string): number {
  // Extract number like "4.9" or "3.5" from text
  const match = text.match(/([\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

export function businessesToCSV(businesses: (Business | EnrichedBusiness)[]): string {
  const isEnriched = (b: Business | EnrichedBusiness): b is EnrichedBusiness =>
    "enriched" in b && b.enriched === true;

  const headers = [
    "Company Name",
    "Domain",
    "Star Rating",
    "Trust Score",
    "Total Reviews",
    "Reviews Last 30 Days",
    "Website URL",
    "Email",
    "Location",
    "TrustPilot URL",
    "Facebook",
    "Twitter",
    "Instagram",
    "LinkedIn",
    "YouTube",
  ];

  const rows = businesses.map((b) => {
    const enriched = isEnriched(b);
    return [
      escapeCsvField(b.name),
      escapeCsvField(b.domain),
      b.starRating.toString(),
      b.trustScore.toString(),
      b.totalReviews.toString(),
      enriched ? b.reviewsLastMonth.toString() : "",
      enriched ? escapeCsvField(b.websiteUrl) : "",
      enriched ? escapeCsvField(b.email) : "",
      escapeCsvField(b.location),
      escapeCsvField(b.trustpilotUrl),
      enriched ? escapeCsvField(b.socialLinks.facebook) : "",
      enriched ? escapeCsvField(b.socialLinks.twitter) : "",
      enriched ? escapeCsvField(b.socialLinks.instagram) : "",
      enriched ? escapeCsvField(b.socialLinks.linkedin) : "",
      enriched ? escapeCsvField(b.socialLinks.youtube) : "",
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

function escapeCsvField(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
