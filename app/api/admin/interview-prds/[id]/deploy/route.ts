import { NextRequest, NextResponse } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth/server-auth";
import { deployInterviewPrd } from "@/lib/adams-harness/interview-prds";
import {
  httpErrorResponse,
  serializeDoc,
} from "@/lib/adams-harness/server-store";
import { serializeModuleBuild } from "@/lib/adams-harness/module-builds";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const result = await deployInterviewPrd({ prdId: id, actor });
    return NextResponse.json({
      prd: serializeDoc(result.prd),
      specification: serializeDoc(result.specification),
      build: serializeModuleBuild(result.build),
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Admin interview PRD deploy error:", error);
    return NextResponse.json({ error: "Failed to deploy PRD" }, { status: 500 });
  }
}
