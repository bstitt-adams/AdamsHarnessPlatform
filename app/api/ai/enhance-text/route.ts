import { NextRequest, NextResponse } from "next/server";
import { getLLMConfig, createOpenAIClient } from "@/lib/openai-config";

interface EnhanceTextRequest {
  text: string;
  context?: {
    type: string;
    opportunityName?: string;
    organization?: string;
    stage?: string;
    value?: string;
    description?: string;
  };
  prompt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhanceTextRequest = await request.json();
    const { text, context, prompt } = body;

    if (!text && !context?.opportunityName) {
      return NextResponse.json(
        { error: "Text or context is required" },
        { status: 400 }
      );
    }

    // Build the system prompt based on context type
    let systemPrompt = "You are a professional business writer specializing in sales and consulting. IMPORTANT: Respond ONLY with the requested content. Do NOT include any introductory phrases like 'Here is...', 'Sure, here\'s...', 'Certainly!', 'I\'d be happy to...', or any preamble. Start directly with the enhanced text.";
    let userPrompt = prompt || "Enhance this text to be more professional and compelling.";

    if (context?.type === "opportunity_description") {
      systemPrompt = `You are a professional business writer specializing in sales opportunities and consulting proposals. 
You write clear, compelling descriptions that highlight value propositions and business outcomes.
Keep the tone professional but engaging. Focus on the business impact and potential value.
IMPORTANT: Respond ONLY with the enhanced description text. Do NOT include any introductory phrases, preamble, or meta-commentary. Start directly with the content.`;
      
      userPrompt = `${prompt || "Create a professional, compelling description for this sales opportunity."}

Context:
- Opportunity Name: ${context.opportunityName || "Not specified"}
- Organization: ${context.organization || "Not specified"}
- Stage: ${context.stage || "Lead"}
- Deal Value: ${context.value ? `$${context.value}` : "Not specified"}

Original text to enhance:
${text}

Please provide an enhanced, professional description that:
1. Clearly states the business opportunity
2. Highlights the potential value and impact
3. Is concise but informative (2-3 paragraphs)
4. Uses professional business language`;
    } else if (context?.type === "opportunity_notes") {
      systemPrompt = `You are a professional business analyst who creates clear, actionable notes for sales opportunities.
You organize information logically and highlight key action items and next steps.
IMPORTANT: Respond ONLY with the enhanced notes. Do NOT include any introductory phrases, preamble, or meta-commentary. Start directly with the content.`;
      
      userPrompt = `${prompt || "Expand and professionalize these notes for a sales opportunity."}

Context:
- Opportunity Name: ${context.opportunityName || "Not specified"}
- Organization: ${context.organization || "Not specified"}
- Stage: ${context.stage || "Lead"}
- Description: ${context.description || "Not provided"}

Original notes to enhance:
${text}

Please provide enhanced notes that:
1. Are well-organized with clear sections
2. Include action items and next steps
3. Highlight key considerations and risks
4. Use bullet points for readability
5. Maintain a professional tone`;
    }

    // Get LLM configuration from stored settings (Firebase or env vars)
    const llmConfig = await getLLMConfig();
    
    console.log("[enhance-text] LLM config found:", !!llmConfig);
    if (llmConfig) {
      console.log("[enhance-text] Provider:", llmConfig.provider, "Model:", llmConfig.model, "BaseURL:", llmConfig.baseUrl);
    }

    let enhancedText: string;

    if (llmConfig) {
      try {
        console.log("[enhance-text] Calling LLM...");
        const rawResponse = await callLLM(llmConfig, systemPrompt, userPrompt);
        enhancedText = cleanLLMResponse(rawResponse);
        console.log("[enhance-text] LLM call successful, response length:", enhancedText.length);
      } catch (llmError) {
        console.error("[enhance-text] LLM call failed:", llmError);
        // If LLM call fails, use fallback
        enhancedText = generateFallbackEnhancement(text, context);
      }
    } else {
      console.log("[enhance-text] No LLM configuration found, using fallback");
      // Fallback: Return a formatted version of the original text
      enhancedText = generateFallbackEnhancement(text, context);
    }

