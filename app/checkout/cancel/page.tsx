"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  XCircle, 
  ShoppingCart, 
  ArrowLeft,
  HelpCircle
} from "lucide-react";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
            <p className="text-muted-foreground">
              Your payment was cancelled. No charges were made to your account.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              Your cart items have been saved. You can return to checkout whenever you're ready.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-slate-900" size="lg" asChild>
              <Link href="/academy/courses">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Return to Courses
              </Link>
            </Button>
            
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Having trouble with checkout?
            </p>
            <Button variant="link" size="sm" asChild>
              <Link href="/contact">
                <HelpCircle className="h-4 w-4 mr-1" />
                Contact Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
