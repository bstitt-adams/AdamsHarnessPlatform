import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Valid sizes for DALL-E 3
const VALID_SIZES = ["1024x1024", "1792x1024", "1024x1792"] as const;
type ImageSize = typeof VALID_SIZES[number];

// Valid quality options
const VALID_QUALITY = ["standard", "hd"] as const;
type ImageQuality = typeof VALID_QUALITY[number];

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({ apiKey });

    const body = await request.json();
    const { 
      prompt, 
      size = "1024x1024", 
      quality = "standard",
      style = "vivid" 
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Prompt exceeds maximum length of 4000 characters" },
        { status: 400 }
      );
    }

    if (!VALID_SIZES.includes(size as ImageSize)) {
      return NextResponse.json(
        { success: false, error: `Invalid size. Valid options: ${VALID_SIZES.join(", ")}` },
        { status: 400 }
      );
    }

    if (!VALID_QUALITY.includes(quality as ImageQuality)) {
      return NextResponse.json(
        { success: false, error: `Invalid quality. Valid options: ${VALID_QUALITY.join(", ")}` },
        { status: 400 }
      );
    }

    // Call OpenAI DALL-E 3 API
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size as ImageSize,
      quality: quality as ImageQuality,
      style: style === "natural" ? "natural" : "vivid",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;
    const revisedPrompt = response.data?.[0]?.revised_prompt;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "No image generated" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
      size,
      quality,
    });

  } catch (error: any) {
    console.error("Image generation error:", error);

    if (error?.status === 401) {
      return NextResponse.json(
        { success: false, error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    if (error?.code === "content_policy_violation") {
      return NextResponse.json(
        { success: false, error: "Your prompt was rejected due to content policy. Please try a different prompt." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
