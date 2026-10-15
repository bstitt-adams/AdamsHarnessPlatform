import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendNotificationEmail, sendMeetingInvitation, EMAIL_ACCOUNTS } from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      accountId, 
      to, 
      cc, 
      bcc, 
      subject, 
      text, 
      html, 
      replyTo,
      type,
      // For notification emails
      buttonText,
      buttonUrl,
      footerText,
      // For meeting invitations
      meetingDetails,
    } = body;

    // Validate required fields
    if (!accountId || !["adams", "gmail"].includes(accountId)) {
      return NextResponse.json(
        { error: "Invalid account ID. Must be 'adams' or 'gmail'" },
        { status: 400 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: "Recipient (to) is required" },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    let result;

    if (type === "notification") {
      // Send templated notification email
      result = await sendNotificationEmail(
        accountId,
        to,
        subject,
        html || text || "",
        { buttonText, buttonUrl, footerText }
      );
    } else if (type === "meeting" && meetingDetails) {
      // Send meeting invitation
      result = await sendMeetingInvitation(accountId, to, {
        title: meetingDetails.title,
        description: meetingDetails.description,
        startTime: new Date(meetingDetails.startTime),
        endTime: new Date(meetingDetails.endTime),
        location: meetingDetails.location,
        meetingUrl: meetingDetails.meetingUrl,
      });
    } else {
      // Send regular email
      result = await sendEmail(accountId, {
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        replyTo,
      });
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        from: EMAIL_ACCOUNTS[accountId].email,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in email send API:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return available email accounts (without sensitive data)
  return NextResponse.json({
    accounts: Object.entries(EMAIL_ACCOUNTS).map(([id, account]) => ({
      id,
      name: account.name,
      email: account.email,
    })),
  });
}
