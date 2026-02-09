import * as cheerio from "cheerio";
import { Business, EnrichedBusiness, SocialLinks, ScrapeResult } from "./types";
import {
  getRandomUserAgent,
  randomDelay,
  parseReviewCount,
  parseStarRating,
  isWithinLastMonth,
} from "./utils";

const TRUSTPILOT_BASE = "https://www.trustpilot.com";

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

/**
 * Parse business cards from a Cheerio-loaded TrustPilot page.
 * Works for both category pages and search results pages (same HTML structure).
 */
function parseBusinessCards($: cheerio.CheerioAPI): Business[] {
  const businesses: Business[] = [];

  $('a[name="business-unit-card"]').each((_index, element) => {
    try {
      const $card = $(element);
      const href = $card.attr("href") || "";
      const domain = href.replace("/review/", "");

      // Company name - heading-s typography
      const name =
        $card
          .find('[class*="heading-s"]')
          .not('[class*="body-xs"]')
          .first()
          .text()
          .trim() || "";

      // Domain - displayed URL
      const displayedDomain =
        $card.find('[class*="websiteUrlDisplayed"]').text().trim() || domain;

      // Star rating from the star image alt text: "TrustScore X out of 5"
      const starAlt =
        $card.find('img[class*="starRating"]').attr("alt") || "";
      const starMatch = starAlt.match(
        /TrustScore\s+([\d.]+)\s+out\s+of\s+5/i
      );
      const starRating = starMatch ? parseFloat(starMatch[1]) : 0;

      // Trust score numeric value
      const trustScoreText =
        $card.find('[class*="trustScore"]').text().trim() || "0";
      const trustScore = parseStarRating(trustScoreText);

      // Review count
      const reviewCountEl = $card.find(
        '[data-business-unit-review-count="true"]'
      );
      const reviewText = reviewCountEl.text().trim();
      const totalReviews = parseReviewCount(reviewText);

      // Location
      const location =
        $card.find('[class*="businessLocation"] p').text().trim() || "";

      if (name && domain) {
        businesses.push({
          name,
          domain: displayedDomain || domain,
          trustpilotUrl: `${TRUSTPILOT_BASE}${href}`,
          starRating,
          trustScore,
          totalReviews,
          location,
        });
      }
    } catch {
      // Skip malformed cards
    }
  });

  return businesses;
}

/**
 * Scrape a TrustPilot category page to get business listings.
 */
