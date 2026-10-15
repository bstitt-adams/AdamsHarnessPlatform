/**
 * Verify Microsoft OAuth connection for a user
 * POST /api/mail/verify
 * Body: { userId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserGraphClient, updateTokenStatus } from "@/lib/mail/get-user-graph-client";
import { z } from "zod";

const verifySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = verifySchema.parse(body);

    const { client, tokenDoc } = await getUserGraphClient(userId);

    // Test a harmless Graph API call
    const profile = await client.getMe();
    if (!profile.success) {
      await updateTokenStatus(userId, "error", profile.error || "Profile fetch failed");
      return NextResponse.json(
        { success: false, error: profile.error || "Profile fetch failed" },
        { status: 400 }
      );
    }

    await updateTokenStatus(userId, "connected");

    return NextResponse.json({
      success: true,
      message: "Microsoft OAuth connection is valid",
      data: {
        userId,
        email: tokenDoc.email,
        displayName: tokenDoc.displayName,
        profile: profile.data,
        scopes: tokenDoc.scopes,
      },
    });
  } catch (error) {
    console.error("Error verifying Microsoft OAuth:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
