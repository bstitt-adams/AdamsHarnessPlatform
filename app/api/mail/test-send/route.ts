/**
 * Send a test email from a user's mailbox
 * POST /api/mail/test-send
 * Body: { userId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserGraphClient, updateTokenStatus } from "@/lib/mail/get-user-graph-client";
import { z } from "zod";

const testSendSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = testSendSchema.parse(body);

    const { client, tokenDoc } = await getUserGraphClient(userId);

    if (!tokenDoc.email) {
      return NextResponse.json(
        { success: false, error: "User email not available" },
        { status: 400 }
      );
    }

    const result = await client.sendEmail({
      subject: "Adams Electric Mail Integration Test",
      body: {
        contentType: "html",
        content: `<p>Hi ${tokenDoc.displayName || ""},</p><p>This is a test email from the Adams Electric Mail admin. Your Microsoft OAuth connection is working.</p>`,
      },
      toRecipients: [{ emailAddress: { address: tokenDoc.email } }],
    });

    if (!result.success) {
      await updateTokenStatus(userId, "error", result.error || "Test send failed");
      return NextResponse.json(
        { success: false, error: result.error || "Test send failed" },
        { status: 400 }
      );
    }

    await updateTokenStatus(userId, "connected");

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${tokenDoc.email}`,
      data: { userId, email: tokenDoc.email },
    });
  } catch (error) {
    console.error("Error sending test email:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
