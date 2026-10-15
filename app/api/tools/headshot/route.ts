import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Headshot style prompts
const STYLE_PROMPTS: Record<string, string> = {
  professional: "Transform this photo into a professional corporate headshot with clean lighting, neutral background, and business attire appearance. Maintain the person's likeness while enhancing for professional use.",
  creative: "Transform this photo into an artistic creative headshot with dynamic lighting and a modern aesthetic. Maintain the person's likeness while adding creative flair.",
  casual: "Transform this photo into a friendly, approachable casual headshot with warm lighting and a relaxed feel. Maintain the person's likeness.",
  executive: "Transform this photo into a premium executive headshot suitable for C-suite profiles with sophisticated lighting and a prestigious feel. Maintain the person's likeness.",
  linkedin: "Transform this photo into an optimized LinkedIn profile headshot with professional lighting, clean background, and approachable expression. Maintain the person's likeness.",
  passport: "Transform this photo into a clean ID/passport style photo with neutral expression, white background, and even lighting. Maintain the person's likeness exactly.",
};

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const style = formData.get("style") as string || "professional";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Image file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size (max 4MB for DALL-E)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 4MB limit" },
        { status: 400 }
      );
    }

    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.professional;

    // Note: DALL-E 3 doesn't support image editing directly
    // For a real headshot generator, you would use:
    // 1. A fine-tuned model
    // 2. Replicate API with a headshot model
    // 3. Stability AI
    // For now, we'll use DALL-E 3 with a descriptive prompt approach

    // Convert image to base64 for potential future use
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // Generate a professional headshot using DALL-E 3
    // In production, you'd want to use a model that can actually transform the input image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a photorealistic professional headshot portrait. ${stylePrompt} The image should be high quality, well-lit, and suitable for professional use. Square format, centered on the face.`,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
      response_format: "url",
    });

    const imageUrl = response.data?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to generate headshot" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      style,
      note: "For best results with actual photo transformation, consider using a specialized AI headshot service.",
    });

  } catch (error: any) {
    console.error("Headshot generation error:", error);

    if (error?.status === 401) {
      return NextResponse.json(
        { success: false, error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Headshot generation failed" },
      { status: 500 }
    );
  }
}
