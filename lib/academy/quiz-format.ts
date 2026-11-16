/** Quiz lesson Markdown format shared by the admin editor, server grading, and the player. */
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ParsedQuiz {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

/** Student-safe view: no answer key, no explanations. */
export type PublicQuizQuestion = Omit<QuizQuestion, "correctAnswer" | "explanation">;
export interface PublicQuiz {
  title: string;
  passingScore: number;
  questions: PublicQuizQuestion[];
}

export function parseQuizContent(content: string): ParsedQuiz {
  const questions: QuizQuestion[] = [];
  let title = "Quiz";
  let passingScore = 70;
  let current: Partial<QuizQuestion> | null = null;
  let questionId = 0;
  const pushCurrent = () => {
    if (current?.question && current.options?.length) questions.push(current as QuizQuestion);
  };

  for (const line of (content || "").split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      title = trimmed.substring(2);
      continue;
    }
    const scoreMatch = trimmed.match(/Passing Score:\s*(\d+)%/i);
    if (scoreMatch) {
      passingScore = parseInt(scoreMatch[1]);
      continue;
    }
    const questionMatch = trimmed.match(/^###?\s*(?:Question\s*\d+|Q\d+)[.:]?\s*(.*)/i);
    if (questionMatch || trimmed.match(/^###?\s+\w/)) {
      pushCurrent();
      current = {
        id: `q${++questionId}`,
        question: questionMatch ? questionMatch[1] : trimmed.replace(/^###?\s*/, ""),
        options: [],
        correctAnswer: 0,
      };
      continue;
    }
    const optionMatch = trimmed.match(/^([A-D])[).]\s*(.*)/i);
    if (optionMatch && current) {
      const optionText = optionMatch[2];
      if (optionText.includes("✓") || optionText.includes("✔")) current.correctAnswer = current.options?.length || 0;
      current.options = [...(current.options || []), optionText.replace(/[✓✔]/g, "").trim()];
      continue;
    }
    if (trimmed.startsWith("*") && current) {
      current.explanation = trimmed.replace(/^\*+|\*+$/g, "").trim();
    }
  }
  pushCurrent();
  return { title, passingScore, questions };
}

export function toPublicQuiz(quiz: ParsedQuiz): PublicQuiz {
  return {
    title: quiz.title,
    passingScore: quiz.passingScore,
    questions: quiz.questions.map(({ id, question, options }) => ({ id, question, options })),
  };
}
