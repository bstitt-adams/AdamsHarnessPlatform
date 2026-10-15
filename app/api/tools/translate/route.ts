import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

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
    const outputMode = formData.get("outputMode") as string || "text"; // "text" or "audio"

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Step 1: Transcribe the Spanish audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "es", // Spanish
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const spanishText = transcription.text;

    // Step 2: Translate Spanish to English using GPT
    const translationResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional Spanish to English translator. Translate the following Spanish text to English accurately while preserving the tone and meaning. Only output the translation, nothing else.",
        },
        {
          role: "user",
          content: spanishText,
        },
      ],
      temperature: 0.3,
    });

    const englishText = translationResponse.choices[0]?.message?.content || "";

    // Step 3: If audio output is requested, generate TTS
    let audioBase64: string | null = null;
    if (outputMode === "audio") {
      const audioResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: englishText,
        response_format: "mp3",
      });

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      audioBase64 = audioBuffer.toString("base64");
    }

    // Format segments with translations if available
    const segments = transcription.segments?.map((segment: any) => ({
      start: segment.start,
      end: segment.end,
      spanish: segment.text.trim(),
    }));

    return NextResponse.json({
      success: true,
      spanishText,
      englishText,
      audioBase64,
      duration: transcription.duration,
      segments,
    });

  } catch (error: any) {
    console.error("Translation error:", error);

    if (error?.status === 401) {
      return NextResponse.json(
        { success: false, error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
