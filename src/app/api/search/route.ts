import { NextRequest, NextResponse } from "next/server";
import { searchTrustpilot } from "@/lib/scraper";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const minRating = parseFloat(searchParams.get("minRating") || "0");

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required parameter: query" },
      { status: 400 }
    );
  }

  try {
    const result = await searchTrustpilot(query.trim(), page);

    // Pre-filter by minimum star rating
    if (minRating > 0) {
      result.businesses = result.businesses.filter(
        (b) => b.starRating >= minRating
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search TrustPilot",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
