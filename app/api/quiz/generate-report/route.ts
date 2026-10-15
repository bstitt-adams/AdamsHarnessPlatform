import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, Timestamp, query, where, getDocs, limit } from "firebase/firestore";
import { COLLECTIONS, QuizReportTemplateDoc } from "@/lib/schema";
import nodemailer from "nodemailer";

// Default report template if none configured
const defaultTemplate: Omit<QuizReportTemplateDoc, 'id' | 'createdAt' | 'updatedAt'> = {
  name: "Default Template",
  isActive: true,
  executiveSummary: {
    enabled: true,
    title: "Executive Summary",
    showOverallScore: true,
    showKeyStrengths: true,
    showDevelopmentAreas: true,
    customIntroText: "Thank you for completing the Adams IQ Assessment. This comprehensive report analyzes your project's readiness across planning, coordination, and execution.",
  },
  detailedSections: [
    {
      id: "preconstruction",
      title: "Preconstruction Planning",
      enabled: true,
      order: 1,
      category: "preconstruction",
      description: "Evaluates how thoroughly projects are planned before mobilization.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "Needs Attention", description: "Projects start without a documented plan, leaving budget, schedule, and scope open to interpretation." },
        medium: { min: 40, max: 69, label: "Developing", description: "Some planning exists, but it isn't consistent or thorough enough to prevent surprises." },
        high: { min: 70, max: 100, label: "Strong", description: "Your projects begin with solid preconstruction planning—a strong foundation." },
      },
    },
    {
      id: "risk",
      title: "Risk Visibility",
      enabled: true,
      order: 2,
      category: "risk",
      description: "Assesses how early project risks are identified and shared.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "Reactive", description: "Project risks surface in the field rather than in planning, where they're far more expensive to fix." },
        medium: { min: 40, max: 69, label: "Partial", description: "You identify some risks early, but the picture isn't complete or shared across the team." },
        high: { min: 70, max: 100, label: "Proactive", description: "Risks are identified and addressed before mobilization." },
      },
    },
    {
      id: "fieldLeadership",
      title: "Field Leadership",
      enabled: true,
      order: 3,
      category: "fieldLeadership",
      description: "Evaluates whether field leaders have the authority and support to keep work moving.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "Bottlenecked", description: "Field decisions bottleneck on a few people, slowing work and burning out your strongest leaders." },
        medium: { min: 40, max: 69, label: "Growing", description: "Field leaders handle some decisions, but escalation is still the default." },
        high: { min: 70, max: 100, label: "Empowered", description: "Your field leaders operate with clear authority and keep work moving." },
      },
    },
    {
      id: "coordination",
      title: "Coordination & BIM",
      enabled: true,
      order: 4,
      category: "coordination",
      description: "Assessment of model coordination and conflict resolution before installation.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "Informal", description: "Conflicts are discovered during installation instead of in coordination—rework is likely routine." },
        medium: { min: 40, max: 69, label: "Partial", description: "Some coordination happens, but coverage is inconsistent across systems or projects." },
        high: { min: 70, max: 100, label: "Coordinated", description: "Coordination resolves conflicts before field work begins." },
      },
    },
    {
      id: "closeout",
      title: "Procurement & Closeout",
      enabled: true,
      order: 5,
      category: "closeout",
      description: "Analysis of long-lead tracking and closeout documentation readiness.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "Unprepared", description: "Procurement and closeout are reactive, leaving schedule risk at both ends." },
        medium: { min: 40, max: 69, label: "In Progress", description: "Some tracking exists but gaps remain in logs and documentation." },
        high: { min: 70, max: 100, label: "Prepared", description: "Long-lead items are tracked from day one and closeout is planned at kickoff." },
      },
    },
    {
      id: "rework",
      title: "Rework Prevention",
      enabled: true,
      order: 6,
      category: "rework",
      description: "Evaluation of practices that prevent rework through coordination and daily planning.",
      scoringCriteria: {
        low: { min: 0, max: 39, label: "At Risk", description: "Conflicts are found in the field and rework is routine." },
        medium: { min: 40, max: 69, label: "Building", description: "Coordination practices exist but are inconsistent across crews." },
        high: { min: 70, max: 100, label: "Secured", description: "Issues are resolved in the model and pre-task plans prevent field surprises." },
      },
    },
  ],
  recommendations: {
    enabled: true,
    title: "Recommendations & Action Plan",
    showPrioritizedInitiatives: true,
    showImplementationGuidance: true,
    showExpectedOutcomes: true,
    byScoreLevel: {
      critical: [
        "Document project scope and assumptions before any further mobilization",
        "Stand up a daily pre-task planning routine for every active crew",
        "Create a procurement log and identify long-lead items immediately",
        "Schedule a preconstruction review to assess your biggest schedule risks",
      ],
      vulnerable: [
        "Standardize your kickoff checklist so planning doesn't depend on memory",
        "Start weekly look-ahead planning with field leaders",
        "Bring BIM coordination into the project before major rough-in begins",
        "Assign a closeout documentation owner at kickoff",
      ],
      developing: [
        "Extend coordination coverage to all systems and areas",
        "Evaluate prefabrication candidates on your next project",
        "Build a mentoring routine so field decisions distribute across the crew",
        "Tighten continuous punch management to keep turnover clean",
      ],
      projectready: [
        "Standardize these practices across every project team",
        "Use lessons learned from closeout to sharpen preconstruction",
        "Expand prefabrication where repetition and access justify it",
        "Keep investing in field leadership development—it's your multiplier",
      ],
    },
  },
  callToAction: {
    enabled: true,
    title: "Ready to Strengthen Your Next Project?",
    description: "Schedule a free 30-minute conversation to discuss your results and create a practical action plan for your project.",
    buttonText: "Schedule Your Free Call",
    buttonUrl: "https://adams-electric.com/schedule-a-call",
  },
  branding: {
    logoUrl: "/images/adamselectric_logo.png",
    primaryColor: "#0072BC",
    secondaryColor: "#1E293B",
    companyName: "Adams Electric",
    contactEmail: "info@adams-electric.com",
    contactPhone: "(513) 335-1978",
    website: "https://adams-electric.com",
  },
  emailSettings: {
    subject: "Your Adams IQ Assessment Results",
    fromName: "Adams Electric",
    replyTo: "info@adams-electric.com",
    introText: "Thank you for completing the Adams IQ Assessment! Attached is your personalized report with insights and recommendations for strengthening project delivery.",
    signatureText: "Best regards,\nThe Adams Electric Team",
  },
};

