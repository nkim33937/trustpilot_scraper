import { NextRequest, NextResponse } from "next/server";
import { scrapeCategoryPage } from "@/lib/scraper";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const minRating = parseFloat(searchParams.get("minRating") || "0");

  if (!category) {
    return NextResponse.json(
      { error: "Missing required parameter: category" },
      { status: 400 }
    );
  }

  try {
    const result = await scrapeCategoryPage(category, page);

    // Pre-filter by minimum star rating
    if (minRating > 0) {
      result.businesses = result.businesses.filter(
        (b) => b.starRating >= minRating
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape category page",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
