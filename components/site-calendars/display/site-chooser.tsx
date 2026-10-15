"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSiteCalendars } from "@/components/site-calendars/use-site-calendars";
import { SiteCard } from "@/components/site-calendars/display/site-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BilingualText } from "@/components/shared/bilingual-text";
import { Loader2, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type { SiteCalendarDoc } from "@/lib/schema";

const STORAGE_KEY = "adams-calendar-unlocked";

export function SiteChooser() {
  const router = useRouter();
  const { sites, loading, error } = useSiteCalendars();
  const [showIntro, setShowIntro] = useState(true);
  const [selectedSite, setSelectedSite] = useState<SiteCalendarDoc | null>(null);
  const [pin, setPin] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2800);
    return () => clearTimeout(timer);
  }, []);

  function isUnlocked(slug: string): boolean {
    if (typeof window === "undefined") return false;
    const unlocked = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(unlocked) && unlocked.includes(slug);
  }

  function markUnlocked(slug: string) {
    if (typeof window === "undefined") return;
    const unlocked = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!unlocked.includes(slug)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked, slug]));
    }
  }

  async function handleSiteClick(site: SiteCalendarDoc) {
    if (isUnlocked(site.slug)) {
      router.push(`/site-calendar/${site.slug}`);
      return;
    }
    setSelectedSite(site);
    setPin("");
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSite || pin.length !== 4) return;

    setValidating(true);
    try {
      const response = await fetch("/api/site-calendars/validate-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSite.slug, pin }),
      });
      const result = await response.json();

      if (result.valid) {
        markUnlocked(selectedSite.slug);
        toast.success("PIN accepted");
        router.push(`/site-calendar/${selectedSite.slug}`);
      } else {
        toast.error("Invalid PIN. Please try again.");
        setPin("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not validate PIN");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-[#F4F7FA] flex flex-col">
      {/* Admin link */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="sm" asChild className="text-[#005A9C]">
          <a href="/calendar-admin/login">Calendar Admin</a>
        </Button>
      </div>

      {/* Logo intro */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-[#005A9C]/20 blur-3xl rounded-full" />
              <Image
                src="/images/adamselectric_logo.png"
                alt="Adams Electric"
                width={280}
                height={140}
                className="relative z-10 object-contain mix-blend-multiply"
                priority
                unoptimized
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chooser */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: showIntro ? 0 : 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex-1 flex flex-col items-center justify-center px-4 py-12"
      >
        <div className="max-w-4xl w-full">
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <Image
                src="/images/adamselectric_logo.png"
                alt="Adams Electric"
                width={200}
                height={100}
                className="object-contain"
                priority
                unoptimized
              />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#003A65] mb-3">
              <BilingualText
                en="Safety Office Calendar"
                es="Calendario de la Oficina de Seguridad"
              />
            </h1>
            <p className="text-muted-foreground text-lg">
              <BilingualText
                en="Select a job site to view its calendar"
                es="Seleccione un sitio de trabajo para ver su calendario"
              />
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#005A9C]" />
            </div>
          ) : error ? (
            <p className="text-center text-destructive">{error}</p>
          ) : sites.length === 0 ? (
            <p className="text-center text-muted-foreground">
              <BilingualText en="No site calendars found." es="No se encontraron calendarios del sitio." />
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.map((site, index) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  index={index}
                  onClick={() => handleSiteClick(site)}
                />
              ))}
            </div>
          )}
        </div>
      </motion.main>

      {/* PIN dialog */}
      <Dialog open={!!selectedSite} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <BilingualText en="Enter PIN" es="Ingrese el PIN" />
            </DialogTitle>
            <DialogDescription>
              <BilingualText
                en={`Enter the 4-digit PIN for ${selectedSite?.name}.`}
                es={`Ingrese el PIN de 4 d\u00EDgitos para ${selectedSite?.name}.`}
              />
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePinSubmit} className="space-y-4 mt-2">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              className="text-center text-2xl tracking-[0.5em]"
              autoFocus
            />
            <Button
              type="submit"
              className="w-full bg-[#005A9C] hover:bg-[#003A65]"
              disabled={pin.length !== 4 || validating}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BilingualText en="View Calendar" es="Ver Calendario" /> <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
