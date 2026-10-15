/**
 * SMTP Email Service
 * 
 * Provides email sending capabilities via SMTP for:
 * - info@adams-electric.com
 * - info@adams-electric.com
 * 
 * Uses nodemailer for SMTP transport
 */

import nodemailer from "nodemailer";

// Email account configuration
export interface EmailAccount {
  id: string;
  name: string;
  email: string;
  smtpHost: string;
  smtpPort: number;
  secure: boolean;
  user: string;
  password: string;
}

// Email message interface
export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
  encoding?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Pre-configured email accounts
export const EMAIL_ACCOUNTS: Record<string, Omit<EmailAccount, "password">> = {
  adams: {
    id: "adams",
    name: "Adams Electric",
    email: "info@adams-electric.com",
    smtpHost: process.env.ADAMS_SMTP_HOST || "smtp.office365.com",
    smtpPort: parseInt(process.env.ADAMS_SMTP_PORT || "587"),
    secure: process.env.ADAMS_SMTP_SECURE === "true",
    user: process.env.ADAMS_SMTP_USER || "info@adams-electric.com",
  },
  gmail: {
    id: "gmail",
    name: "Adams Electric Gmail",
    email: "info@adams-electric.com",
    smtpHost: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com",
    smtpPort: parseInt(process.env.GMAIL_SMTP_PORT || "587"),
    secure: process.env.GMAIL_SMTP_SECURE === "true",
    user: process.env.GMAIL_SMTP_USER || "info@adams-electric.com",
  },
};

/**
 * Create a nodemailer transporter for a specific account
 */
function createTransporter(accountId: "adams" | "gmail"): nodemailer.Transporter {
  const account = EMAIL_ACCOUNTS[accountId];
  const password = accountId === "adams" 
    ? process.env.ADAMS_SMTP_PASSWORD 
    : process.env.GMAIL_SMTP_PASSWORD;

  if (!password) {
    throw new Error(`SMTP password not configured for ${accountId}`);
  }

  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.secure,
    auth: {
      user: account.user,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send an email using a specific account
 */
export async function sendEmail(
  accountId: "adams" | "gmail",
  message: EmailMessage
): Promise<SendEmailResult> {
  try {
    const account = EMAIL_ACCOUNTS[accountId];
    const transporter = createTransporter(accountId);

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${account.name}" <${account.email}>`,
      to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
    };

    if (message.cc) {
      mailOptions.cc = Array.isArray(message.cc) ? message.cc.join(", ") : message.cc;
    }

    if (message.bcc) {
      mailOptions.bcc = Array.isArray(message.bcc) ? message.bcc.join(", ") : message.bcc;
    }

    if (message.attachments && message.attachments.length > 0) {
      mailOptions.attachments = message.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
        encoding: att.encoding,
      }));
    }

    const result = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(`Error sending email via ${accountId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email from Adams Electric account
 */
export async function sendFromAdams(message: EmailMessage): Promise<SendEmailResult> {
  return sendEmail("adams", message);
}

/**
 * Send email from Gmail account
 */
export async function sendFromGmail(message: EmailMessage): Promise<SendEmailResult> {
  return sendEmail("gmail", message);
}

/**
 * Verify SMTP connection for an account
 */
export async function verifyConnection(accountId: "adams" | "gmail"): Promise<boolean> {
  try {
    const transporter = createTransporter(accountId);
    await transporter.verify();
    return true;
  } catch (error) {
    console.error(`SMTP verification failed for ${accountId}:`, error);
    return false;
  }
}

/**
 * Send a templated notification email
 */
export async function sendNotificationEmail(
  accountId: "adams" | "gmail",
  to: string | string[],
  subject: string,
  content: string,
  options?: {
    buttonText?: string;
    buttonUrl?: string;
    footerText?: string;
  }
): Promise<SendEmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; background-color: #0072BC; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Adams Electric</h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 20px;">${subject}</h2>
                  <div style="color: #475569; font-size: 16px; line-height: 1.6;">
                    ${content}
                  </div>
                  ${options?.buttonText && options?.buttonUrl ? `
                  <div style="margin-top: 30px;">
                    <a href="${options.buttonUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0072BC; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      ${options.buttonText}
                    </a>
                  </div>
                  ` : ""}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f8fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                    ${options?.footerText || "This email was sent from Adams Electric. Please do not reply directly to this email."}
                  </p>
                  <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">
                    © ${new Date().getFullYear()} Adams Electric. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail(accountId, {
    to,
    subject,
    html,
    text: content.replace(/<[^>]*>/g, ""), // Strip HTML for plain text version
  });
}

/**
 * Send a meeting invitation email
 */
export async function sendMeetingInvitation(
  accountId: "adams" | "gmail",
  to: string | string[],
  meetingDetails: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    meetingUrl?: string;
  }
): Promise<SendEmailResult> {
  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const content = `
    <p>You have been invited to a meeting:</p>
    <table style="margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 16px 8px 0; color: #64748b; font-weight: bold;">Title:</td>
        <td style="padding: 8px 0;">${meetingDetails.title}</td>
      </tr>
      <tr>
        <td style="padding: 8px 16px 8px 0; color: #64748b; font-weight: bold;">When:</td>
        <td style="padding: 8px 0;">${formatDate(meetingDetails.startTime)} - ${formatDate(meetingDetails.endTime)}</td>
      </tr>
      ${meetingDetails.location ? `
      <tr>
        <td style="padding: 8px 16px 8px 0; color: #64748b; font-weight: bold;">Location:</td>
        <td style="padding: 8px 0;">${meetingDetails.location}</td>
      </tr>
      ` : ""}
      ${meetingDetails.meetingUrl ? `
      <tr>
        <td style="padding: 8px 16px 8px 0; color: #64748b; font-weight: bold;">Join Online:</td>
        <td style="padding: 8px 0;"><a href="${meetingDetails.meetingUrl}" style="color: #0072BC;">${meetingDetails.meetingUrl}</a></td>
      </tr>
      ` : ""}
    </table>
    <p><strong>Description:</strong></p>
    <p>${meetingDetails.description}</p>
  `;

  return sendNotificationEmail(accountId, to, `Meeting Invitation: ${meetingDetails.title}`, content, {
    buttonText: meetingDetails.meetingUrl ? "Join Meeting" : undefined,
    buttonUrl: meetingDetails.meetingUrl,
  });
}
