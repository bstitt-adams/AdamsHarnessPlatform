import { NextRequest, NextResponse } from "next/server";

interface GenerateBudgetRequest {
  proposalName: string;
  proposalType?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  milestones?: Array<{ name: string; description: string }>;
  entities?: Array<{ name: string; role: string }>;
}

interface BudgetBreakdown {
  category: string;
  amount: number;
  description: string;
}

async function callOpenAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function generateFallbackBudget(request: GenerateBudgetRequest): { totalBudget: number; breakdown: BudgetBreakdown[] } {
  const { proposalType, startDate, endDate, milestones, entities } = request;
  
  // Calculate project duration in months
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
  const durationMonths = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000)));
  
  // Base budget factors
  const milestonesCount = milestones?.length || 5;
  const entitiesCount = entities?.length || 1;
  
  // Calculate budget based on type and complexity
  let baseBudget = 50000; // Default base
  
  switch (proposalType) {
    case "grant":
      baseBudget = 75000;
      break;
    case "contract":
      baseBudget = 100000;
      break;
    case "rfp":
      baseBudget = 150000;
      break;
    case "research":
      baseBudget = 200000;
      break;
    default:
      baseBudget = 50000;
  }
  
  // Adjust for duration and complexity
  const durationMultiplier = Math.min(durationMonths / 12, 3);
  const complexityMultiplier = 1 + (milestonesCount * 0.1) + (entitiesCount * 0.15);
  
  const totalBudget = Math.round(baseBudget * durationMultiplier * complexityMultiplier);
  
  // Create budget breakdown
  const breakdown: BudgetBreakdown[] = [
    {
      category: "Personnel",
      amount: Math.round(totalBudget * 0.45),
      description: "Salaries, wages, and benefits for project staff",
    },
    {
      category: "Equipment & Supplies",
      amount: Math.round(totalBudget * 0.15),
      description: "Equipment, materials, and supplies needed for project execution",
    },
    {
      category: "Travel",
      amount: Math.round(totalBudget * 0.08),
      description: "Travel expenses for meetings, site visits, and conferences",
    },
    {
      category: "Subcontracts",
      amount: Math.round(totalBudget * 0.12),
      description: "Payments to subcontractors and consultants",
    },
    {
      category: "Indirect Costs",
      amount: Math.round(totalBudget * 0.15),
      description: "Administrative overhead and facilities costs",
    },
    {
      category: "Contingency",
      amount: Math.round(totalBudget * 0.05),
      description: "Reserve for unexpected expenses",
    },
  ];
  
  return { totalBudget, breakdown };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateBudgetRequest = await request.json();
    const { proposalName, proposalType, description, startDate, endDate, milestones, entities } = body;

    if (!proposalName) {
      return NextResponse.json(
        { error: "Proposal name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      const systemPrompt = `You are a financial planning expert who creates realistic project budgets. 
You understand different types of proposals (grants, contracts, RFPs) and create appropriate budget estimates.
Always respond with valid JSON containing totalBudget and breakdown.`;

      const userPrompt = `Generate a realistic budget estimate for the following proposal:

Proposal Name: ${proposalName}
Type: ${proposalType || "General"}
Description: ${description || "Not provided"}
Start Date: ${startDate || "Not specified"}
End Date: ${endDate || "Not specified"}
Number of Milestones: ${milestones?.length || "Not specified"}
Collaborating Entities: ${entities?.map(e => e.name).join(", ") || "Not specified"}

Generate a realistic total budget and breakdown that:
1. Is appropriate for the proposal type and scope
2. Includes standard budget categories
3. Has realistic allocations

Respond ONLY with JSON in this format:
{
  "totalBudget": 150000,
  "breakdown": [
    {"category": "Personnel", "amount": 67500, "description": "Staff salaries and benefits"},
    {"category": "Equipment", "amount": 22500, "description": "Equipment and supplies"},
    {"category": "Travel", "amount": 12000, "description": "Travel expenses"},
    {"category": "Subcontracts", "amount": 18000, "description": "Consultant fees"},
    {"category": "Indirect Costs", "amount": 22500, "description": "Overhead"},
    {"category": "Contingency", "amount": 7500, "description": "Reserve funds"}
  ]
}`;

      try {
        const aiResponse = await callOpenAI(apiKey, systemPrompt, userPrompt);
        
        // Parse JSON from response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const budgetData = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ 
            success: true, 
            totalBudget: budgetData.totalBudget,
            breakdown: budgetData.breakdown 
          });
        }
      } catch (aiError) {
        console.error("AI generation error:", aiError);
      }
    }

    // Fallback to generated budget
    const { totalBudget, breakdown } = generateFallbackBudget(body);
    return NextResponse.json({ success: true, totalBudget, breakdown });

  } catch (error) {
    console.error("Generate budget error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate budget" },
      { status: 500 }
    );
  }
}
