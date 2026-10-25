import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireAdmin } from "@/lib/auth/server-auth";
import { adminDb } from "@/lib/firebase-admin";
import { requestHermesStructured } from "@/lib/hermes/client";
import { COLLECTIONS, type TeamMemberDoc, type UserAssetDoc } from "@/lib/schema";

const aiSelectionSchema = z.object({
  candidateId: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(500),
});

type Candidate = {
  member: TeamMemberDoc;
  score: number;
  matchedName: string;
  reason: string;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(text: string, phrase: string) {
  return new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}\\b`).test(text);
}

function memberAliases(member: TeamMemberDoc) {
  const first = normalize(member.firstName || "");
  const middle = normalize(member.middleName || "");
  const last = normalize(member.lastName || "");
  const aliases = [
    [first, middle, last],
    [first, last],
    [last, first],
    [last, middle, first],
  ]
    .map((parts) => parts.filter(Boolean).join(" "))
    .filter(Boolean);
  return [...new Set(aliases)];
}

function scoreMember(assetText: string, member: TeamMemberDoc): Candidate | null {
  const normalizedAsset = normalize(assetText);
  const assetTokens = new Set(normalizedAsset.split(" ").filter(Boolean));
  const first = normalize(member.firstName || "");
  const middle = normalize(member.middleName || "");
  const last = normalize(member.lastName || "");
  const aliases = memberAliases(member);
  const exactAlias = aliases.find((alias) => containsPhrase(normalizedAsset, alias));
  if (exactAlias) {
    return {
      member,
      score: exactAlias.split(" ").length >= 3 ? 98 : 94,
      matchedName: exactAlias,
      reason: `The asset title contains the full name "${exactAlias}".`,
    };
  }

  const nameTokens = [first, middle, last].flatMap((part) => part.split(" ")).filter(Boolean);
  const uniqueNameTokens = [...new Set(nameTokens)];
  const overlap = uniqueNameTokens.filter((token) => assetTokens.has(token));
  if (first && last && overlap.includes(first) && overlap.includes(last)) {
    return {
      member,
      score: overlap.length >= 3 ? 86 : 78,
      matchedName: `${first} ${last}`,
      reason: "The asset title contains the Team Member's first and last name.",
    };
  }

  if (first && last && assetTokens.has(last) && assetTokens.has(first[0] || "")) {
    return {
      member,
      score: 52,
      matchedName: `${first[0]} ${last}`,
      reason: "The asset title contains the Team Member's last name and first initial.",
    };
  }

  return overlap.length >= 2
    ? {
        member,
        score: 45 + overlap.length * 5,
        matchedName: overlap.join(" "),
        reason: "The asset title contains multiple Team Member name tokens.",
      }
    : null;
}

function deterministicCandidates(asset: UserAssetDoc, members: TeamMemberDoc[]) {
  const assetText = [asset.assetName, asset.sourceLabel].filter(Boolean).join(" ");
  return members
    .map((member) => scoreMember(assetText, member))
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    if (!adminDb) return NextResponse.json({ error: "Firebase Admin is not configured" }, { status: 503 });
    const { id } = await context.params;
    const [assetSnap, membersSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.USER_ASSETS).doc(id).get(),
      adminDb.collection(COLLECTIONS.TEAM_MEMBERS).get(),
    ]);
    if (!assetSnap.exists) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const asset = { id: assetSnap.id, ...assetSnap.data() } as UserAssetDoc;
    const members = membersSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as TeamMemberDoc)
      .filter((member) => member.status !== "inactive");
    const candidates = deterministicCandidates(asset, members);
    if (candidates.length === 0) {
      return NextResponse.json({ provider: "deterministic", suggestion: null, candidates: [] });
    }

    try {
      const promptCandidates = candidates.slice(0, 6).map((candidate) => ({
        id: candidate.member.id,
        name: `${candidate.member.firstName} ${candidate.member.middleName || ""} ${candidate.member.lastName}`.replace(/\s+/g, " ").trim(),
        title: candidate.member.title || candidate.member.jobTitleRaw || "",
        workforceDepartment: candidate.member.workforceDepartmentName || "",
        email: candidate.member.emailPrimary,
        deterministicScore: candidate.score,
        matchedName: candidate.matchedName,
      }));
      const { data, model } = await requestHermesStructured({
        systemPrompt: "You identify the most likely Adams Electric Team Member named in an asset title. Do not infer ownership from serial numbers, model names, departments, phone numbers, or emails unless they contain a person's name. Return null when no name is credible.",
        messages: [{
          role: "user",
          content: `Asset title: ${asset.assetName}\nSource label: ${asset.sourceLabel || ""}\nCandidates:\n${JSON.stringify(promptCandidates, null, 2)}\nChoose the best candidateId and provide a concise rationale.`,
        }],
        schema: aiSelectionSchema,
        temperature: 0,
      });
      const selected = candidates.find((candidate) => candidate.member.id === data.candidateId);
      if (selected) {
        return NextResponse.json({
          provider: model,
          suggestion: {
            memberId: selected.member.id,
            memberName: `${selected.member.firstName} ${selected.member.lastName}`.trim(),
            email: selected.member.emailPrimary,
            confidence: data.confidence,
            rationale: data.rationale || selected.reason,
          },
          candidates: candidates.map((candidate) => ({
            memberId: candidate.member.id,
            memberName: `${candidate.member.firstName} ${candidate.member.lastName}`.trim(),
            email: candidate.member.emailPrimary,
            confidence: Math.min(0.98, candidate.score / 100),
            rationale: candidate.reason,
          })),
        });
      }
    } catch {
      // Fall through to deterministic matching when Hermes is unavailable.
    }

    const best = candidates[0];
    return NextResponse.json({
      provider: "deterministic",
      suggestion: {
        memberId: best.member.id,
        memberName: `${best.member.firstName} ${best.member.lastName}`.trim(),
        email: best.member.emailPrimary,
        confidence: Math.min(0.98, best.score / 100),
        rationale: best.reason,
      },
      candidates: candidates.map((candidate) => ({
        memberId: candidate.member.id,
        memberName: `${candidate.member.firstName} ${candidate.member.lastName}`.trim(),
        email: candidate.member.emailPrimary,
        confidence: Math.min(0.98, candidate.score / 100),
        rationale: candidate.reason,
      })),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Asset assignment suggestion error:", error);
    return NextResponse.json({ error: "Failed to analyze asset assignment" }, { status: 500 });
  }
}
