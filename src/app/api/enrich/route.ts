import { NextRequest, NextResponse } from "next/server";
import { enrichBusinessBatch } from "@/lib/scraper";
import { Business } from "@/lib/types";

export const maxDuration = 60; // Allow up to 60s on Vercel Pro

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const businesses: Business[] = body.businesses;

    if (!businesses || !Array.isArray(businesses) || businesses.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty businesses array in request body" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent timeouts
    if (businesses.length > 5) {
      return NextResponse.json(
        { error: "Batch size too large. Maximum 5 businesses per request." },
        { status: 400 }
      );
    }

    const { results, errors } = await enrichBusinessBatch(businesses);

    return NextResponse.json({
      enrichedBusinesses: results,
      errors,
    });
  } catch (error) {
    console.error("Enrich error:", error);
    return NextResponse.json(
      {
        error: "Failed to enrich businesses",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
