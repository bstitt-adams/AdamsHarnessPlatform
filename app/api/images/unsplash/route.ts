import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");
  const perPage = searchParams.get("per_page") || "15";

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Unsplash API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images from Unsplash" },
      { status: 500 }
    );
  }
}
