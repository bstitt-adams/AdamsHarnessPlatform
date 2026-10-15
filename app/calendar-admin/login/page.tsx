"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";


export default function CalendarAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(() => Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/calendar-admin");
      } else {
        setChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    if (!auth) {
      toast.error("Authentication not available");
      setLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in");
      router.replace("/calendar-admin");
    } catch (error) {
      console.error(error);
      toast.error("Invalid email or password");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#005A9C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-[#F4F7FA] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/images/adamselectric_logo.png"
                alt="Adams Electric"
                width={160}
                height={80}
                className="object-contain"
                priority
              />
            </div>
            <CardTitle className="text-2xl text-[#003A65]">Safety Calendar Admin</CardTitle>
            <CardDescription>Sign in to manage site calendars</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@adamselectric.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#005A9C] hover:bg-[#003A65]"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" /> Sign In
                  </>
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
