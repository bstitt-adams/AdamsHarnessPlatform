"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  BookOpen,
  ArrowRight,
  Loader2,
  Mail,
  Download,
} from "lucide-react";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<{
    email: string;
    courses: string[];
    total: number;
  } | null>(null);

  useEffect(() => {
    // In production, you would verify the session with Stripe
    // and fetch the order details from your database
    const timer = setTimeout(() => {
      setLoading(false);
      // Mock order details for now
      setOrderDetails({
        email: "customer@example.com",
        courses: ["Course purchased successfully"],
        total: 0,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container max-w-2xl py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Processing your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-16">
      <Card className="text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base">
            Thank you for your purchase. You now have access to your courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Confirmation */}
          <div className="bg-muted/50 rounded-lg p-4 text-left">
            <h3 className="font-semibold mb-2">What's Next?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-primary" />
                <span>A confirmation email has been sent to your email address</span>
              </li>
              <li className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 mt-0.5 text-primary" />
                <span>Your courses are now available in your learning dashboard</span>
              </li>
              <li className="flex items-start gap-2">
                <Download className="h-4 w-4 mt-0.5 text-primary" />
                <span>You can download any course materials immediately</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/academy/my-courses">
                <BookOpen className="mr-2 h-5 w-5" />
                Start Learning
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/academy">
                Browse More Courses
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Session ID for reference */}
          {sessionId && (
            <p className="text-xs text-muted-foreground">
              Order Reference: {sessionId.slice(0, 20)}...
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
      <div className="container max-w-2xl py-16">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
