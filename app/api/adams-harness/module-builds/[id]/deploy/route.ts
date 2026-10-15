import { NextRequest } from "next/server";
import {
  authErrorResponse,
  requireAdmin,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  buildErrorResponse,
  deployModuleBuild,
  serializeModuleBuild,
} from "@/lib/adams-harness/module-builds";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireAdmin(request);
    const { id } = await params;
    const build = await deployModuleBuild(id, {
      uid: actor.uid,
      name: actor.email,
      role: actor.role,
    });
    return Response.json({ build: serializeModuleBuild(build) });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const response = buildErrorResponse(error);
    if (response) return response;
    console.error("Deploy module build error:", error);
    return Response.json({ error: "Deploy failed." }, { status: 500 });
  }
}
