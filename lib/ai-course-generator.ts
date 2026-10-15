/**
 * AI Course Content Generator
 * Provides AI-powered generation for course syllabi, lessons, quizzes, and exams
 */

export interface CourseOutline {
  title: string;
  description: string;
  targetAudience: string;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  estimatedDuration: string;
  learningOutcomes: string[];
  prerequisites: string[];
  modules: ModuleOutline[];
}

export interface ModuleOutline {
  title: string;
  description: string;
  lessons: LessonOutline[];
  estimatedDuration: string;
}

export interface LessonOutline {
  title: string;
  description: string;
  contentType: "video" | "text" | "quiz" | "assignment" | "download" | "live";
  estimatedDuration: string;
  keyPoints?: string[];
}

export interface GeneratedLesson {
  title: string;
  description: string;
  content: string;
  keyTakeaways: string[];
  videoScript?: string;
  discussionQuestions?: string[];
}

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  passingScore: number;
  timeLimit: number;
  questions: QuizQuestion[];
}

export interface GeneratedExam {
  title: string;
  description: string;
  instructions: string;
  passingScore: number;
  timeLimit: number;
  sections: {
    title: string;
    description: string;
    questions: QuizQuestion[];
  }[];
}

// API call helper
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("/api/ai/course-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed");
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "AI generation failed");
  }

  return data.content;
}

/**
 * Generate a complete course syllabus/outline
 */
export async function generateCourseSyllabus(params: {
  topic: string;
  targetAudience: string;
  difficultyLevel: "beginner" | "intermediate" | "advanced";
  desiredOutcomes?: string;
  numberOfModules?: number;
  additionalContext?: string;
}): Promise<CourseOutline> {
  const systemPrompt = `You are an expert instructional designer and curriculum developer. You create comprehensive, engaging course outlines that follow best practices in adult learning and instructional design. Your courses are well-structured, practical, and outcome-focused.`;

  const userPrompt = `Create a detailed course outline for the following:

Topic: ${params.topic}
Target Audience: ${params.targetAudience}
Difficulty Level: ${params.difficultyLevel}
${params.desiredOutcomes ? `Desired Learning Outcomes: ${params.desiredOutcomes}` : ""}
Number of Modules: ${params.numberOfModules || "4-6 modules"}
${params.additionalContext ? `Additional Context: ${params.additionalContext}` : ""}

Please provide a JSON response with the following structure:
{
  "title": "Course title",
  "description": "Comprehensive course description (2-3 paragraphs)",
  "targetAudience": "Detailed target audience description",
  "difficultyLevel": "${params.difficultyLevel}",
  "estimatedDuration": "Total course duration (e.g., '8 hours')",
  "learningOutcomes": ["Outcome 1", "Outcome 2", ...],
  "prerequisites": ["Prerequisite 1", ...],
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "estimatedDuration": "Duration",
      "lessons": [
        {
          "title": "Lesson title",
          "description": "Brief lesson description",
          "contentType": "video|text|quiz|assignment",
          "estimatedDuration": "Duration",
          "keyPoints": ["Point 1", "Point 2", ...]
        }
      ]
    }
  ]
}

Make the course practical, engaging, and focused on real-world application. Include a mix of content types (video, text, quizzes, assignments).`;

  const response = await callAI(systemPrompt, userPrompt);
  
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Failed to parse syllabus:", error);
    throw new Error("Failed to generate course syllabus");
  }
}

/**
 * Generate lesson content
 */
