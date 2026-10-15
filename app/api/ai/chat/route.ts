import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  systemPrompt: string;
  conversationHistory: ChatMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, systemPrompt, conversationHistory } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build messages array for the API
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Try to get LLM config from environment or use defaults
    const apiKey = process.env.OPENAI_API_KEY;
    const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
    const useOllama = process.env.USE_OLLAMA === "true";

    let response: string;

    if (useOllama) {
      // Use Ollama for local LLM
      response = await callOllama(ollamaUrl, messages);
    } else if (apiKey) {
      // Use OpenAI
      response = await callOpenAI(apiKey, messages);
    } else {
      // Fallback: Generate a helpful response without an API
      response = generateFallbackResponse(message, systemPrompt);
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

async function callOpenAI(
  apiKey: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "No response generated";
}

async function callOllama(
  ollamaUrl: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama2",
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return data.message?.content || "No response generated";
}

function generateFallbackResponse(message: string, systemPrompt: string): string {
  // Extract the role from the system prompt
  const roleMatch = systemPrompt.match(/You are an expert (.*?) with/);
  const role = roleMatch ? roleMatch[1] : "business advisor";

  // Generate a contextual fallback response
  const responses = [
    `As your ${role}, I'd be happy to help with that question. To provide you with the most accurate and actionable advice, I'll need to analyze this in the context of your specific business situation.

**Key Considerations:**
1. What is your current business size and industry focus?
2. What specific challenges are you facing in this area?
3. What resources do you have available?

To enable full AI-powered responses, please configure your LLM settings in the Settings page with either:
- An OpenAI API key, or
- A local Ollama installation

Once configured, I'll be able to provide detailed, expert-level guidance tailored to your manufacturing business needs.`,

    `Thank you for your question about "${message.substring(0, 50)}${message.length > 50 ? "..." : ""}".

As your ${role}, I want to ensure I give you the most valuable advice possible. 

**To unlock full AI capabilities:**
1. Go to Settings → LLM Configuration
2. Add your OpenAI API key or configure Ollama
3. Return here for expert-level guidance

In the meantime, I recommend:
- Documenting your specific requirements
- Gathering relevant data and metrics
- Identifying key stakeholders involved

This preparation will help us have a more productive conversation once the AI is fully configured.`,
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
