import { NextRequest, NextResponse } from "next/server";

// Extract video ID from various YouTube URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Format transcript to different export formats
function formatTranscript(segments: any[], format: string): string {
  switch (format) {
    case "srt":
      return segments
        .map((seg, i) => {
          const startTime = formatSrtTime(seg.start);
          const endTime = formatSrtTime(seg.end);
          return `${i + 1}\n${startTime} --> ${endTime}\n${seg.text.trim()}\n`;
        })
        .join("\n");

    case "vtt":
      let vtt = "WEBVTT\n\n";
      vtt += segments
        .map((seg) => {
          const startTime = formatVttTime(seg.start);
          const endTime = formatVttTime(seg.end);
          return `${startTime} --> ${endTime}\n${seg.text.trim()}\n`;
        })
        .join("\n");
      return vtt;

    case "txt":
    default:
      return segments
        .map((seg) => {
          const timestamp = formatTimestamp(seg.start);
          return `[${timestamp}] ${seg.text.trim()}`;
        })
        .join("\n\n");
  }
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format = "txt" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    // Note: In production, you would use yt-dlp or a similar tool to download audio
    // For now, we'll return an informative message about the limitation
    
    // Option 1: Use a YouTube transcript API (if available)
    // Option 2: Use yt-dlp server-side to download audio, then transcribe
    // Option 3: Use a third-party service
    
    // For demonstration, we'll attempt to use YouTube's auto-generated captions
    // via the YouTube Data API or a caption extraction service
    
    return NextResponse.json({
      success: false,
      error: "YouTube transcription requires server-side audio extraction. Please use the Audio Transcription tool with a direct audio file, or contact support to enable YouTube integration with yt-dlp.",
      videoId,
      suggestion: "For YouTube videos, you can: 1) Download the video/audio locally and upload it to the Audio Transcription tool, or 2) Use YouTube's built-in captions if available.",
    });

    // When yt-dlp is configured, the flow would be:
    // 1. Download audio from YouTube using yt-dlp
    // 2. Send audio to Whisper API
    // 3. Format and return transcript

  } catch (error: any) {
    console.error("YouTube transcription error:", error);

    return NextResponse.json(
      { success: false, error: error.message || "YouTube transcription failed" },
      { status: 500 }
    );
  }
}

// Placeholder for when yt-dlp is configured
async function transcribeYouTubeVideo(videoId: string, format: string) {
  // This would:
  // 1. Use yt-dlp to download audio: yt-dlp -x --audio-format mp3 -o "audio.mp3" "https://youtube.com/watch?v=${videoId}"
  // 2. Read the audio file
  // 3. Send to Whisper API
  // 4. Format the response
  
  // For now, return mock data
  const mockSegments = [
    { start: 0, end: 5, text: "Welcome to this video." },
    { start: 5, end: 12, text: "Today we'll be discussing an important topic." },
    { start: 12, end: 20, text: "Let's get started with the main content." },
  ];

  return {
    transcript: formatTranscript(mockSegments, format),
    segments: mockSegments,
    duration: 20,
    language: "en",
  };
}
