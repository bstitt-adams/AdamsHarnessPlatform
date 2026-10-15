/**
 * Adams Project Readiness Assessment Quiz Data
 * 10 questions to assess project planning and delivery readiness
 */

export interface QuizQuestion {
  id: number;
  question: string;
  category: 'preconstruction' | 'risk' | 'fieldLeadership' | 'coordination' | 'closeout' | 'rework';
}

export interface QuizAnswer {
  value: number;
  label: string;
}

export const quizAnswers: QuizAnswer[] = [
  { value: 1, label: "1 - Not at all true" },
  { value: 2, label: "2 - Slightly true" },
  { value: 3, label: "3 - Somewhat true" },
  { value: 4, label: "4 - Mostly true" },
  { value: 5, label: "5 - Absolutely true" },
];

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "Our projects begin with a documented preconstruction plan covering budget, schedule, and scope.",
    category: "preconstruction",
  },
  {
    id: 2,
    question: "We have a clear picture of project risks before mobilization—not after problems appear in the field.",
    category: "risk",
  },
  {
    id: 3,
    question: "Our field leaders can make day-to-day decisions without escalating everything to the office.",
    category: "fieldLeadership",
  },
  {
    id: 4,
    question: "We use coordinated models or documented layouts to resolve conflicts before installation.",
    category: "coordination",
  },
  {
    id: 5,
    question: "We know our long-lead electrical procurement items and track them from day one.",
    category: "closeout",
  },
  {
    id: 6,
    question: "Closeout documentation is planned and assembled throughout the project, not reconstructed at the end.",
    category: "closeout",
  },
  {
    id: 7,
    question: "Our crews complete work with minimal rework because coordination happens before installation.",
    category: "rework",
  },
  {
    id: 8,
    question: "Our project teams spend more time executing plans than reacting to surprises.",
    category: "fieldLeadership",
  },
  {
    id: 9,
    question: "Our safety planning is integrated into daily work, not a separate checkbox exercise.",
    category: "risk",
  },
  {
    id: 10,
    question: "If a project manager were unavailable, the project would continue smoothly with existing documentation.",
    category: "rework",
  },
];

export interface ScoreRange {
  min: number;
  max: number;
  level: string;
  title: string;
  summary: string;
  description: string;
  recommendations: string[];
  urgency: 'critical' | 'high' | 'moderate' | 'low';
  ctaText: string;
}

export const scoreRanges: ScoreRange[] = [
  {
    min: 10,
    max: 20,
    level: "Critical",
    title: "Your Projects Are at Risk",
    summary: "Your project delivery relies heavily on improvisation and lacks the planning foundation for predictable outcomes.",
    description: "Based on your responses, your projects likely face recurring surprises—coordination conflicts discovered in the field, unclear scope, and documentation gaps that surface at closeout. This is common when teams are stretched thin, but it compounds cost and schedule risk on every job.",
    recommendations: [
      "Establish a preconstruction planning checklist for every project",
      "Identify long-lead procurement items at kickoff",
      "Start daily pre-task safety planning on all active jobsites",
      "Begin documenting as-built conditions during installation",
      "Schedule a conversation with our team about delivery support"
    ],
    urgency: "critical",
    ctaText: "Talk to Adams Electric"
  },
  {
    min: 21,
    max: 30,
    level: "Vulnerable",
    title: "Planning Gaps Exist",
    summary: "You have some structure in place, but significant gaps remain in coordination, documentation, and field support.",
    description: "Your projects have elements of planning, but the pieces aren't connected into a reliable system. Coordination may happen reactively, and field teams may still depend on a few key people for answers. Small improvements in planning discipline will pay off quickly.",
    recommendations: [
      "Introduce model-based or drawing-based coordination before rough-in",
      "Create standard closeout documentation requirements at kickoff",
      "Empower field leaders with clear decision authority",
      "Track procurement milestones visibly across the team",
      "Build a look-ahead planning routine for each project"
    ],
    urgency: "high",
    ctaText: "Strengthen Your Planning"
  },
  {
    min: 31,
    max: 40,
    level: "Developing",
    title: "Making Progress",
    summary: "You're on the right track with solid planning foundations, but there's room to strengthen coordination and consistency.",
    description: "You've invested in planning and coordination, and your projects benefit from it. The remaining opportunity is consistency—making the practices that work on your best projects the standard on every project, regardless of who's running it.",
    recommendations: [
      "Standardize preconstruction workflows across all projects",
      "Expand prefabrication to repeatable assemblies",
      "Formalize field leadership development",
      "Audit closeout documentation quality mid-project",
      "Capture lessons learned and feed them into estimating"
    ],
    urgency: "moderate",
    ctaText: "Accelerate Your Delivery"
  },
  {
    min: 41,
    max: 50,
    level: "Project-Ready",
    title: "Built to Deliver",
    summary: "Congratulations! Your projects have strong planning, coordination, and delivery foundations. Now it's about consistency and continuous improvement.",
    description: "Your approach to project delivery is disciplined—planning, coordination, safety, and documentation are integrated into how you work. Your focus now should be on refining the system, developing your bench of field leaders, and leveraging prefabrication and digital coordination further.",
    recommendations: [
      "Benchmark coordination quality across project teams",
      "Deepen prefabrication integration with BIM workflows",
      "Develop the next generation of field leaders",
      "Measure rework and drive it toward zero",
      "Share your delivery standards with partners and owners"
    ],
    urgency: "low",
    ctaText: "Partner with Adams Electric"
  },
];

