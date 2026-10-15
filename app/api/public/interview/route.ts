import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  type DepartmentDoc,
  type ProcessInterviewDoc,
} from "@/lib/adams-harness/types";
import {
  emptyCoverage,
  emptyInterviewFacts,
  runInterviewTurn,
} from "@/lib/adams-harness/interview";
import { isRateLimited } from "@/lib/adams-harness/rate-limit";
import {
  getDb,
  httpErrorResponse,
  HttpError,
  serializeDoc,
  writeAuditLog,
} from "@/lib/adams-harness/server-store";
import { HermesError } from "@/lib/hermes/client";
import { COLLECTIONS } from "@/lib/schema";

const startSchema = z.strictObject({
  departmentId: z.string().trim().min(1).max(200),
});

async function listPublicDepartments() {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.DEPARTMENTS).get();
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }) as DepartmentDoc)
    .filter((d) => d.isActive)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

/**
 * GET — public list of active departments for the interview picker.
 * Returns only id/name/code; no member data.
 */
export async function GET(request: NextRequest) {
  try {
    if (isRateLimited(`pub-interview:${clientKey(request)}`, 30, 60_000)) {
      throw new HttpError(429, "Too many requests. Please try again shortly.");
    }
    const departments = await listPublicDepartments();
    return NextResponse.json({
      departments: departments.map((d, i) => ({
        index: i + 1,
        id: d.id,
        name: d.name,
        code: d.code,
      })),
    });
  } catch (error) {
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Public departments GET error:", error);
    return NextResponse.json({ error: "Failed to load departments" }, { status: 500 });
  }
}

/**
 * POST — start a public requirements interview. No authentication required;
 * the interview is marked source:"public" so only public-session endpoints
 * (and admins in the portal) can touch it.
 */
export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`pub-interview:${clientKey(request)}`, 10, 60_000)) {
      throw new HttpError(429, "Too many requests. Please try again shortly.");
    }
    const parsed = startSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid department selection" }, { status: 400 });
    }

    const departments = await listPublicDepartments();
    const department = departments.find((d) => d.id === parsed.data.departmentId);
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }

    const db = getDb();
    const ref = db.collection(COLLECTIONS.PROCESS_INTERVIEWS).doc();
    const now = new Date();
    const interview: ProcessInterviewDoc = {
      id: ref.id,
      departmentId: department.id,
      title: `Public requirements interview — ${department.name}`,
      task: "",
      status: "interviewing",
      createdByUid: "public-anonymous",
      createdByName: "Public visitor",
      source: "public",
      publicSessionToken: randomBytes(32).toString("hex"),
      messages: [],
      facts: emptyInterviewFacts(),
      coverage: emptyCoverage(true),
      unresolvedQuestions: [],
      readyForSpecification: false,
      createdAt: now as unknown as ProcessInterviewDoc["createdAt"],
      updatedAt: now as unknown as ProcessInterviewDoc["updatedAt"],
    };

    try {
      const turn = await runInterviewTurn(interview);
      interview.messages = [turn.assistantMessage];
      interview.facts = turn.facts;
      interview.coverage = turn.coverage;
      interview.unresolvedQuestions = turn.unresolvedQuestions;
      interview.readyForSpecification = turn.readyForSpecification;
      interview.model = turn.model;
    } catch (error) {
      if (error instanceof HermesError && error.kind === "not_configured") {
        interview.status = "draft";
      } else {
        throw error;
      }
    }

    await ref.set(interview);

    await writeAuditLog({
      entityType: "interview",
      entityId: ref.id,
      action: "create_public",
      actorUid: "public-anonymous",
      actorName: "Public visitor",
      actorRole: "public",
      detail: { departmentId: department.id, departmentName: department.name },
    });

    const { publicSessionToken: _sessionToken, ...safeInterview } = interview;
    void _sessionToken;
    const response = NextResponse.json(
      {
        interviewId: ref.id,
        department: { name: department.name, code: department.code },
        interview: serializeDoc(safeInterview),
      },
      { status: 201 },
    );
    response.cookies.set(`adams-interview-${ref.id}`, interview.publicSessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: `/api/public/interview/${ref.id}`,
    });
    return response;
  } catch (error) {
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    if (error instanceof HermesError) {
      return NextResponse.json(
        { error: "Interview assistant is unavailable" },
        { status: 502 },
      );
    }
    console.error("Public interview POST error:", error);
    return NextResponse.json({ error: "Failed to start interview" }, { status: 500 });
  }
}
