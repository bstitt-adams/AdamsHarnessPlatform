"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { auth, reconnectFirestore } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { findAndLinkTeamMember } from "@/lib/auth-team-member-link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const demoLoginEnabled = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  const handleDemoLogin = (role: "admin" | "user") => {
    if (!demoLoginEnabled) return;
    const demo = role === "admin"
      ? { email: "demo-admin@adams-electric.com", name: "Demo Admin", teamMemberId: "demo-admin", userRole: "admin" }
      : { email: "demo-user@adams-electric.com", name: "Demo User", teamMemberId: "demo-user", userRole: "team" };
    sessionStorage.setItem("adams_authenticated", "true");
    sessionStorage.setItem("adams_user_email", demo.email);
    sessionStorage.setItem("adams_user_name", demo.name);
    sessionStorage.setItem("adams_team_member_id", demo.teamMemberId);
    sessionStorage.setItem("adams_user_role", demo.userRole);
    sessionStorage.setItem("adams_demo_role", demo.userRole);
    router.replace("/portal");
  };

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("adams_remembered_email");
    const savedRememberMe = localStorage.getItem("adams_remember_me") === "true";
    
    if (savedEmail && savedRememberMe) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Save or clear remembered credentials
      if (rememberMe) {
        localStorage.setItem("adams_remembered_email", email);
        localStorage.setItem("adams_remember_me", "true");
      } else {
        localStorage.removeItem("adams_remembered_email");
        localStorage.removeItem("adams_remember_me");
      }

      if (!email || !password) {
        setError("Please enter both email and password");
        setIsLoading(false);
        return;
      }

      let firebaseUid: string | null = null;
      let userName: string | null = null;

      // Try Firebase Auth sign-in if available
      if (auth) {
        try {
          console.log("Attempting Firebase sign-in for:", email);
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          firebaseUid = userCredential.user.uid;
          userName = userCredential.user.displayName;
          console.log("Firebase sign-in successful");

          // Synchronize the authenticated Firebase user with the Team Member role
          // so server APIs and Firestore rules use the same authority.
          try {
            const idToken = await userCredential.user.getIdToken();
            const syncResponse = await fetch("/api/auth/sync-team-member", {
              method: "POST",
              headers: { Authorization: `Bearer ${idToken}` },
            });
            const syncResult = await syncResponse.json().catch(() => ({}));
            if (!syncResponse.ok || !syncResult.linked) {
              if (process.env.NODE_ENV === "production") {
                await signOut(auth);
                setError("Your account is not linked to an active Adams Electric Team Member record.");
                setIsLoading(false);
                return;
              }
              console.warn("Team Member role synchronization failed");
            }
          } catch (syncError) {
            console.warn("Team Member role synchronization failed:", syncError);
          }

          // Refresh the client-side Team Member link without blocking sign-in.
          const userEmail = email;
          const userUid = firebaseUid;
          setTimeout(async () => {
            try {
              await reconnectFirestore();
              const teamMember = await findAndLinkTeamMember(userEmail, userUid);
              if (teamMember) {
                console.log(`Linked to Team Member: ${teamMember.firstName} ${teamMember.lastName}`);
                sessionStorage.setItem("adams_team_member_id", teamMember.id);
                sessionStorage.setItem("adams_user_role", teamMember.role);
                sessionStorage.setItem("adams_user_name", `${teamMember.firstName} ${teamMember.lastName}`);
              }
            } catch (linkError) {
              console.warn("Team member linking failed (non-blocking):", linkError);
            }
          }, 100);
        } catch (authError: any) {
          console.error("Firebase Auth error:", authError.code, authError.message);
          // Handle specific Firebase Auth errors
          if (authError.code === "auth/user-not-found") {
            setError("No account found with this email. Please sign up first.");
            setIsLoading(false);
            return;
          }
          if (authError.code === "auth/wrong-password" || authError.code === "auth/invalid-credential") {
            setError("Invalid email or password. Please try again.");
            setIsLoading(false);
            return;
          }
          if (authError.code === "auth/too-many-requests") {
            setError("Too many failed attempts. Please try again later or reset your password.");
            setIsLoading(false);
            return;
          }
          if (authError.code === "auth/network-request-failed") {
            setError("Network error. Please check your connection and try again.");
            setIsLoading(false);
            return;
          }
          // For any other error, show a generic message
          setError(`Sign in failed: ${authError.message || "Please try again."}`);
          setIsLoading(false);
          return;
        }
      } else {
        console.warn("Firebase Auth not initialized - check your environment variables");
        setError("Authentication service not available. Please contact support.");
        setIsLoading(false);
        return;
      }

      // Store session info
      sessionStorage.setItem("adams_authenticated", "true");
      sessionStorage.setItem("adams_user_email", email);
      if (firebaseUid) {
        sessionStorage.setItem("adams_firebase_uid", firebaseUid);
      }
      if (userName) {
        sessionStorage.setItem("adams_user_name", userName);
      }
      
      console.log("Sign-in complete, redirecting to portal...");
      
      // Redirect to portal - use replace to prevent back button issues
      router.replace("/portal");
      return; // Exit early to prevent finally from setting isLoading to false
    } catch (err) {
      console.error("Sign-in error:", err);
      setError("An error occurred during sign in. Please try again.");
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

        {/* Sign In Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
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
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-[#0072BC] to-[#a08840] hover:from-[#b89841] hover:to-[#907830] text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-900 px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full h-11"
              onClick={() => {
                // Microsoft SSO would go here
                router.push("/api/auth/microsoft");
              }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21" fill="none">
                <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
                <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
                <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
                <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
            </Button>

            {demoLoginEnabled && (
              <div className="w-full rounded-lg border border-dashed p-3">
                <p className="mb-2 text-center text-xs text-muted-foreground">Development demo access</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => handleDemoLogin("admin")}>Login as admin</Button>
                  <Button type="button" variant="secondary" onClick={() => handleDemoLogin("user")}>Login as user</Button>
                </div>
              </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
