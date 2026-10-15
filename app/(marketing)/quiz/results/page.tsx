"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Users,
  Settings,
  ArrowRightLeft,
  Eye,
  Award,
  Download,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import {
  calculateResults,
  QuizResults,
} from "@/lib/adams-quiz";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/schema";
import { logOpportunityCreated } from "@/lib/activity-logger";

const categoryIcons: Record<string, React.ElementType> = {
  preconstruction: TrendingUp,
  risk: Eye,
  fieldLeadership: Users,
  coordination: Settings,
  closeout: ArrowRightLeft,
  rework: Award,
};

export default function QuizResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportHTML, setReportHTML] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEmailingResults, setIsEmailingResults] = useState(false);

  useEffect(() => {
    const storedAnswers = sessionStorage.getItem("quizAnswers");
    if (storedAnswers) {
      const answers = JSON.parse(storedAnswers);
      const calculatedResults = calculateResults(answers);
      setResults(calculatedResults);
    } else {
      router.push("/quiz");
    }
  }, [router]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get the stored answers
      const storedAnswers = sessionStorage.getItem("quizAnswers");
      const answers = storedAnswers ? JSON.parse(storedAnswers) : {};
      
      let currentSubmissionId = "";
      
      // Save submission to Firestore
      if (db && results) {
        const docRef = await addDoc(collection(db, COLLECTIONS.QUIZ_SUBMISSIONS), {
          respondentName: `${formData.firstName} ${formData.lastName}`.trim(),
          respondentEmail: formData.email,
          respondentCompany: formData.company,
          respondentPhone: formData.phone,
          answers: answers,
          totalScore: results.totalScore,
          maxScore: results.maxScore,
          percentage: results.percentage,
          scoreLevel: results.scoreRange.level,
          categoryScores: results.categoryScores.map(cat => ({
            category: cat.category,
            score: cat.score,
            maxScore: cat.maxScore,
            percentage: cat.percentage,
          })),
          completedAt: Timestamp.now(),
          followUpStatus: "pending",
          createdAt: Timestamp.now(),
        });
        currentSubmissionId = docRef.id;
        setSubmissionId(currentSubmissionId);
        
        // Create an Opportunity for this lead
        try {
          const opportunityData = {
            name: `Quiz Lead - ${formData.firstName} ${formData.lastName}`.trim(),
            organizationName: formData.company || "Unknown",
            stage: "lead",
            value: 10000,
            probability: 10,
            expectedCloseDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            description: `Lead generated from Adams IQ Quiz.\n\nScore: ${results.totalScore}/${results.maxScore} (${results.percentage}%)\nLevel: ${results.scoreRange.level}\nTop Strength: ${results.topStrength.label}\nPriority Area: ${results.topWeakness.label}`,
            notes: `Contact Info:\nEmail: ${formData.email}\nPhone: ${formData.phone || "Not provided"}\nCompany: ${formData.company || "Not provided"}\n\nQuiz Submission ID: ${currentSubmissionId}`,
            source: "quiz",
            quizSubmissionId: currentSubmissionId,
            affiliateId: null,
            affiliateName: `${formData.firstName} ${formData.lastName}`.trim(),
            affiliateEmail: formData.email,
            affiliatePhone: formData.phone || null,
            affiliateCompany: formData.company || null,
            deliverables: [],
            isSubscription: false,
            monthlyAmount: null,
            subscriptionTermMonths: null,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          const oppRef = await addDoc(collection(db, COLLECTIONS.OPPORTUNITIES), opportunityData);
          await logOpportunityCreated(oppRef.id, opportunityData.name);
          console.log("Opportunity created for quiz lead:", oppRef.id);
        } catch (oppError) {
          console.error("Error creating opportunity from quiz:", oppError);
          // Continue - don't block the user from seeing results
        }
        
        // Generate and send PDF report via email
        if (formData.email && currentSubmissionId) {
          try {
            const reportResponse = await fetch("/api/quiz/generate-report", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ submissionId: currentSubmissionId, sendEmail: true }),
            });
            
            if (reportResponse.ok) {
              const reportData = await reportResponse.json();
              if (reportData.reportHTML) {
                setReportHTML(reportData.reportHTML);
              }
            }
          } catch (reportError) {
            console.error("Error generating report:", reportError);
            // Continue showing results even if report generation fails
          }
        }

        // Send quiz lead data to LeadConnector webhook
        try {
          await fetch("https://services.leadconnectorhq.com/hooks/o1rlj177UVXuz2i8tHHJ/webhook-trigger/8RIbOCvZ24D7BqqBK5L0", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submissionId: currentSubmissionId,
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone || undefined,
              company: formData.company || undefined,
              quizName: "Adams IQ Assessment",
              totalScore: results.totalScore,
              maxScore: results.maxScore,
              percentage: results.percentage,
              scoreLevel: results.scoreRange.level,
              topStrength: results.topStrength.label,
              priorityArea: results.topWeakness.label,
              categoryScores: results.categoryScores.map((cat) => ({
                category: cat.category,
                label: cat.label,
                score: cat.score,
                maxScore: cat.maxScore,
                percentage: cat.percentage,
              })),
              source: "quiz-results-page",
              submittedAt: new Date().toISOString(),
            }),
          });
        } catch (webhookError) {
          console.error("Error sending quiz lead to LeadConnector webhook:", webhookError);
          // Continue showing results even if webhook fails
        }
      }
      
      // Store lead info locally as well
      sessionStorage.setItem("quizLead", JSON.stringify(formData));
      
      setShowResults(true);
    } catch (error) {
      console.error("Error saving quiz submission:", error);
      // Still show results even if save fails
      setShowResults(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleDownloadPDF = async () => {
    if (!reportHTML) {
      toast.error("Report not available. Please try submitting the form again.");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const element = document.createElement("div");
      element.innerHTML = reportHTML;
      document.body.appendChild(element);

      const opt = {
        margin: 0.5,
        filename: `Adams-Project-Readiness-Report-${formData.firstName}-${formData.lastName}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const },
      };

      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set(opt).from(element).save();

      document.body.removeChild(element);
      toast.success("Your PDF report is downloading.");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleEmailResults = async () => {
    if (!submissionId || !formData.email) {
      toast.error("Report not available. Please try submitting the form again.");
      return;
    }

    setIsEmailingResults(true);
    try {
      const response = await fetch("/api/quiz/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, sendEmail: true }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.emailSent) {
          toast.success("Results emailed to you and our team.");
        } else {
          toast.error("Could not send results email. Please try again.");
        }
      } else {
        toast.error("Could not send results email. Please try again.");
      }
    } catch (error) {
      console.error("Error emailing results:", error);
      toast.error("Failed to email results. Please try again.");
    } finally {
      setIsEmailingResults(false);
    }
  };

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Calculating your results...</p>
        </div>
      </div>
    );
  }

  // Lead capture form (shown before results)
  if (!showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Your Results Are Ready!
            </h1>
            <p className="text-gray-400">
              Enter your details below to unlock your personalized Adams IQ™ Report
            </p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="john@company.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="company" className="text-gray-300">Company Name</Label>
                  <Input
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Acme Inc."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900 text-lg py-6"
                >
                  {isSubmitting ? (
                    "Processing..."
                  ) : (
                    <>
                      Get My Free Report
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting, you agree to receive your results and occasional insights from Adams Electric. 
                  We respect your privacy and will never spam you.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Results display
  const urgencyColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    moderate: "bg-sky-500",
    low: "bg-green-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className={`${urgencyColors[results.scoreRange.urgency]} text-white mb-4`}>
            {results.scoreRange.level} Level
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {results.scoreRange.title}
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {results.scoreRange.summary}
          </p>
        </div>

        {/* Score Overview */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Score Circle */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-700"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${results.percentage * 4.4} 440`}
                    className="text-blue-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{results.totalScore}</span>
                  <span className="text-sm text-white">of {results.maxScore}</span>
                </div>
              </div>

              {/* Score Description */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-semibold mb-2 text-white">Your Adams IQ™ Score</h2>
                <p className="text-gray-400 mb-4">{results.scoreRange.description}</p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {results.topStrength.label}
                    </div>
                    <div className="text-xs text-gray-500">Top Strength</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {results.topWeakness.label}
                    </div>
                    <div className="text-xs text-gray-500">Priority Area</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8 text-white">
          <CardHeader>
            <CardTitle className="text-white">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-white">
            {results.categoryScores.map((category) => {
              const Icon = categoryIcons[category.category] || Target;
              return (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{category.label}</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {category.score}/{category.maxScore} ({category.percentage}%)
                    </span>
                  </div>
                  <Progress 
                    value={category.percentage} 
                    className="h-2 bg-slate-700"
                  />
                  <p className="text-sm text-gray-400">{category.insight}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Your Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.scoreRange.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 mb-8">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Strengthen Your Project Delivery?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Schedule a call with Adams Electric to discuss your results and
              explore how our team supports planning, coordination, and execution.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white"
                asChild
              >
                <Link href="/schedule-a-call">
                  <Calendar className="mr-2 h-5 w-5" />
                  Schedule Your Free Call
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <Link href="/services">
                  Explore Our Services
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share / Download */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 text-center">
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || !reportHTML}
          >
            <Download className="mr-2 h-4 w-4" />
            {isGeneratingPDF ? "Generating PDF..." : "Download PDF Report"}
          </Button>
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={handleEmailResults}
            disabled={isEmailingResults || !submissionId}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isEmailingResults ? "Emailing..." : "Email My Results"}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Questions about your results?{" "}
            <Link href="/contact" className="text-blue-500 hover:underline">
              Contact us
            </Link>{" "}
            or call{" "}
            <a href="tel:+15133351978" className="text-blue-500 hover:underline">
              (513) 335-1978
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
