"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, CheckCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In production, this would call your password reset API
      if (email) {
        setIsSubmitted(true);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-200/50 dark:bg-grid-slate-700/25 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex flex-col items-center gap-3 group">
            <Image
              src="/images/adamselectric_logo.png"
              alt="Adams Electric"
              width={200}
              height={67}
              className="h-16 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Forgot Password Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
                <CardDescription className="text-center">
                  Enter your email address and we&apos;ll send you a link to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-to-r from-[#0072BC] to-[#a08840] hover:from-[#b89841] hover:to-[#907830] text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Check Your Email</h3>
                <p className="text-muted-foreground">
                  We&apos;ve sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-primary hover:underline"
                  >
                    try again
                  </button>
                </p>
              </div>
            </CardContent>
          )}
          <CardFooter className="pt-0">
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/sign-in">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