export async function generateLessonContent(params: {
  lessonTitle: string;
  lessonDescription: string;
  courseTitle: string;
  moduleTitle: string;
  contentType: "video" | "text" | "assignment";
  targetAudience: string;
  difficultyLevel: string;
  keyPoints?: string[];
  previousLessons?: string[];
}): Promise<GeneratedLesson> {
  const systemPrompt = `You are an expert course content creator who writes engaging, educational content. Your writing is clear, practical, and includes real-world examples. You adapt your style based on the content type and audience.`;

  let contentTypeInstructions = "";
  if (params.contentType === "video") {
    contentTypeInstructions = `Generate a video script that:
- Starts with a hook to capture attention
- Includes clear explanations with examples
- Has natural transitions between topics
- Ends with a summary and call-to-action
- Is conversational but professional
- Includes [VISUAL] cues for on-screen graphics`;
  } else if (params.contentType === "text") {
    contentTypeInstructions = `Generate article content that:
- Uses clear headings and subheadings
- Includes practical examples and case studies
- Has bullet points for key information
- Includes tips and best practices
- Uses markdown formatting`;
  } else if (params.contentType === "assignment") {
    contentTypeInstructions = `Generate an assignment that:
- Has clear objectives and instructions
- Includes a practical, hands-on task
- Provides rubric or evaluation criteria
- Includes example deliverables
- Has estimated completion time`;
  }

  const userPrompt = `Create lesson content for:

Course: ${params.courseTitle}
Module: ${params.moduleTitle}
Lesson Title: ${params.lessonTitle}
Lesson Description: ${params.lessonDescription}
Content Type: ${params.contentType}
Target Audience: ${params.targetAudience}
Difficulty: ${params.difficultyLevel}
${params.keyPoints ? `Key Points to Cover: ${params.keyPoints.join(", ")}` : ""}
${params.previousLessons ? `Previous Lessons: ${params.previousLessons.join(", ")}` : ""}

${contentTypeInstructions}

Provide a JSON response:
{
  "title": "Lesson title",
  "description": "Updated description",
  "content": "The main content (markdown formatted)",
  "keyTakeaways": ["Takeaway 1", "Takeaway 2", ...],
  ${params.contentType === "video" ? '"videoScript": "Full video script with [VISUAL] cues",' : ""}
  "discussionQuestions": ["Question 1", "Question 2", ...]
}`;

  const response = await callAI(systemPrompt, userPrompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Failed to parse lesson:", error);
    throw new Error("Failed to generate lesson content");
  }
}

/**
 * Generate quiz questions
 */
export async function generateQuiz(params: {
  topic: string;
  lessonTitle?: string;
  moduleTitle?: string;
  courseTitle: string;
  numberOfQuestions: number;
  questionTypes?: ("multiple_choice" | "true_false" | "short_answer")[];
  difficultyMix?: { easy: number; medium: number; hard: number };
  keyConceptsToTest?: string[];
}): Promise<GeneratedQuiz> {
  const systemPrompt = `You are an expert assessment designer who creates effective, fair quiz questions. Your questions test understanding, not just memorization. You write clear questions with unambiguous correct answers and helpful explanations.`;

  const difficultyMix = params.difficultyMix || { easy: 30, medium: 50, hard: 20 };
  const questionTypes = params.questionTypes || ["multiple_choice", "true_false"];

  const userPrompt = `Create a quiz for:

Course: ${params.courseTitle}
${params.moduleTitle ? `Module: ${params.moduleTitle}` : ""}
${params.lessonTitle ? `Lesson: ${params.lessonTitle}` : ""}
Topic: ${params.topic}
Number of Questions: ${params.numberOfQuestions}
Question Types: ${questionTypes.join(", ")}
Difficulty Mix: ${difficultyMix.easy}% easy, ${difficultyMix.medium}% medium, ${difficultyMix.hard}% hard
${params.keyConceptsToTest ? `Key Concepts to Test: ${params.keyConceptsToTest.join(", ")}` : ""}

Provide a JSON response:
{
  "title": "Quiz title",
  "description": "Brief quiz description",
  "passingScore": 70,
  "timeLimit": 15,
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "Question text",
      "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
      "correctAnswer": 0,
      "explanation": "Why this is correct",
      "points": 10,
      "difficulty": "easy|medium|hard"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "Statement to evaluate",
      "options": ["True", "False"],
      "correctAnswer": 0,
      "explanation": "Explanation",
      "points": 5,
      "difficulty": "easy"
    }
  ]
}

Make questions that test understanding, not just recall. Include practical scenarios where appropriate.`;

  const response = await callAI(systemPrompt, userPrompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Failed to parse quiz:", error);
    throw new Error("Failed to generate quiz");
  }
}

/**
 * Generate a comprehensive exam
 */
