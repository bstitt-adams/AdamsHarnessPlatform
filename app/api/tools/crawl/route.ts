import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface CrawlResult {
  url: string;
  title: string;
  description: string;
  headings: string[];
  links: string[];
  content: string;
  metadata: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, depth = 1, extractType = "all" } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Basic HTML parsing (in production, use a proper parser like cheerio)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : "";

    // Extract headings
    const headingMatches = html.matchAll(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi);
    const headings = Array.from(headingMatches).map(m => m[1].trim()).filter(h => h.length > 0);

    // Extract links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi);
    const links = Array.from(linkMatches)
      .map(m => m[1])
      .filter(link => link.startsWith("http") || link.startsWith("/"))
      .slice(0, 50); // Limit to 50 links

    // Extract text content (remove HTML tags)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000); // Limit content length

    // Use AI to extract structured information
    let aiExtraction = null;
    if (extractType === "ai" || extractType === "all") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        try {
          const openai = new OpenAI({ apiKey });
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a web content analyzer. Extract key information from the webpage content provided. Return a JSON object with:
- summary: A brief summary of the page (2-3 sentences)
- mainTopics: Array of main topics covered
- keyPoints: Array of key points or facts
- contactInfo: Any contact information found (email, phone, address)
- pricing: Any pricing information found
- callToAction: Main call-to-action on the page`,
              },
              {
                role: "user",
                content: `URL: ${url}\nTitle: ${title}\nDescription: ${description}\n\nContent:\n${textContent.slice(0, 4000)}`,
              },
            ],
            temperature: 0.3,
            response_format: { type: "json_object" },
          });

          const aiContent = aiResponse.choices[0]?.message?.content;
          if (aiContent) {
            aiExtraction = JSON.parse(aiContent);
          }
        } catch (aiError) {
          console.error("AI extraction error:", aiError);
        }
      }
    }

    const result: CrawlResult = {
      url,
      title,
      description,
      headings: headings.slice(0, 20),
      links: links.slice(0, 30),
      content: textContent.slice(0, 5000),
      metadata: {
        contentLength: textContent.length.toString(),
        linksFound: links.length.toString(),
        headingsFound: headings.length.toString(),
      },
    };

    return NextResponse.json({
      success: true,
      result,
      aiExtraction,
      depth,
    });

  } catch (error: any) {
    console.error("Crawl error:", error);

    return NextResponse.json(
      { success: false, error: error.message || "Web crawling failed" },
      { status: 500 }
    );
  }
}
