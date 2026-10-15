"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { quizQuestions, quizAnswers } from "@/lib/adams-quiz";

export default function QuizPage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
  const isFirstQuestion = currentQuestion === 0;
  const isLastQuestion = currentQuestion === quizQuestions.length - 1;
  const hasAnswered = answers[question.id] !== undefined;

  const handleAnswer = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: parseInt(value),
    }));
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      // Store answers in sessionStorage and navigate to results
      sessionStorage.setItem("quizAnswers", JSON.stringify(answers));
      router.push("/quiz/results");
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-xl font-bold text-white">L</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Adams IQ Assessment
            </h1>
          </div>
          <p className="text-lg text-blue-400 font-medium">
            "Is Your Business Built to Last Beyond You?"
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Discover your business sustainability score in 10 questions
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>Question {currentQuestion + 1} of {quizQuestions.length}</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-700" />
        </div>

        {/* Question Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold mb-8 text-white">
              <span className="text-blue-500">Q{question.id}:</span>{" "}
              {question.question}
            </h2>

            <RadioGroup
              value={answers[question.id]?.toString() || ""}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {quizAnswers.map((answer) => (
                <div key={answer.value}>
                  <Label
                    htmlFor={`answer-${answer.value}`}
                    className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                      answers[question.id] === answer.value
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-600 hover:border-slate-500 bg-slate-800/50"
                    }`}
                  >
                    <RadioGroupItem
                      value={answer.value.toString()}
                      id={`answer-${answer.value}`}
                      className="border-slate-500 text-blue-500"
                    />
                    <span className="text-white">{answer.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={isFirstQuestion}
                className={`text-gray-400 hover:text-white ${
                  isFirstQuestion ? "opacity-50" : ""
                }`}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <Button
                onClick={handleNext}
                disabled={!hasAnswered}
                className={`bg-blue-600 hover:bg-blue-700 text-white ${
                  !hasAnswered ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isLastQuestion ? "Get My Results" : "Next Question"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🔒 Your responses are confidential and used only to generate your personalized report.</p>
        </div>
      </div>
    </div>
  );
}
