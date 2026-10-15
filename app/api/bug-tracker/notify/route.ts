import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const INTERNAL_NOTIFY_EMAIL = "info@adams-electric.com";
const CC_EMAIL = "brianstittsr@gmail.com";
const FROM_EMAIL = process.env.GMAIL_SMTP_USER || "bookings@adams-electric.com";

interface BugTrackerNotificationRequest {
  id: string;
  title: string;
  description: string;
  type: "bug" | "idea" | "improvement";
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  page?: string;
  reporterName: string;
  reporterId: string;
  assigneeName?: string;
  assigneeId?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  comments?: Array<{
    id: string;
    author: string;
    authorId: string;
    content: string;
    createdAt: string;
  }>;
  previousStatus?: string;
  resolvedByName?: string;
  resolvedByEmail?: string;
  resolvedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: BugTrackerNotificationRequest = await request.json();

    const {
      id,
      title,
      description,
      type,
      status,
      priority,
      page,
      reporterName,
      reporterId,
      assigneeName,
      assigneeId,
      tags,
      createdAt,
      updatedAt,
      comments,
      previousStatus,
      resolvedByName,
      resolvedByEmail,
      resolvedAt,
    } = body;

    const gmailUser = process.env.GMAIL_SMTP_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.error("Gmail SMTP credentials not configured — bug tracker notification not sent");
      return NextResponse.json(
        { error: "Email credentials not configured", success: false },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.GMAIL_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
    const statusLabel = status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const previousStatusLabel = previousStatus
      ? previousStatus
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      : "N/A";

    const tagsHtml = tags && tags.length > 0
      ? tags.map((tag) => `<span style=\"display:inline-block;background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:9999px;font-size:12px;margin-right:4px;\">${tag}</span>`).join("")
      : "<span style=\"color:#94a3b8;\">None</span>";

    const commentsHtml = comments && comments.length > 0
      ? comments
          .map(
            (comment) => `
              <div style="margin-bottom:12px;padding:12px;background:#f8fafc;border-radius:6px;">
                <p style="margin:0 0 4px 0;font-size:12px;color:#64748b;">
                  <strong>${comment.author}</strong> &bull; ${new Date(comment.createdAt).toLocaleString()}
                </p>
                <p style="margin:0;font-size:14px;color:#334155;">${comment.content.replace(/\n/g, "<br/>")}</p>
              </div>
            `
          )
          .join("")
      : "<p style=\"color:#94a3b8;\">No comments</p>";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #334155;">
        <div style="background: #0f172a; color: #ffffff; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Bug Tracker Item Completed</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">
            Status changed from <strong>${previousStatusLabel}</strong> to <strong>${statusLabel}</strong>
          </p>
        </div>

        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 16px; color: #166534;">
              <strong>${typeLabel} resolved:</strong> ${title}
            </p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; width: 140px; color: #64748b; font-size: 14px;">ID</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Title</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600;">${title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Type</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${typeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Status</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">
                <span style="display: inline-block; background: #22c55e; color: #ffffff; padding: 2px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">${statusLabel}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Priority</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; font-weight: 600;">${priorityLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Page</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${page || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Reporter</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${reporterName} (${reporterId})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Assignee</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${assigneeName || "Unassigned"}${assigneeId ? ` (${assigneeId})` : ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Tags</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${tagsHtml}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Created</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${new Date(createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Resolved</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${resolvedAt ? new Date(resolvedAt).toLocaleString() : "Just now"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">Resolved By</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;">${resolvedByName || "N/A"}${resolvedByEmail ? ` &lt;${resolvedByEmail}&gt;` : ""}</td>
            </tr>
          </table>

          <h2 style="font-size: 16px; margin-bottom: 8px; color: #0f172a;">Description</h2>
          <div style="background: #f8fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; line-height: 1.6;">
            ${description.replace(/\n/g, "<br/>")}
          </div>

          <h2 style="font-size: 16px; margin-bottom: 8px; color: #0f172a;">Comments</h2>
          <div style="margin-bottom: 24px;">
            ${commentsHtml}
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #64748b;">
            <p style="margin: 0;">
              This notification was sent automatically when the bug tracker item status was changed to resolved.
            </p>
          </div>
        </div>
      </div>
    `;

    const subject = `Bug Tracker: ${typeLabel} Resolved - ${title}`;

    await transporter.sendMail({
      from: `"Adams Electric" <${gmailUser}>`,
      to: INTERNAL_NOTIFY_EMAIL,
      cc: CC_EMAIL,
      subject,
      html: emailHtml,
    });

    console.log("Bug tracker completion email sent for item:", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending bug tracker notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send notification", message: errorMessage, success: false },
      { status: 500 }
    );
  }
}
