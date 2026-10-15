"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { BilingualText } from "@/components/shared/bilingual-text";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

interface PasswordGateProps {
  storageKey: string;
  siteName?: string | null;
  title?: string;
  subtitle?: string;
  subtitleEs?: string;
  onAuthenticated: () => void;
}

export function PasswordGate({
  storageKey,
  siteName,
  title = "Calendar Access",
  subtitle = "Enter the credentials to continue.",
  subtitleEs = "Ingrese las credenciales para continuar.",
  onAuthenticated,
}: PasswordGateProps) {
  const [phase, setPhase] = useState<"splash" | "login">("splash");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPhase("login"), 2500);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (!auth) throw new Error("Authentication service unavailable");
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem(`password-gate-auth-${storageKey}`, "true");
      onAuthenticated();
    } catch {
      toast.error("Invalid email or password");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-white to-[#F4F7FA] p-4">
      <AnimatePresence mode="wait">
        {phase === "splash" ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center cursor-pointer"
            onClick={() => setPhase("login")}
          >
            <motion.div
              animate={{ scale: [1, 1.04, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/images/adamselectric_logo.png"
                alt="Adams Electric"
                width={240}
                height={120}
                className="object-contain"
                priority
              />
            </motion.div>
            {siteName && (
              <h1 className="mt-6 text-2xl md:text-3xl font-bold text-[#003A65]">{siteName}</h1>
            )}
            {subtitle && (
              <p className="mt-2 text-muted-foreground text-sm">
                <BilingualText en={subtitle} es={subtitleEs} />
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
                <CardTitle className="text-2xl text-[#003A65]">{title}</CardTitle>
                <CardDescription>
                  <BilingualText en={subtitle} es={subtitleEs} />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gate-email">
                      <BilingualText en="Email" es="Correo electrónico" />
                    </Label>
                    <Input
                      id="gate-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="jeff@ae.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gate-password">
                      <BilingualText en="Password" es="Contraseña" />
                    </Label>
                    <Input
                      id="gate-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#005A9C] hover:bg-[#003A65]"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        <BilingualText en="Sign In" es="Iniciar sesión" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
