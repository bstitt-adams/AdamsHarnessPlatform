import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import { getDb, httpErrorResponse } from "@/lib/adams-harness/server-store";
import { COLLECTIONS, type TeamMemberDoc } from "@/lib/schema";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const db = getDb();
    const snapshot = await db.collection(COLLECTIONS.TEAM_MEMBERS).get();
    const teamMembers = snapshot.docs
      .map((d) => {
        const data = d.data() as Partial<TeamMemberDoc>;
        return {
          id: d.id,
          firebaseUid: data.firebaseUid,
          authUid: data.authUid,
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          emailPrimary: data.emailPrimary ?? "",
          status: data.status ?? "pending",
        };
      })
      .sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      );
    return NextResponse.json({ teamMembers });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    const httpError = httpErrorResponse(error);
    if (httpError) return httpError;
    console.error("Team members GET error:", error);
    return NextResponse.json({ error: "Failed to load team members" }, { status: 500 });
  }
}
