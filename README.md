# TrustPilot Lead Scraper

A web scraping tool built for Whop's GTM team to find businesses worth outbounding to on TrustPilot. Filter companies by star rating, recent review activity, and enrich with website URLs and contact data.

## Features

- **Category scanning** -- Browse all 22 TrustPilot categories and 150+ subcategories
- **Smart filtering** -- Pre-filter by minimum star rating (default: 3+)
- **Profile enrichment** -- Scrape individual business profiles for website URLs, email, social links, and 30-day review counts
- **Review activity filter** -- Identify businesses with 10+ reviews in the past month
- **CSV export** -- Download qualified leads as a CSV file
- **Batch processing** -- Enrich businesses in batches with progress tracking

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Cheerio** for HTML parsing
- Deployed on **Vercel**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Select a category** from the dropdown (e.g., "Internet & Software")
2. **Click "Scan Category"** to scrape the TrustPilot category page
3. **Click "Enrich All"** to fetch detailed profile data for each business
4. **Filter results** -- enriched businesses are automatically filtered by minimum reviews/month
5. **Export CSV** with the qualified leads

## Deployment

Deploy to Vercel:

```bash
npx vercel
```

Or connect the GitHub repo to Vercel for automatic deployments.
