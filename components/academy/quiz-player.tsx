"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw,
  Trophy,
  Loader2,
  HelpCircle
} from "lucide-react";
import { submitQuizAttempt, getBestQuizAttempt, QuizQuestion, QuizAttemptDoc } from "@/lib/firebase-lms-student";
import { toast } from "sonner";

interface QuizPlayerProps {
  lessonId: string;
  courseId: string;
  enrollmentId: string;
  userId: string;
  quizContent: string;
  onComplete?: () => void;
}

interface ParsedQuiz {
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
}

function parseQuizContent(content: string): ParsedQuiz {
  const lines = content.split("\n");
  const questions: QuizQuestion[] = [];
  let title = "Quiz";
  let passingScore = 70;
  
  let currentQuestion: Partial<QuizQuestion> | null = null;
  let questionId = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Parse title
    if (trimmed.startsWith("# ")) {
      title = trimmed.substring(2);
      continue;
    }

    // Parse passing score
    const scoreMatch = trimmed.match(/Passing Score:\s*(\d+)%/i);
    if (scoreMatch) {
      passingScore = parseInt(scoreMatch[1]);
      continue;
    }

    // Parse question
    const questionMatch = trimmed.match(/^###?\s*(?:Question\s*\d+|Q\d+)[.:]?\s*(.*)/i);
    if (questionMatch || trimmed.match(/^###?\s+\w/)) {
      if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length > 0) {
        questions.push(currentQuestion as QuizQuestion);
      }
      currentQuestion = {
        id: `q${++questionId}`,
        question: questionMatch ? questionMatch[1] : trimmed.replace(/^###?\s*/, ""),
        options: [],
        correctAnswer: 0,
      };
      continue;
    }

    // Parse options (A), B), C), D) or A. B. C. D.)
    const optionMatch = trimmed.match(/^([A-D])[).]\s*(.*)/i);
    if (optionMatch && currentQuestion) {
      const optionText = optionMatch[2];
      const isCorrect = optionText.includes("✓") || optionText.includes("✔");
      const cleanText = optionText.replace(/[✓✔]/g, "").trim();
      
      if (isCorrect) {
        currentQuestion.correctAnswer = currentQuestion.options?.length || 0;
      }
      currentQuestion.options = [...(currentQuestion.options || []), cleanText];
      continue;
    }

    // Parse explanation
    if (trimmed.startsWith("*") && currentQuestion) {
      currentQuestion.explanation = trimmed.replace(/^\*+|\*+$/g, "").trim();
    }
  }

  // Add last question
  if (currentQuestion && currentQuestion.question && currentQuestion.options && currentQuestion.options.length > 0) {
    questions.push(currentQuestion as QuizQuestion);
  }

  return { title, passingScore, questions };
}

export function QuizPlayer({ 
  lessonId, 
  courseId, 
  enrollmentId, 
  userId, 
  quizContent,
  onComplete 
}: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<ParsedQuiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizAttemptDoc | null>(null);
  const [bestAttempt, setBestAttempt] = useState<QuizAttemptDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parsed = parseQuizContent(quizContent);
    setQuiz(parsed);
    setAnswers(new Array(parsed.questions.length).fill(null));
    loadBestAttempt();
  }, [quizContent]);

  const loadBestAttempt = async () => {
    setLoading(true);
    try {
      const best = await getBestQuizAttempt(userId, lessonId);
      setBestAttempt(best);
      if (best?.passed) {
        setShowResults(true);
        setResult(best);
      }
    } catch (error) {
      console.error("Error loading best attempt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Check all questions answered
    const unanswered = answers.findIndex(a => a === null);
    if (unanswered !== -1) {
      toast.error(`Please answer question ${unanswered + 1}`);
      setCurrentQuestionIndex(unanswered);
      return;
    }

    setSubmitting(true);
    try {
      const attempt = await submitQuizAttempt({
        userId,
        lessonId,
        courseId,
        enrollmentId,
        questions: quiz.questions,
        answers: answers as number[],
        passingScore: quiz.passingScore,
      });

      setResult(attempt);
      setShowResults(true);

      if (attempt.passed) {
        toast.success("Congratulations! You passed the quiz!");
        onComplete?.();
      } else {
        toast.error(`You scored ${attempt.score}%. You need ${quiz.passingScore}% to pass.`);
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setShowResults(false);
    setResult(null);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(quiz?.questions.length || 0).fill(null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Quiz Not Available</h3>
        <p className="text-muted-foreground">
          This quiz content could not be loaded. Please contact support.
        </p>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className={`text-center p-8 rounded-lg ${result.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {result.passed ? (
            <Trophy className="h-16 w-16 mx-auto text-green-500 mb-4" />
          ) : (
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          )}
          <h2 className="text-2xl font-bold mb-2">
            {result.passed ? "Congratulations!" : "Keep Trying!"}
          </h2>
          <p className="text-lg mb-4">
            You scored <span className="font-bold">{result.score}%</span>
            {!result.passed && ` (${quiz.passingScore}% required to pass)`}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Badge variant={result.passed ? "default" : "destructive"} className="text-lg px-4 py-1">
              {result.passed ? "PASSED" : "NOT PASSED"}
            </Badge>
          </div>
        </div>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Review Your Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.questions.map((question, index) => {
              const userAnswer = result.answers[index];
              const isCorrect = userAnswer === question.correctAnswer;

              return (
                <div key={question.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {index + 1}. {question.question}
                      </p>
                    </div>
                  </div>
                  <div className="ml-7 space-y-2">
                    {question.options.map((option, optIndex) => {
                      const isUserAnswer = optIndex === userAnswer;
                      const isCorrectAnswer = optIndex === question.correctAnswer;

                      return (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            isCorrectAnswer
                              ? 'bg-green-500/10 border border-green-500'
                              : isUserAnswer
                              ? 'bg-red-500/10 border border-red-500'
                              : 'bg-muted'
                          }`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          {option}
                          {isCorrectAnswer && (
                            <Badge className="ml-2 bg-green-500">Correct</Badge>
                          )}
                          {isUserAnswer && !isCorrectAnswer && (
                            <Badge className="ml-2" variant="destructive">Your Answer</Badge>
                          )}
                        </div>
                      );
                    })}
                    {question.explanation && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {question.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Retry Button */}
        {!result.passed && (
          <div className="text-center">
            <Button onClick={handleRetry} size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const allAnswered = answers.every(a => a !== null);

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <Badge variant="secondary">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Passing score: {quiz.passingScore}%
        </p>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-6">{currentQuestion.question}</h3>
          
          <RadioGroup
            value={answers[currentQuestionIndex]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
          >
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestionIndex] === index
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[index] !== null
                  ? 'bg-green-500 text-white'
                  : 'bg-muted hover:bg-muted-foreground/20'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit Quiz
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
