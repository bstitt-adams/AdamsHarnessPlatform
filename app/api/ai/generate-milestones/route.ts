import { NextRequest, NextResponse } from "next/server";
import { getLLMConfig, createOpenAIClient } from "@/lib/openai-config";

interface GenerateMilestonesRequest {
  proposalName: string;
  proposalType?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  existingMilestones?: Array<{ name: string; description: string }>;
}

interface Milestone {
  name: string;
  description: string;
  dueDate: string;
  responsibleParties: string[];
  dependencies: string[];
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
  let model = llmConfig.model || "gpt-4o-mini";
  
  // Adjust model name for different providers
  if (llmConfig.provider === "ollama") {
    // For Ollama, use the model directly or default to llama3
    model = model === "gpt-4o-mini" ? "llama3" : model;
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
    if (model === "gpt-4o-mini") {
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
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || "";
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
            max_tokens: 2000,
          });
          
          return completion.choices[0]?.message?.content || "";
        }
      } catch (modelError) {
        console.error("[callLLM] Failed to get available models:", modelError);
      }
    }
    throw error;
  }
}

function generateFallbackMilestones(request: GenerateMilestonesRequest): Milestone[] {
  const { proposalName, proposalType, startDate, endDate } = request;
  
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
  const duration = end.getTime() - start.getTime();
  
  const milestones: Milestone[] = [
    {
      name: "Project Kickoff",
      description: `Initial kickoff meeting for ${proposalName}. Establish team roles, communication protocols, and project governance.`,
      dueDate: new Date(start.getTime() + duration * 0.05).toISOString().split("T")[0],
      responsibleParties: ["Project Lead"],
      dependencies: [],
    },
    {
      name: "Requirements & Planning",
      description: "Complete detailed requirements gathering and project planning documentation.",
      dueDate: new Date(start.getTime() + duration * 0.15).toISOString().split("T")[0],
      responsibleParties: ["Project Manager", "Stakeholders"],
      dependencies: ["Project Kickoff"],
    },
    {
      name: "Phase 1 Implementation",
      description: "Complete first phase of implementation including core deliverables.",
      dueDate: new Date(start.getTime() + duration * 0.4).toISOString().split("T")[0],
      responsibleParties: ["Implementation Team"],
      dependencies: ["Requirements & Planning"],
    },
    {
      name: "Mid-Project Review",
      description: "Conduct mid-project review, assess progress, and adjust timeline if needed.",
      dueDate: new Date(start.getTime() + duration * 0.5).toISOString().split("T")[0],
      responsibleParties: ["Project Lead", "Stakeholders"],
      dependencies: ["Phase 1 Implementation"],
    },
    {
      name: "Phase 2 Implementation",
      description: "Complete second phase of implementation and integration.",
      dueDate: new Date(start.getTime() + duration * 0.75).toISOString().split("T")[0],
      responsibleParties: ["Implementation Team"],
      dependencies: ["Mid-Project Review"],
    },
    {
      name: "Testing & Quality Assurance",
      description: "Complete comprehensive testing and quality assurance processes.",
      dueDate: new Date(start.getTime() + duration * 0.85).toISOString().split("T")[0],
      responsibleParties: ["QA Team"],
      dependencies: ["Phase 2 Implementation"],
    },
    {
      name: "Final Deliverables & Closeout",
      description: "Submit final deliverables, documentation, and conduct project closeout.",
      dueDate: new Date(start.getTime() + duration * 0.95).toISOString().split("T")[0],
      responsibleParties: ["Project Lead"],
      dependencies: ["Testing & Quality Assurance"],
    },
  ];

  return milestones;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMilestonesRequest = await request.json();
    const { proposalName, proposalType, description, startDate, endDate, existingMilestones } = body;

    if (!proposalName) {
      return NextResponse.json(
        { error: "Proposal name is required" },
        { status: 400 }
      );
    }

    const llmConfig = await getLLMConfig();

    if (llmConfig) {
      const systemPrompt = `You are a project management expert who creates detailed, realistic project milestones. 
You understand different types of proposals (grants, contracts, RFPs) and create appropriate milestones.
Always respond with valid JSON array of milestones.`;

      const userPrompt = `Generate 5-7 project milestones for the following proposal:

Proposal Name: ${proposalName}
Type: ${proposalType || "General"}
Description: ${description || "Not provided"}
Start Date: ${startDate || "Not specified"}
End Date: ${endDate || "Not specified"}
${existingMilestones?.length ? `Existing Milestones to consider: ${existingMilestones.map(m => m.name).join(", ")}` : ""}

Generate milestones that:
1. Are specific and measurable
2. Have realistic timeframes based on the project duration
3. Include clear descriptions
4. Identify responsible parties
5. Note dependencies between milestones

Respond ONLY with a JSON array in this format:
[
  {
    "name": "Milestone Name",
    "description": "Detailed description of what this milestone entails",
    "dueDate": "YYYY-MM-DD",
    "responsibleParties": ["Party 1", "Party 2"],
    "dependencies": ["Previous Milestone Name"]
  }
]`;

      try {
        const aiResponse = await callLLM(llmConfig, systemPrompt, userPrompt);
        
        // Parse JSON from response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const milestones = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, milestones });
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
      }
    }

    // Fallback to generated milestones
    const milestones = generateFallbackMilestones(body);
    return NextResponse.json({ success: true, milestones });

  } catch (error) {
    console.error("Generate milestones error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate milestones" },
      { status: 500 }
    );
  }
}