export async function generateExam(params: {
  courseTitle: string;
  modules: { title: string; keyTopics: string[] }[];
  examType: "midterm" | "final" | "certification";
  totalQuestions: number;
  timeLimit: number;
  includeEssay?: boolean;
}): Promise<GeneratedExam> {
  const systemPrompt = `You are an expert assessment designer who creates comprehensive, fair exams. Your exams thoroughly test course knowledge while being achievable for prepared students. You balance question difficulty and cover all key topics proportionally.`;

  const userPrompt = `Create a ${params.examType} exam for:

Course: ${params.courseTitle}
Modules to Cover:
${params.modules.map((m, i) => `${i + 1}. ${m.title}: ${m.keyTopics.join(", ")}`).join("\n")}

Total Questions: ${params.totalQuestions}
Time Limit: ${params.timeLimit} minutes
Include Essay Questions: ${params.includeEssay ? "Yes (1-2 essay questions)" : "No"}

Provide a JSON response:
{
  "title": "${params.examType === "final" ? "Final Examination" : params.examType === "midterm" ? "Midterm Examination" : "Certification Exam"}",
  "description": "Exam description",
  "instructions": "Detailed exam instructions for students",
  "passingScore": 70,
  "timeLimit": ${params.timeLimit},
  "sections": [
    {
      "title": "Section title (e.g., Module 1: Topic Name)",
      "description": "Section instructions",
      "questions": [
        {
          "id": "s1q1",
          "type": "multiple_choice|true_false|short_answer|essay",
          "question": "Question text",
          "options": ["Option 1", ...] (for MC/TF only),
          "correctAnswer": "Answer or index",
          "explanation": "Grading guidance",
          "points": 10,
          "difficulty": "easy|medium|hard"
        }
      ]
    }
  ]
}

Distribute questions across modules proportionally. Include a mix of difficulty levels.`;

  const response = await callAI(systemPrompt, userPrompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Failed to parse exam:", error);
    throw new Error("Failed to generate exam");
  }
}

/**
 * Enhance existing content with AI
 */
export async function enhanceContent(params: {
  content: string;
  contentType: "description" | "lesson" | "quiz_question" | "learning_outcome";
  context?: string;
}): Promise<string> {
  const systemPrompt = `You are an expert instructional designer who improves educational content. You make content clearer, more engaging, and more effective for learning.`;

  const typeInstructions: Record<string, string> = {
    description: "Make this description more compelling and informative. Highlight the value and outcomes.",
    lesson: "Improve this lesson content. Make it clearer, add examples, and ensure it flows well.",
    quiz_question: "Improve this quiz question. Make it clearer and ensure it effectively tests understanding.",
    learning_outcome: "Rewrite this learning outcome using action verbs (Bloom's taxonomy). Make it specific and measurable.",
  };

  const userPrompt = `${typeInstructions[params.contentType]}

${params.context ? `Context: ${params.context}\n` : ""}
Original content:
${params.content}

Provide only the enhanced content, no explanations.`;

  return await callAI(systemPrompt, userPrompt);
}

/**
 * Generate video script from lesson content
 */
export async function generateVideoScript(params: {
  lessonTitle: string;
  lessonContent: string;
  targetDuration: number; // in minutes
  style: "conversational" | "formal" | "energetic";
}): Promise<string> {
  const systemPrompt = `You are an expert video script writer for educational content. You create engaging scripts that keep viewers watching while effectively teaching the material. You include visual cues and natural transitions.`;

  const userPrompt = `Create a video script for:

Lesson: ${params.lessonTitle}
Target Duration: ${params.targetDuration} minutes (approximately ${params.targetDuration * 150} words)
Style: ${params.style}

Content to cover:
${params.lessonContent}

Format the script with:
- [INTRO] Opening hook
- [VISUAL: description] for on-screen graphics
- [B-ROLL: description] for supplementary footage
- [TRANSITION] between major sections
- [SUMMARY] Key takeaways
- [CTA] Call to action

Make it engaging and educational. Include examples and analogies.`;

  return await callAI(systemPrompt, userPrompt);
}

/**
 * Suggest improvements for a course
 */
export async function suggestCourseImprovements(params: {
  courseTitle: string;
  courseDescription: string;
  modules: { title: string; lessonCount: number }[];
  currentOutcomes: string[];
}): Promise<{
  suggestions: string[];
  missingTopics: string[];
  structureRecommendations: string[];
}> {
  const systemPrompt = `You are an expert instructional designer who reviews and improves courses. You identify gaps, suggest improvements, and ensure courses meet learning objectives effectively.`;

  const userPrompt = `Review this course and suggest improvements:

Course: ${params.courseTitle}
Description: ${params.courseDescription}

Current Structure:
${params.modules.map((m, i) => `${i + 1}. ${m.title} (${m.lessonCount} lessons)`).join("\n")}

Current Learning Outcomes:
${params.currentOutcomes.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Provide a JSON response:
{
  "suggestions": ["Improvement suggestion 1", ...],
  "missingTopics": ["Topic that should be covered", ...],
  "structureRecommendations": ["Structure recommendation", ...]
}`;

  const response = await callAI(systemPrompt, userPrompt);
  
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Failed to parse suggestions:", error);
    return {
      suggestions: ["Unable to generate suggestions. Please try again."],
      missingTopics: [],
      structureRecommendations: [],
    };
  }
}
