"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy, Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import type { PublicQuiz } from "@/lib/academy/quiz-format";
import { submitQuizApi, type QuizGradeResult } from "@/lib/academy/student-api";

interface QuizPlayerProps {
  lessonId: string;
  courseId: string;
  /** Student-safe quiz (no answer key) from /api/academy/courses/[id]. */
  quiz: PublicQuiz | undefined;
  bestAttempt?: { score: number; passed: boolean } | null;
  onComplete?: () => void;
}

/** Quiz player. Grading happens server-side; the answer key is only revealed after passing. */
export function QuizPlayer({ lessonId, courseId, quiz, bestAttempt, onComplete }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizGradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAnswers(new Array(quiz?.questions.length || 0).fill(null));
    setCurrentQuestionIndex(0);
    setResult(null);
  }, [quiz, lessonId]);

  const handleAnswerSelect = (answerIndex: number) => {
    setAnswers((prev) => prev.map((a, i) => (i === currentQuestionIndex ? answerIndex : a)));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const unanswered = answers.findIndex((a) => a === null);
    if (unanswered !== -1) {
      toast.error(`Please answer question ${unanswered + 1}`);
      setCurrentQuestionIndex(unanswered);
      return;
    }
    setSubmitting(true);
    try {
      const graded = await submitQuizApi(courseId, lessonId, answers as number[]);
      setResult(graded);
      if (graded.attempt.passed) {
        toast.success("Congratulations! You passed the quiz!");
        onComplete?.();
      } else {
        toast.error(`You scored ${graded.attempt.score}%. You need ${graded.attempt.passingScore}% to pass.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(quiz?.questions.length || 0).fill(null));
  };

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Quiz Not Available</h3>
        <p className="text-muted-foreground">This quiz content could not be loaded. Please contact support.</p>
      </div>
    );
  }

  if (!result && bestAttempt?.passed) {
    return (
      <div className="text-center p-8 rounded-lg bg-green-500/10 space-y-3">
        <Trophy className="h-16 w-16 mx-auto text-green-500" />
        <h2 className="text-2xl font-bold">Quiz passed</h2>
        <p>Your best score: <span className="font-bold">{bestAttempt.score}%</span></p>
        <Button variant="outline" onClick={handleRetry}><RotateCcw className="h-4 w-4 mr-2" />Retake for practice</Button>
      </div>
    );
  }

  if (result) {
    const { attempt, review } = result;
    return (
      <div className="space-y-6">
        <div className={`text-center p-8 rounded-lg ${attempt.passed ? "bg-green-500/10" : "bg-red-500/10"}`}>
          {attempt.passed ? <Trophy className="h-16 w-16 mx-auto text-green-500 mb-4" /> : <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />}
          <h2 className="text-2xl font-bold mb-2">{attempt.passed ? "Congratulations!" : "Keep Trying!"}</h2>
          <p className="text-lg mb-4">
            You scored <span className="font-bold">{attempt.score}%</span>
            {!attempt.passed && ` (${attempt.passingScore}% required to pass)`}
          </p>
          <Badge variant={attempt.passed ? "default" : "destructive"} className="text-lg px-4 py-1">
            {attempt.passed ? "PASSED" : "NOT PASSED"}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review Your Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.questions.map((question, index) => {
              const userAnswer = attempt.answers[index];
              const isCorrect = attempt.correctness[index];
              const correctAnswer = review?.[index]?.correctAnswer;
              const explanation = review?.[index]?.explanation;
              return (
                <div key={question.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-500 mt-0.5" />}
                    <p className="font-medium">{index + 1}. {question.question}</p>
                  </div>
                  <div className="ml-7 space-y-2">
                    {question.options.map((option, optIndex) => {
                      const isUserAnswer = optIndex === userAnswer;
                      const isCorrectAnswer = correctAnswer !== undefined && optIndex === correctAnswer;
                      return (
                        <div
                          key={optIndex}
                          className={`p-2 rounded ${
                            isCorrectAnswer || (isUserAnswer && isCorrect)
                              ? "bg-green-500/10 border border-green-500"
                              : isUserAnswer
                                ? "bg-red-500/10 border border-red-500"
                                : "bg-muted"
                          }`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                          {option}
                          {isCorrectAnswer && <Badge className="ml-2 bg-green-500">Correct</Badge>}
                          {isUserAnswer && !isCorrect && <Badge className="ml-2" variant="destructive">Your Answer</Badge>}
                        </div>
                      );
                    })}
                    {explanation && <p className="text-sm text-muted-foreground mt-2 italic">{explanation}</p>}
                  </div>
                </div>
              );
            })}
            {!attempt.passed && (
              <p className="text-sm text-muted-foreground">Correct answers are shown once you pass.</p>
            )}
          </CardContent>
        </Card>

        {!attempt.passed && (
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
  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{quiz.title}</h2>
          <Badge variant="secondary">Question {currentQuestionIndex + 1} of {quiz.questions.length}</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">Passing score: {quiz.passingScore}%</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-6">{currentQuestion.question}</h3>
          <RadioGroup value={answers[currentQuestionIndex]?.toString()} onValueChange={(value) => handleAnswerSelect(parseInt(value))}>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[currentQuestionIndex] === index ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestionIndex
                  ? "bg-primary text-primary-foreground"
                  : answers[index] !== null
                    ? "bg-green-500 text-white"
                    : "bg-muted hover:bg-muted-foreground/20"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button onClick={() => void handleSubmit()} disabled={!allAnswered || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Quiz<ArrowRight className="h-4 w-4 ml-2" /></>}
          </Button>
        ) : (
          <Button onClick={() => setCurrentQuestionIndex((i) => i + 1)}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
