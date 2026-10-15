import { NextRequest, NextResponse } from "next/server";

interface CourseGenerateRequest {
  systemPrompt: string;
  userPrompt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CourseGenerateRequest = await request.json();
    const { systemPrompt, userPrompt } = body;

    if (!systemPrompt || !userPrompt) {
      return NextResponse.json(
        { success: false, error: "System prompt and user prompt are required" },
        { status: 400 }
      );
    }

    // Try to get LLM config from environment
    const apiKey = process.env.OPENAI_API_KEY;
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const useOllama = process.env.USE_OLLAMA === "true";

    let content: string;

    if (useOllama) {
      content = await callOllama(ollamaUrl, systemPrompt, userPrompt);
    } else if (apiKey) {
      content = await callOpenAI(apiKey, systemPrompt, userPrompt);
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: "No AI provider configured. Please set OPENAI_API_KEY in environment or configure in Settings." 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("AI Course Generate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response generated";
}

async function callOllama(
  ollamaUrl: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || "No response generated";
}
