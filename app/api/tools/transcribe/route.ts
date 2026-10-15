import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Maximum file size: 25MB (OpenAI Whisper limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables or go to Settings > LLM Configuration." },
        { status: 500 }
      );
    }
    
    const openai = new OpenAI({ apiKey });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const url = formData.get("url") as string | null;

    if (!file && !url) {
      return NextResponse.json(
        { success: false, error: "No file or URL provided" },
        { status: 400 }
      );
    }

    let audioFile: File;

    if (file) {
      // Direct file upload
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: "File size exceeds 25MB limit" },
          { status: 400 }
        );
      }
      audioFile = file;
    } else if (url) {
      // URL-based transcription - fetch the audio first
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch audio from URL");
        }
        const blob = await response.blob();
        
        if (blob.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: "File size exceeds 25MB limit" },
            { status: 400 }
          );
        }
        
        // Determine file extension from content type or URL
        const contentType = response.headers.get("content-type") || "";
        let extension = "mp3";
        if (contentType.includes("wav")) extension = "wav";
        else if (contentType.includes("mp4")) extension = "mp4";
        else if (contentType.includes("m4a")) extension = "m4a";
        else if (contentType.includes("webm")) extension = "webm";
        
        audioFile = new File([blob], `audio.${extension}`, { type: contentType });
      } catch (fetchError) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch audio from URL. For YouTube/Vimeo, use the YouTube Transcriber tool." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Format the transcript with timestamps
    const formattedTranscript = formatTranscript(transcription);

    return NextResponse.json({
      success: true,
      transcript: formattedTranscript,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments,
    });

  } catch (error: any) {
    console.error("Transcription error:", error);
    
    if (error?.status === 401) {
      return NextResponse.json(
        { success: false, error: "Invalid OpenAI API key" },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || "Transcription failed" },
      { status: 500 }
    );
  }
}

function formatTranscript(transcription: any): string {
  if (!transcription.segments || transcription.segments.length === 0) {
    return transcription.text || "";
  }

  return transcription.segments
    .map((segment: any) => {
      const timestamp = formatTimestamp(segment.start);
      return `[${timestamp}] ${segment.text.trim()}`;
    })
    .join("\n\n");
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Route segment config for Next.js App Router
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