    return NextResponse.json({ success: true, enhancedText });
  } catch (error) {
    console.error("AI Enhance Text error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}

function cleanLLMResponse(text: string): string {
  // Strip common LLM preamble/introductory phrases
  const preamblePatterns = [
    /^(Sure[,!]?\s*(here['']s|here is|I['']d be happy to|I can help)[^.]*[.!:]\s*)/i,
    /^(Certainly[,!]?\s*(here['']s|here is)[^.]*[.!:]\s*)/i,
    /^(Of course[,!]?\s*[^.]*[.!:]\s*)/i,
    /^(Absolutely[,!]?\s*[^.]*[.!:]\s*)/i,
    /^(Here['']?s?\s*(is|are)?\s*(the|a|an|your)?\s*(enhanced|improved|revised|updated|professional|polished)[^:]*:\s*)/i,
    /^(I['']?d be happy to[^.]*[.!:]\s*)/i,
    /^(I['']?ve (enhanced|improved|revised|updated|created|written|drafted)[^.]*[.!:]\s*)/i,
    /^(Below is[^.]*[.!:]\s*)/i,
    /^(The following is[^.]*[.!:]\s*)/i,
    /^(Here you go[,!]?\s*)/i,
    /^(Great[,!]?\s*(here|let me)[^.]*[.!:]\s*)/i,
    /^(Let me[^.]*[.!:]\s*)/i,
  ];

  let cleaned = text.trim();
  for (const pattern of preamblePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Also strip trailing meta-commentary like "Let me know if you'd like..."
  const trailingPatterns = [
    /(\n\s*---\s*\n[\s\S]*$)/,
    /(\n\s*Let me know if[^]*$)/i,
    /(\n\s*Feel free to[^]*$)/i,
    /(\n\s*I hope this[^]*$)/i,
    /(\n\s*Would you like[^]*$)/i,
    /(\n\s*If you('d| would) like[^]*$)/i,
    /(\n\s*Is there anything[^]*$)/i,
  ];

  for (const pattern of trailingPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

async function callLLM(
  llmConfig: { provider: string; apiKey: string; baseUrl?: string; model?: string },
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  // Create OpenAI client with proper configuration
  const openai = await createOpenAIClient();
  
  if (!openai) {
    throw new Error("Failed to create OpenAI client");
  }

  // Determine the model to use
  let model = llmConfig.model || "gpt-4o";
  
  // Adjust model name for different providers
  if (llmConfig.provider === "ollama") {
    // For Ollama, use the model directly or default to llama3
    model = model === "gpt-4o" ? "llama3" : model;
  } else if (llmConfig.provider === "anthropic") {
    // Anthropic models
    model = model.startsWith("claude") ? model : "claude-3-sonnet-20240229";
  } else if (llmConfig.provider === "google") {
    // Google AI models
    model = model.startsWith("gemini") ? model : "gemini-pro";
  } else if (llmConfig.provider === "mistral") {
    // Mistral models
    model = model.startsWith("mistral") ? model : "mistral-large";
  } else if (llmConfig.provider === "openai-compatible") {
    // For OpenAI-compatible, keep user-configured model as-is
    // Only override if it's still the default OpenAI model name
    if (model === "gpt-4o") {
      model = "";
    }
  }
  
  // If model is empty (openai-compatible with no configured model), auto-detect
  if (!model && llmConfig.provider === "openai-compatible") {
    console.log("[callLLM] No model configured, auto-detecting from endpoint...");
    try {
      const models = await openai.models.list();
      if (models.data.length > 0) {
        model = models.data[0].id;
        console.log("[callLLM] Auto-detected model:", model);
      }
    } catch (detectError) {
      console.error("[callLLM] Failed to auto-detect models:", detectError);
    }
  }

  if (!model) {
    throw new Error("No model available for provider: " + llmConfig.provider);
  }

  console.log("[callLLM] Using model:", model, "for provider:", llmConfig.provider);

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || "No response generated";
  } catch (error: any) {
    // If model not found, try to get available models and use the first one
    if (error.status === 404 && llmConfig.provider === "openai-compatible") {
      console.log("[callLLM] Model not found, trying to get available models...");
      try {
        const models = await openai.models.list();
        if (models.data.length > 0) {
          const firstModel = models.data[0].id;
          console.log("[callLLM] Retrying with model:", firstModel);
          
          const completion = await openai.chat.completions.create({
            model: firstModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          });
          
          return completion.choices[0]?.message?.content || "No response generated";
        }
      } catch (modelError) {
        console.error("[callLLM] Failed to get available models:", modelError);
      }
    }
    throw error;
  }
}

function generateFallbackEnhancement(
  text: string,
  context?: EnhanceTextRequest["context"]
): string {
  if (context?.type === "opportunity_description") {
    const orgName = context.organization || "the client";
    const oppName = context.opportunityName || "this opportunity";
    
    return `**Business Opportunity: ${oppName}**

This opportunity represents a strategic engagement with ${orgName} to deliver value-added consulting services. ${text ? `\n\n${text}` : ""}

**Key Objectives:**
- Assess current state and identify improvement opportunities
- Develop actionable recommendations aligned with business goals
- Support implementation and measure outcomes

**Expected Outcomes:**
- Enhanced operational efficiency
- Improved business processes
- Measurable return on investment

*Note: To enable AI-powered text enhancement, please configure your OpenAI API key or Ollama in Settings → LLM Configuration.*`;
  } else if (context?.type === "opportunity_notes") {
    return `**Opportunity Notes**

${text || "No initial notes provided."}

**Action Items:**
• Schedule discovery meeting with key stakeholders
• Gather relevant documentation and data
• Prepare preliminary assessment framework

**Next Steps:**
• Confirm meeting dates and attendees
• Review any existing materials
• Prepare questions for discovery session

**Key Considerations:**
• Timeline and resource availability
• Decision-making process and stakeholders
• Budget and approval requirements

*Note: To enable AI-powered text enhancement, please configure your OpenAI API key or Ollama in Settings → LLM Configuration.*`;
  }

  // Generic fallback
  return `${text}

---
*To enable AI-powered text enhancement, please configure your OpenAI API key or Ollama in Settings → LLM Configuration.*`;
}
