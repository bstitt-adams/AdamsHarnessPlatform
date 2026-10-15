"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCourseCart } from "@/contexts/course-cart-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  BookOpen, 
  ArrowRight,
  Loader2,
  PartyPopper
} from "lucide-react";
import confetti from "canvas-confetti";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCourseCart();
  const [isVerifying, setIsVerifying] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Clear the cart on successful checkout
    clearCart();
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Simulate verification delay
    const timer = setTimeout(() => {
      setIsVerifying(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [clearCart]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Verifying your purchase...</h2>
          <p className="text-muted-foreground">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <PartyPopper className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold">Payment Successful!</h1>
              <PartyPopper className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your enrollment has been confirmed.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground mb-1">
              A confirmation email has been sent to your email address.
            </p>
            <p className="text-sm text-muted-foreground">
              You can now access your courses from your dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" size="lg" asChild>
              <Link href="/portal/my-courses">
                <BookOpen className="h-5 w-5 mr-2" />
                Go to My Courses
              </Link>
            </Button>
            
            <Button variant="outline" className="w-full" asChild>
              <Link href="/academy/courses">
                Browse More Courses
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {sessionId && (
            <p className="text-xs text-muted-foreground mt-6">
              Order ID: {sessionId.slice(0, 20)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