export interface CategoryScore {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  percentage: number;
  insight: string;
}

export const categoryLabels: Record<string, string> = {
  preconstruction: "Preconstruction Planning",
  risk: "Risk Visibility",
  fieldLeadership: "Field Leadership",
  coordination: "Coordination & BIM",
  closeout: "Procurement & Closeout",
  rework: "Rework Prevention",
};

export const categoryInsights: Record<string, Record<string, string>> = {
  preconstruction: {
    low: "Projects start without a documented plan, leaving budget, schedule, and scope open to interpretation.",
    medium: "Some planning exists, but it isn't consistent or thorough enough to prevent surprises.",
    high: "Your projects begin with solid preconstruction planning—a strong foundation.",
  },
  risk: {
    low: "Project risks surface in the field rather than in planning, where they're far more expensive to fix.",
    medium: "You identify some risks early, but the picture isn't complete or shared across the team.",
    high: "Risks are identified and addressed before mobilization.",
  },
  fieldLeadership: {
    low: "Field decisions bottleneck on a few people, slowing work and burning out your strongest leaders.",
    medium: "Field leaders handle some decisions, but escalation is still the default.",
    high: "Your field leaders operate with clear authority and keep work moving.",
  },
  coordination: {
    low: "Conflicts are discovered during installation instead of in coordination—rework is likely routine.",
    medium: "Some coordination happens, but coverage is inconsistent across systems or projects.",
    high: "Coordination resolves conflicts before field work begins.",
  },
  closeout: {
    low: "Procurement and closeout are reactive—long-lead items surprise you and documentation is rebuilt at the end.",
    medium: "You track procurement and closeout, but not systematically from kickoff.",
    high: "Long-lead items and closeout documentation are planned and tracked throughout.",
  },
  rework: {
    low: "Rework is a recurring cost—coordination and information flow need attention.",
    medium: "Rework happens occasionally; tightening coordination upstream will reduce it further.",
    high: "Your teams build it right the first time—rework is rare and measured.",
  },
};

export function calculateResults(answers: Record<number, number>) {
  // Calculate total score
  const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);

  // Find the appropriate score range
  const scoreRange = scoreRanges.find(
    (range) => totalScore >= range.min && totalScore <= range.max
  ) || scoreRanges[0];

  // Calculate category scores
  const categoryScores: CategoryScore[] = [];
  const categories = ['preconstruction', 'risk', 'fieldLeadership', 'coordination', 'closeout', 'rework'];

  categories.forEach((category) => {
    const categoryQuestions = quizQuestions.filter((q) => q.category === category);
    const categoryScore = categoryQuestions.reduce(
      (sum, q) => sum + (answers[q.id] || 0),
      0
    );
    const maxScore = categoryQuestions.length * 5;
    const percentage = Math.round((categoryScore / maxScore) * 100);

    let insightLevel: 'low' | 'medium' | 'high';
    if (percentage < 40) insightLevel = 'low';
    else if (percentage < 70) insightLevel = 'medium';
    else insightLevel = 'high';

    categoryScores.push({
      category,
      label: categoryLabels[category],
      score: categoryScore,
      maxScore,
      percentage,
      insight: categoryInsights[category][insightLevel],
    });
  });

  // Sort by percentage (lowest first) to highlight areas needing attention
  const priorityAreas = [...categoryScores].sort((a, b) => a.percentage - b.percentage);

  return {
    totalScore,
    maxScore: 50,
    percentage: Math.round((totalScore / 50) * 100),
    scoreRange,
    categoryScores,
    priorityAreas,
    topStrength: priorityAreas[priorityAreas.length - 1],
    topWeakness: priorityAreas[0],
  };
}

export type QuizResults = ReturnType<typeof calculateResults>;
