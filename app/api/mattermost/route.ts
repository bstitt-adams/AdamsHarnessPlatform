import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "Mattermost API is running" });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webhookUrl, message } = body;

    if (!webhookUrl) {
      return NextResponse.json(
        { success: false, error: "Webhook URL is required" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Make the request to Mattermost from the server (no CORS issues)
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `HTTP ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mattermost API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
