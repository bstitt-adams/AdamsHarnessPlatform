import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import { httpErrorResponse } from "@/lib/adams-harness/server-store";
import { getAuthorizedModule } from "@/lib/modules/runtime";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);
    return Response.json({
      module: definition,
      capabilities: { canViewRecords: true, canSubmitRecords: true },
    });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Get module error:", error);
    return Response.json({ error: "Failed to load module." }, { status: 500 });
  }
}
