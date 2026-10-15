import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const perPage = searchParams.get("per_page") || "15";

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "Pexels API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Pexels API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images from Pexels" },
      { status: 500 }
    );
  }
}