// Generate HTML for PDF report
function generateReportHTML(
  submission: any,
  template: Omit<QuizReportTemplateDoc, 'id' | 'createdAt' | 'updatedAt'>
): string {
  const { branding, executiveSummary, detailedSections, recommendations, callToAction } = template;
  
  // Determine score level key
  const scoreLevelKey = submission.scoreLevel.toLowerCase().replace(/[- ]/g, '') as 'critical' | 'vulnerable' | 'developing' | 'projectready';
  const normalizedKey = scoreLevelKey === 'projectready' ? 'projectready' : scoreLevelKey;
  
  // Get category scores map
  const categoryScoresMap: Record<string, number> = {};
  (submission.categoryScores || []).forEach((cat: any) => {
    categoryScoresMap[cat.category] = cat.percentage;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Adams IQ Assessment Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { 
      text-align: center; 
      padding: 30px 0; 
      border-bottom: 3px solid ${branding.primaryColor};
      margin-bottom: 30px;
    }
    .logo { max-height: 60px; margin-bottom: 20px; }
    .report-title { 
      font-size: 28px; 
      color: ${branding.secondaryColor}; 
      margin-bottom: 10px;
    }
    .report-subtitle { color: #666; font-size: 14px; }
    .recipient-info {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .recipient-info h3 { color: ${branding.secondaryColor}; margin-bottom: 10px; }
    .section { margin-bottom: 40px; }
    .section-title { 
      font-size: 22px; 
      color: ${branding.primaryColor}; 
      border-bottom: 2px solid ${branding.primaryColor};
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .score-circle {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor});
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      margin: 0 auto 20px;
    }
    .score-value { font-size: 48px; font-weight: bold; }
    .score-label { font-size: 14px; opacity: 0.9; }
    .score-level {
      text-align: center;
      padding: 15px;
      border-radius: 8px;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .level-critical { background: #fee2e2; color: #dc2626; }
    .level-vulnerable { background: #ffedd5; color: #ea580c; }
    .level-developing { background: #fef3c7; color: #d97706; }
    .level-projectready { background: #dcfce7; color: #16a34a; }
    .strengths-weaknesses {
      display: flex;
      gap: 20px;
      margin-top: 20px;
    }
    .strength-box, .weakness-box {
      flex: 1;
      padding: 20px;
      border-radius: 8px;
    }
    .strength-box { background: #dcfce7; border-left: 4px solid #16a34a; }
    .weakness-box { background: #fee2e2; border-left: 4px solid #dc2626; }
    .strength-box h4 { color: #16a34a; }
    .weakness-box h4 { color: #dc2626; }
    .category-item {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      border-left: 4px solid ${branding.primaryColor};
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .category-title { font-weight: bold; color: ${branding.secondaryColor}; }
    .category-score { 
      background: ${branding.primaryColor}; 
      color: white; 
      padding: 5px 15px; 
      border-radius: 20px;
      font-weight: bold;
    }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 10px 0;
    }
    .progress-fill {
      height: 100%;
      background: ${branding.primaryColor};
      border-radius: 4px;
    }
    .recommendation-list {
      list-style: none;
      padding: 0;
    }
    .recommendation-list li {
      padding: 15px 15px 15px 50px;
      background: #f8f9fa;
      margin-bottom: 10px;
      border-radius: 8px;
      position: relative;
    }
    .recommendation-list li::before {
      content: "✓";
      position: absolute;
      left: 15px;
      color: ${branding.primaryColor};
      font-weight: bold;
      font-size: 18px;
    }
    .cta-section {
      background: linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor});
      color: white;
      padding: 40px;
      border-radius: 12px;
      text-align: center;
      margin-top: 40px;
    }
    .cta-section h3 { font-size: 24px; margin-bottom: 15px; }
    .cta-section p { margin-bottom: 20px; opacity: 0.9; }
    .cta-button {
      display: inline-block;
      background: white;
      color: ${branding.primaryColor};
      padding: 15px 40px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
      color: #666;
      font-size: 14px;
    }
    .footer a { color: ${branding.primaryColor}; }
    @media print {
      .container { padding: 20px; }
      .cta-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <img src="${branding.logoUrl}" alt="${branding.companyName}" class="logo" />
      <h1 class="report-title">Adams IQ™ Assessment Report</h1>
      <p class="report-subtitle">Prepared for ${submission.respondentName || 'Business Owner'} | ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Recipient Info -->
    <div class="recipient-info">
      <h3>Assessment Details</h3>
      <p><strong>Name:</strong> ${submission.respondentName || 'Not provided'}</p>
      <p><strong>Company:</strong> ${submission.respondentCompany || 'Not provided'}</p>
      <p><strong>Email:</strong> ${submission.respondentEmail || 'Not provided'}</p>
      <p><strong>Assessment Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>

    ${executiveSummary.enabled ? `
    <!-- Executive Summary -->
    <div class="section">
      <h2 class="section-title">${executiveSummary.title}</h2>
      ${executiveSummary.customIntroText ? `<p style="margin-bottom: 20px;">${executiveSummary.customIntroText}</p>` : ''}
      
      ${executiveSummary.showOverallScore ? `
      <div class="score-circle">
        <span class="score-value">${submission.totalScore}</span>
        <span class="score-label">of ${submission.maxScore}</span>
      </div>
      <div class="score-level level-${submission.scoreLevel.toLowerCase().replace(/[- ]/g, '')}">
        ${submission.scoreLevel} Level - ${submission.percentage}%
      </div>
      ` : ''}

      ${executiveSummary.showKeyStrengths || executiveSummary.showDevelopmentAreas ? `
      <div class="strengths-weaknesses">
        ${executiveSummary.showKeyStrengths ? `
        <div class="strength-box">
          <h4>Key Strength</h4>
          <p>${getTopCategory(submission.categoryScores, 'high')}</p>
        </div>
        ` : ''}
        ${executiveSummary.showDevelopmentAreas ? `
        <div class="weakness-box">
          <h4>Priority Development Area</h4>
          <p>${getTopCategory(submission.categoryScores, 'low')}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Detailed Analysis -->
    <div class="section">
      <h2 class="section-title">Detailed Analysis</h2>
      ${detailedSections
        .filter(s => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map(section => {
          const score = categoryScoresMap[section.category] || 0;
          const criteria = score < 40 ? section.scoringCriteria.low 
            : score < 70 ? section.scoringCriteria.medium 
            : section.scoringCriteria.high;
          return `
          <div class="category-item">
            <div class="category-header">
              <span class="category-title">${section.title}</span>
              <span class="category-score">${score}%</span>
            </div>
            <p style="color: #666; font-size: 14px; margin-bottom: 10px;">${section.description}</p>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${score}%"></div>
            </div>
            <p><strong>${criteria.label}:</strong> ${criteria.description}</p>
          </div>
          `;
        }).join('')}
    </div>

    ${recommendations.enabled ? `
    <!-- Recommendations -->
    <div class="section">
      <h2 class="section-title">${recommendations.title}</h2>
      
      ${recommendations.showPrioritizedInitiatives ? `
      <h3 style="margin-bottom: 15px; color: ${branding.secondaryColor};">Prioritized Initiatives</h3>
      <ul class="recommendation-list">
        ${(recommendations.byScoreLevel[normalizedKey as keyof typeof recommendations.byScoreLevel] || recommendations.byScoreLevel.developing)
          .map(rec => `<li>${rec}</li>`).join('')}
      </ul>
      ` : ''}

      ${recommendations.showImplementationGuidance ? `
      <h3 style="margin: 30px 0 15px; color: ${branding.secondaryColor};">Implementation Guidance</h3>
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9;">
        <p><strong>Start Small:</strong> Focus on one initiative at a time to build momentum.</p>
        <p style="margin-top: 10px;"><strong>Set Milestones:</strong> Break larger goals into 90-day sprints with measurable outcomes.</p>
        <p style="margin-top: 10px;"><strong>Get Support:</strong> Consider scheduling a conversation with Adams Electric to review your results.</p>
      </div>
      ` : ''}

      ${recommendations.showExpectedOutcomes ? `
      <h3 style="margin: 30px 0 15px; color: ${branding.secondaryColor};">Expected Outcomes</h3>
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
        <p>By implementing these recommendations, you can expect:</p>
        <ul style="margin-top: 10px; margin-left: 20px;">
          <li>Fewer change orders and less rework</li>
          <li>Tighter coordination between field and office</li>
          <li>Stronger field leadership and crew development</li>
          <li>Smoother project closeout and handover</li>
        </ul>
      </div>
      ` : ''}
    </div>
    ` : ''}

    ${callToAction.enabled ? `
    <!-- Call to Action -->
    <div class="cta-section">
      <h3>${callToAction.title}</h3>
      <p>${callToAction.description}</p>
      <a href="${callToAction.buttonUrl}" class="cta-button">${callToAction.buttonText}</a>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p><strong>${branding.companyName}</strong></p>
      <p>${branding.contactEmail} | ${branding.contactPhone}</p>
      <p><a href="${branding.website}">${branding.website}</a></p>
      <p style="margin-top: 15px; font-size: 12px; color: #999;">
        This report is confidential and intended solely for the recipient. 
        © ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getTopCategory(categoryScores: any[], type: 'high' | 'low'): string {
  if (!categoryScores || categoryScores.length === 0) return 'N/A';
  
  const sorted = [...categoryScores].sort((a, b) => 
    type === 'high' ? b.percentage - a.percentage : a.percentage - b.percentage
  );
  
  const categoryLabels: Record<string, string> = {
    preconstruction: "Preconstruction",
    risk: "Risk & Safety",
    fieldLeadership: "Field Leadership",
    coordination: "Project Coordination",
    closeout: "Closeout & Turnover",
    rework: "Rework Reduction",
  };
  
  return categoryLabels[sorted[0]?.category] || sorted[0]?.category || 'N/A';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, sendEmail = true } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID required" }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    // Get submission data
    const submissionRef = doc(db, COLLECTIONS.QUIZ_SUBMISSIONS, submissionId);
    const submissionSnap = await getDoc(submissionRef);

    if (!submissionSnap.exists()) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const submission = { id: submissionSnap.id, ...submissionSnap.data() } as Record<string, any>;

    // Get active report template or use default
    let template = defaultTemplate;
    try {
      const templatesQuery = query(
        collection(db, COLLECTIONS.QUIZ_REPORT_TEMPLATES),
        where("isActive", "==", true),
        limit(1)
      );
      const templatesSnap = await getDocs(templatesQuery);
      if (!templatesSnap.empty) {
        const templateData = templatesSnap.docs[0].data() as QuizReportTemplateDoc;
        template = { ...defaultTemplate, ...templateData };
      }
    } catch (e) {
      console.log("Using default template");
    }

    // Generate HTML report
    const reportHTML = generateReportHTML(submission, template);

    // Send email with report
    let emailSent = false;
    if (sendEmail && submission.respondentEmail) {
      try {
        const gmailUser = process.env.GMAIL_SMTP_USER;
        const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

        if (gmailUser && gmailAppPassword) {
          const transporter = nodemailer.createTransport({
            host: process.env.GMAIL_SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.GMAIL_SMTP_PORT) || 587,
            secure: false,
            auth: {
              user: gmailUser,
              pass: gmailAppPassword,
            },
          });

          const { emailSettings, branding } = template;
          const subject = emailSettings.subject || "Your Adams IQ Assessment Results";
          const fromName = emailSettings.fromName || branding.companyName || "Adams Electric";
          const replyTo = emailSettings.replyTo || branding.contactEmail || "info@adams-electric.com";
          const introText = emailSettings.introText || "Thank you for completing the Adams IQ Assessment! Attached is your personalized report with insights and recommendations for building a sustainable business legacy.";
          const signatureText = emailSettings.signatureText || "Best regards,\nThe Adams Electric Team";

          const introHtml = `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">${introText.replace(/\n/g, "<br/>")}</p>`;
          const signatureHtml = `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #666; padding: 20px 0; border-top: 1px solid #ddd; margin-top: 20px;">
              <p style="white-space: pre-line;">${signatureText}</p>
              <p style="font-size: 12px; margin-top: 20px;">
                <strong>${branding.companyName}</strong><br/>
                ${branding.contactEmail} | ${branding.contactPhone}<br/>
                <a href="${branding.website}">${branding.website}</a>
              </p>
            </div>
          `;

          const emailBody = reportHTML.replace(
            "</body>",
            `${introHtml}\n${signatureHtml}\n</body>`
          );

          const toAddresses = [submission.respondentEmail];
          const internalEmail = "info@adams-electric.com";
          if (internalEmail !== submission.respondentEmail) {
            toAddresses.push(internalEmail);
          }

          await transporter.sendMail({
            from: `"${fromName}" <${gmailUser}>`,
            to: toAddresses.join(", "),
            replyTo,
            subject,
            html: emailBody,
          });

          emailSent = true;
          console.log("Quiz report email sent to:", toAddresses.join(", "));
        } else {
          console.error("Gmail SMTP credentials not configured — quiz report email not sent");
        }
      } catch (emailError) {
        console.error("Error sending quiz report email:", emailError);
      }
    }

    // Update submission with report generation timestamp
    await updateDoc(submissionRef, {
      reportSentAt: Timestamp.now(),
      reportEmailSent: emailSent,
      updatedAt: Timestamp.now(),
    });

    // Return the HTML for PDF generation (client-side) or email
    return NextResponse.json({
      success: true,
      reportHTML,
      submission,
      emailSent,
      template: {
        emailSettings: template.emailSettings,
        branding: template.branding,
      },
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
