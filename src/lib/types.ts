export interface Business {
  name: string;
  domain: string;
  trustpilotUrl: string;
  starRating: number;
  trustScore: number;
  totalReviews: number;
  location: string;
}

export interface EnrichedBusiness extends Business {
  websiteUrl: string;
  email: string;
  reviewsLastMonth: number;
  socialLinks: SocialLinks;
  enriched: true;
}

export interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  [key: string]: string;
}

export interface Category {
  slug: string;
  name: string;
  children?: Category[];
}

export interface ScrapeResult {
  businesses: Business[];
  totalResults: number;
  currentPage: number;
  hasMore: boolean;
  category: string;
}

export interface EnrichResult {
  enrichedBusinesses: (EnrichedBusiness | null)[];
  errors: { domain: string; error: string }[];
}

export type SortField =
  | "name"
  | "starRating"
  | "totalReviews"
  | "reviewsLastMonth"
  | "domain";

export type SortDirection = "asc" | "desc";
