import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth/server-auth";
import { COLLECTIONS, type PlatformDevTaskDoc } from "@/lib/schema";
import OpenAI from "openai";

const RECIPIENT_EMAIL = "JeffreyAllen@Adams-Electric.com";

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!adminDb) {
      return NextResponse.json({ error: "Database service unavailable" }, { status: 503 });
    }

    const body = await request.json();
    const periodStart = body.periodStart ? new Date(body.periodStart) : new Date();
    const periodEnd = body.periodEnd ? new Date(body.periodEnd) : new Date();

    const tasksSnap = await adminDb
      .collection(COLLECTIONS.PLATFORM_DEV_TASKS)
      .where("taskDate", ">=", startOfDay(periodStart))
      .where("taskDate", "<=", endOfDay(periodEnd))
      .orderBy("taskDate", "desc")
      .get();

    const tasks: PlatformDevTaskDoc[] = tasksSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }) as PlatformDevTaskDoc);

    if (tasks.length === 0) {
      return NextResponse.json({ error: "No tasks found in the selected period" }, { status: 400 });
    }

    const totalHours = tasks.reduce((sum, t) => sum + (t.hoursSpent || 0), 0);
    const categories = [...new Set(tasks.map((t) => t.category))];
    const systems = [...new Set(tasks.flatMap((t) => t.systemsAffected || []))];
    const capabilities = tasks.map((t) => t.aiCapability).filter(Boolean);

    const tasksText = tasks
      .map(
        (t) =>
          `- ${t.title} (${t.status}, ${t.hoursSpent}h, ${t.category}): ${t.description || ""} Systems: ${(t.systemsAffected || []).join(", ")}. AI capability: ${t.aiCapability || "None"}.`,
      )
      .join("\n");

    let summaryText = "";
    let newCapabilitiesText = "";

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      const openai = new OpenAI({ apiKey: openaiApiKey });
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a concise technical writer summarizing platform development work for a business stakeholder.",
          },
          {
            role: "user",
            content: `Write a 2-paragraph executive summary of these Adams Platform development tasks for Jeff Allen at Adams Electric. Highlight business value and systems connected. Tasks:\n${tasksText}`,
          },
        ],
        temperature: 0.5,
      });
      summaryText = completion.choices[0]?.message?.content || "";

      const capabilitiesCompletion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a concise technical writer listing new AI capabilities introduced by platform development work.",
          },
          {
            role: "user",
            content: `List the new AI capabilities and system connections introduced by these tasks as bullet points. If a task has no AI capability, focus on the system/process improvement. Tasks:\n${tasksText}`,
          },
        ],
        temperature: 0.5,
      });
      newCapabilitiesText = capabilitiesCompletion.choices[0]?.message?.content || "";
    } else {
      summaryText = `Development work this week focused on ${categories.join(", ")} across ${systems.join(", ")} with a total of ${totalHours.toFixed(1)} hours logged.`;
      newCapabilitiesText = capabilities.length
        ? capabilities.map((c) => `- ${c}`).join("\n")
        : "No explicit AI capabilities recorded for this period.";
    }

    const reportDate = new Date();
    const fileName = `adams-platform-weekly-report-${reportDate.toISOString().split("T")[0]}.pdf`;

    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text("Adams Platform Weekly Development Report", 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Week ending: ${periodEnd.toLocaleDateString("en-US")}`, 14, y);
    y += 6;
    doc.text(`Total hours: ${totalHours.toFixed(1)}`, 14, y);
    y += 6;
    doc.text(`Tasks completed: ${tasks.length}`, 14, y);
    y += 10;

    doc.setFontSize(14);
    doc.text("Executive Summary", 14, y);
    y += 8;
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(summaryText, 180);
    doc.text(summaryLines, 14, y);
    y += summaryLines.length * 5 + 8;

    doc.setFontSize(14);
    doc.text("New Capabilities", 14, y);
    y += 8;
    doc.setFontSize(10);
    const capabilityLines = doc.splitTextToSize(newCapabilitiesText, 180);
    doc.text(capabilityLines, 14, y);
    y += capabilityLines.length * 5 + 10;

    doc.setFontSize(14);
    doc.text("Tasks", 14, y);
    y += 8;
    doc.setFontSize(9);
    for (const task of tasks) {
      const line = `- ${task.title} (${task.category}, ${task.hoursSpent}h, ${task.status})`;
      const lines = doc.splitTextToSize(line, 180);
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(lines, 14, y);
      y += lines.length * 4 + 2;
    }

    const pdfBase64 = doc.output("datauristring").split(",")[1];

    const reportRef = adminDb.collection(COLLECTIONS.PLATFORM_DEV_REPORTS).doc();
    await reportRef.set({
      reportDate,
      periodStart,
      periodEnd,
      tasks: tasks.map((t) => t.id),
      summaryText,
      newCapabilitiesText,
      recipientEmail: RECIPIENT_EMAIL,
      pdfBase64,
      pdfFileName: fileName,
      generatedByUid: actor.uid,
      generatedByName: actor.email,
      createdAt: reportDate,
      updatedAt: reportDate,
    });

    return NextResponse.json({
      success: true,
      reportId: reportRef.id,
      fileName,
      recipientEmail: RECIPIENT_EMAIL,
      taskCount: tasks.length,
      totalHours,
    });
  } catch (error) {
    const authError = authErrorResponse(error);
    if (authError) return authError;
    console.error("Generate platform dev report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}
