"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, clearIndexedDbPersistence, terminate, type Firestore } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, type SiteCalendarDoc } from "@/lib/schema";

const CACHE_CLEARED_KEY = "adams-calendar-cache-cleared";

export interface UseSiteCalendarsResult {
  sites: SiteCalendarDoc[];
  loading: boolean;
  error: string | null;
}

export function useSiteCalendars(): UseSiteCalendarsResult {
  const [sites, setSites] = useState<SiteCalendarDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError("Firestore not initialized");
      return;
    }

    const q = query(collection(db, COLLECTIONS.SITECALENDARS), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SiteCalendarDoc);
        setSites(data);
        setLoading(false);
        setError(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(CACHE_CLEARED_KEY);
        }
      },
      (err) => {
        const errorCode = (err as { code?: string }).code ?? "unknown";
        const errorMessage = (err as { message?: string }).message ?? String(err);
        console.error("Error loading site calendars:", errorCode, errorMessage);
        setError(`Failed to load site calendars (${errorCode})`);
        setLoading(false);

        if (errorCode === "permission-denied" && typeof window !== "undefined") {
          const alreadyCleared = window.localStorage.getItem(CACHE_CLEARED_KEY);
          if (!alreadyCleared && db) {
            const firestore = db as Firestore;
            window.localStorage.setItem(CACHE_CLEARED_KEY, "true");
            terminate(firestore)
              .then(() => clearIndexedDbPersistence(firestore))
              .then(() => window.location.reload())
              .catch((clearErr) => console.error("Failed to clear Firestore cache:", clearErr));
          }
        }
      }
    );

    return () => unsubscribe();
  }, []);

  return { sites, loading, error };
}