export async function scrapeCategoryPage(
  categorySlug: string,
  page: number = 1
): Promise<ScrapeResult> {
  const url = `${TRUSTPILOT_BASE}/categories/${categorySlug}?page=${page}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const businesses = parseBusinessCards($);

  // Try to determine total results from the page
  let totalResults = 0;
  const companiesHeader = $("h2")
    .filter(function () {
      return $(this).text().includes("Companies");
    })
    .text();
  const totalMatch = companiesHeader.match(/\(([\d,]+)\)/);
  if (totalMatch) {
    totalResults = parseInt(totalMatch[1].replace(/,/g, ""), 10);
  }

  // Check if there are more pages
  const hasMore = businesses.length >= 20;

  return {
    businesses,
    totalResults,
    currentPage: page,
    hasMore,
    category: categorySlug,
  };
}

/**
 * Search TrustPilot by company name.
 */
export async function searchTrustpilot(
  query: string,
  page: number = 1
): Promise<ScrapeResult> {
  const url = `${TRUSTPILOT_BASE}/search?query=${encodeURIComponent(query)}&page=${page}`;
  const html = await fetchPage(url);
  const $ = cheerio.load(html);

  const businesses = parseBusinessCards($);

  // Search pages show a result count like "Showing results for ..."
  // The card count tells us if there are more pages
  const hasMore = businesses.length >= 10;

  return {
    businesses,
    totalResults: 0,
    currentPage: page,
    hasMore,
    category: `search:${query}`,
  };
}

interface JsonLdGraph {
  "@type"?: string;
  "@id"?: string;
  name?: string;
  sameAs?: string | string[];
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressCountry?: string;
    postalCode?: string;
  };
  aggregateRating?: {
    ratingValue?: string;
    reviewCount?: string;
  };
  review?: Array<{ "@id"?: string }>;
  datePublished?: string;
  reviewRating?: {
    ratingValue?: string;
  };
  [key: string]: unknown;
}

/**
 * Enrich a business by scraping its TrustPilot profile page.
 * Extracts: website URL, email, social links, and reviews in the last 30 days.
 */
export async function enrichBusiness(
  business: Business
): Promise<EnrichedBusiness> {
  const domain = business.domain;
  let websiteUrl = "";
  let email = "";
  let socialLinks: SocialLinks = {
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
  };
  let reviewsLastMonth = 0;

  try {
    // Scrape page 1
    const profileUrl = `${TRUSTPILOT_BASE}/review/${domain}`;
    const html = await fetchPage(profileUrl);
    const $ = cheerio.load(html);

    // Extract JSON-LD structured data
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let localBusiness: JsonLdGraph | null = null;
    const reviews: { date: Date; rating: number }[] = [];

    jsonLdScripts.each((_i, el) => {
      try {
        const data = JSON.parse($(el).text());
        if (data["@graph"]) {
          const graph = Array.isArray(data["@graph"])
            ? data["@graph"]
            : [data["@graph"]];
          for (const item of graph as JsonLdGraph[]) {
            if (item["@type"] === "LocalBusiness") {
              localBusiness = item;
            }
            if (item["@type"] === "Review" && item.datePublished) {
              reviews.push({
                date: new Date(item.datePublished),
                rating: parseFloat(item.reviewRating?.ratingValue || "0"),
              });
            }
          }
        }
      } catch {
        // Skip malformed JSON-LD
      }
    });

    // Extract website URL from LocalBusiness sameAs
    if (localBusiness) {
      const lb = localBusiness as JsonLdGraph;
      if (typeof lb.sameAs === "string") {
        websiteUrl = lb.sameAs;
      } else if (Array.isArray(lb.sameAs) && lb.sameAs.length > 0) {
        websiteUrl = lb.sameAs[0];
      }
      email = lb.email || "";
    }

    // Fallback: extract website from the page HTML
    if (!websiteUrl) {
      const visitLink = $('a[href*="utm_medium=company_profile"]').attr(
        "href"
      );
      if (visitLink) {
        try {
          const visitUrl = new URL(visitLink);
          websiteUrl =
            visitUrl.origin ||
            `https://${domain}`;
        } catch {
          websiteUrl = `https://${domain}`;
        }
      }
    }

    // Fallback: extract email from HTML
    if (!email) {
      const mailtoLink = $('a[href^="mailto:"]').first().attr("href");
      if (mailtoLink) {
        email = mailtoLink.replace("mailto:", "");
      }
    }

    // Extract social links from company profile sidebar (if available)
    // TrustPilot doesn't consistently expose company social links,
    // but some profiles have them in the contact section
    $("a[href]").each((_i, el) => {
      const href = $(el).attr("href") || "";
      // Skip TrustPilot's own social links in the footer
      const isFooterLink =
        $(el).closest("footer").length > 0 ||
        $(el).closest('[class*="footer"]').length > 0;
      if (isFooterLink) return;

      if (
        href.includes("facebook.com/") &&
        !href.includes("Trustpilot") &&
        !socialLinks.facebook
      ) {
        socialLinks.facebook = href;
      }
      if (
        (href.includes("twitter.com/") || href.includes("x.com/")) &&
        !href.includes("Trustpilot") &&
        !socialLinks.twitter
      ) {
        socialLinks.twitter = href;
      }
      if (
        href.includes("instagram.com/") &&
        !href.includes("trustpilot") &&
        !socialLinks.instagram
      ) {
        socialLinks.instagram = href;
      }
      if (
        href.includes("linkedin.com/") &&
        !href.includes("trustpilot") &&
        !socialLinks.linkedin
      ) {
        socialLinks.linkedin = href;
      }
      if (
        href.includes("youtube.com/") &&
        !href.includes("trustpilotreviews") &&
        !socialLinks.youtube
      ) {
        socialLinks.youtube = href;
      }
    });

    // Count reviews from the last 30 days
    let recentReviews = reviews.filter((r) => isWithinLastMonth(r.date));
    reviewsLastMonth = recentReviews.length;

    // If ALL reviews on page 1 are within 30 days, there may be more on page 2+
    // Keep fetching until we find a review older than 30 days (max 5 pages)
    if (reviews.length > 0 && recentReviews.length === reviews.length) {
      let currentPage = 2;
      const maxPages = 5;

      while (currentPage <= maxPages) {
        await randomDelay(300, 600);
        try {
          const nextUrl = `${profileUrl}?page=${currentPage}`;
          const nextHtml = await fetchPage(nextUrl);
          const $next = cheerio.load(nextHtml);

          const pageReviews: { date: Date; rating: number }[] = [];
          $next('script[type="application/ld+json"]').each((_i, el) => {
            try {
              const data = JSON.parse($next(el).text());
              if (data["@graph"]) {
                const graph = Array.isArray(data["@graph"])
                  ? data["@graph"]
                  : [data["@graph"]];
                for (const item of graph as JsonLdGraph[]) {
                  if (item["@type"] === "Review" && item.datePublished) {
                    pageReviews.push({
                      date: new Date(item.datePublished),
                      rating: parseFloat(
                        item.reviewRating?.ratingValue || "0"
                      ),
                    });
                  }
                }
              }
            } catch {
              // Skip
            }
          });

          if (pageReviews.length === 0) break;

          const pageRecentReviews = pageReviews.filter((r) =>
            isWithinLastMonth(r.date)
          );
          reviewsLastMonth += pageRecentReviews.length;

          // If not all reviews on this page are recent, we're done
          if (pageRecentReviews.length < pageReviews.length) break;

          currentPage++;
        } catch {
          break;
        }
      }
    }
  } catch (error) {
    console.error(`Error enriching ${domain}:`, error);
  }

  return {
    ...business,
    websiteUrl: websiteUrl || `https://${domain}`,
    email,
    reviewsLastMonth,
    socialLinks,
    enriched: true,
  };
}

/**
 * Enrich multiple businesses in batch with rate limiting.
 */
export async function enrichBusinessBatch(
  businesses: Business[]
): Promise<{ results: (EnrichedBusiness | null)[]; errors: { domain: string; error: string }[] }> {
  const results: (EnrichedBusiness | null)[] = [];
  const errors: { domain: string; error: string }[] = [];

  for (const business of businesses) {
    try {
      await randomDelay(200, 500);
      const enriched = await enrichBusiness(business);
      results.push(enriched);
    } catch (error) {
      results.push(null);
      errors.push({
        domain: business.domain,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { results, errors };
}
