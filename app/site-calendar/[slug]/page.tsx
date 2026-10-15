"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type SiteCalendarDoc, type SiteCalendarItemDoc } from "@/lib/schema";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, MapPin, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PasswordGate } from "@/components/shared/password-gate";
import { BilingualText } from "@/components/shared/bilingual-text";
import {
  getCalendarTitleEs,
  getCalendarDescriptionEs,
} from "@/components/site-calendars/calendar-translations";

type View = "day" | "agenda";

export default function SiteCalendarDisplayPage() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<SiteCalendarDoc | null>(null);
  const [items, setItems] = useState<SiteCalendarItemDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("day");
  const [today, setToday] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setSelectedDate(now);
    setCurrentMonth(now);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    try {
      const unlocked = JSON.parse(localStorage.getItem("adams-calendar-unlocked") || "[]");
      if (Array.isArray(unlocked) && unlocked.includes(slug)) setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!authenticated) return;
    const timer = setInterval(() => {
      setView((current) => (current === "day" ? "agenda" : "day"));
    }, 10000);
    return () => clearInterval(timer);
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated || !db || !slug) return;
    const firestore = db;

    let unsubscribe: (() => void) | undefined;

    async function loadSite() {
      const siteSnap = await getDoc(doc(firestore, COLLECTIONS.SITECALENDARS, slug));
      if (!siteSnap.exists()) {
        setLoading(false);
        return;
      }

      const siteData = { id: siteSnap.id, ...siteSnap.data() } as SiteCalendarDoc;
      setSite(siteData);

      const itemsQuery = query(
        collection(firestore, COLLECTIONS.SITECALENDARITEMS),
        where("siteId", "==", siteSnap.id),
        orderBy("date", "asc"),
        orderBy("order", "asc")
      );

      unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SiteCalendarItemDoc);
        setItems(data);
        setLoading(false);
      });
    }

    loadSite();
    return () => unsubscribe?.();
  }, [authenticated, slug]);

  const weekDays = useMemo<Date[]>(() => {
    if (!today) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, [today]);

  function itemsForDate(date: Date) {
    return items.filter((item) => isSameDay(item.date.toDate(), date));
  }

  const miniCalendarDays = useMemo<Date[]>(() => {
    if (!currentMonth) return [];
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  if (!authenticated) {
    return (
      <PasswordGate
        storageKey={slug}
        siteName={site?.name}
        title="Calendar Access"
        subtitle="Enter the credentials to view the safety office calendar."
        onAuthenticated={() => setAuthenticated(true)}
      />
    );
  }

  if (loading || !today || !site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FA]">
        {loading ? (
          <Loader2 className="h-10 w-10 animate-spin text-[#005A9C]" />
        ) : (
          <p className="text-muted-foreground">Site not found.</p>
        )}
      </div>
    );
  }

  const selectedItems = selectedDate ? itemsForDate(selectedDate) : [];

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-6 md:p-10">
      <div className="mb-4">
        <a href="/calendar-admin/login" className="text-sm text-[#005A9C] hover:underline">
          Calendar Admin
        </a>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-6 mb-8">
          <Image
            src="/images/adamselectric_logo.png"
            alt="Adams Electric"
            width={180}
            height={90}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#003A65]">{site.name}</h1>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              <BilingualText en="Safety Office Calendar" es="Calendario de la Oficina de Seguridad" />
            </p>
          </div>
        </div>

        <div className="relative min-h-[600px]">
          <AnimatePresence mode="wait">
            {view === "day" ? (
              <motion.div
                key="day"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-[#003A65]">
                        {currentMonth ? format(currentMonth, "MMMM yyyy") : ""}
                      </h2>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => currentMonth && setCurrentMonth(subMonths(currentMonth, 1))}
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="h-5 w-5 text-[#005A9C]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => currentMonth && setCurrentMonth(addMonths(currentMonth, 1))}
                          aria-label="Next month"
                        >
                          <ChevronRight className="h-5 w-5 text-[#005A9C]" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                      {["S", "M", "T", "W", "T", "F", "S"].map((label) => (
                        <div key={label}>{label}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {miniCalendarDays.map((day) => {
                        const selected = selectedDate ? isSameDay(day, selectedDate) : false;
                        const todayFlag = isToday(day);
                        const inMonth = currentMonth ? isSameMonth(day, currentMonth) : false;
                        const dayItems = itemsForDate(day);
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => setSelectedDate(day)}
                            className={cn(
                              "aspect-square rounded-lg flex flex-col items-center justify-center relative text-sm transition-colors",
                              !inMonth && "text-muted-foreground/40",
                              todayFlag && !selected && "bg-accent text-accent-foreground",
                              selected && "bg-[#005A9C] text-white shadow"
                            )}
                            aria-label={format(day, "MMMM d, yyyy")}
                          >
                            <span>{format(day, "d")}</span>
                            {dayItems.length > 0 && (
                              <span
                                className={cn(
                                  "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                                  selected ? "bg-white" : "bg-[#005A9C]"
                                )}
                                aria-hidden="true"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-2xl font-bold text-[#003A65] mb-4">
                      {selectedDate && (
                        <BilingualText
                          en={format(selectedDate, "EEEE, MMMM d")}
                          es={format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                        />
                      )}
                    </h2>
                    <div className="space-y-4">
                      {selectedItems.length === 0 ? (
                        <p className="text-muted-foreground">
                          <BilingualText en="No events for this day." es="No hay eventos para este día." />
                        </p>
                      ) : (
                        selectedItems.map((item) => (
                          <div key={item.id} className="bg-[#F4F7FA] rounded-lg p-4 border-l-4 border-[#005A9C]">
                            <div className="font-bold text-lg text-[#003A65]">{item.title}</div>
                            {(item.titleEs || getCalendarTitleEs(item.title)) && (
                              <div className="text-base text-[#005A9C]/80 italic mt-0.5">
                                {item.titleEs || getCalendarTitleEs(item.title)}
                              </div>
                            )}
                            {item.time && (
                              <div className="text-sm text-[#005A9C] font-medium mt-1 flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {item.time}
                              </div>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{item.description}</p>
                            )}
                            {(item.descriptionEs || getCalendarDescriptionEs(item.description)) && (
                              <p className="text-sm text-[#005A9C]/70 mt-1 whitespace-pre-wrap italic">
                                {item.descriptionEs || getCalendarDescriptionEs(item.description)}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="agenda"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl font-bold text-[#003A65] mb-6">
                    <BilingualText en="Weekly Agenda" es="Agenda Semanal" />
                  </h2>
                  <div className="space-y-6">
                    {weekDays.map((day) => {
                      const dayItems = itemsForDate(day);
                      return (
                        <div key={day.toISOString()} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                          <h3 className="text-lg font-bold text-[#005A9C] mb-3">
                            <BilingualText
                              en={format(day, "EEEE, MMMM d")}
                              es={format(day, "EEEE, d 'de' MMMM", { locale: es })}
                            />
                          </h3>
                          <div className="space-y-3">
                            {dayItems.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                <BilingualText en="No events scheduled." es="No hay eventos programados." />
                              </p>
                            ) : (
                              dayItems.map((item) => (
                                <div key={item.id} className="bg-[#F4F7FA] rounded-lg p-4">
                                  <div className="font-bold text-[#003A65]">{item.title}</div>
                                  {(item.titleEs || getCalendarTitleEs(item.title)) && (
                                    <div className="text-base text-[#005A9C]/80 italic mt-0.5">
                                      {item.titleEs || getCalendarTitleEs(item.title)}
                                    </div>
                                  )}
                                  {item.time && (
                                    <div className="text-sm text-[#005A9C] font-medium mt-1 flex items-center gap-1">
                                      <Clock className="h-4 w-4" /> {item.time}
                                    </div>
                                  )}
                                  {item.description && (
                                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{item.description}</p>
                                  )}
                                  {(item.descriptionEs || getCalendarDescriptionEs(item.description)) && (
                                    <p className="text-sm text-[#005A9C]/70 mt-1 whitespace-pre-wrap italic">
                                      {item.descriptionEs || getCalendarDescriptionEs(item.description)}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setView("day")}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors",
              view === "day" ? "bg-[#005A9C]" : "bg-[#005A9C]/30"
            )}
            aria-label="Show day view"
          />
          <button
            onClick={() => setView("agenda")}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-colors",
              view === "agenda" ? "bg-[#005A9C]" : "bg-[#005A9C]/30"
            )}
            aria-label="Show agenda view"
          />
        </div>
      </motion.div>
    </div>
  );
}
