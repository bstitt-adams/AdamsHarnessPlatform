/**
 * Validate site calendar PIN
 * POST /api/site-calendars/validate-pin
 * Body: { slug, pin }
 *
 * Uses the Firestore REST API so this route works on Vercel without a
 * server-side service account key. Public read access is allowed by the
 * Firestore security rules.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const validateSchema = z.object({
  slug: z.string().min(1),
  pin: z.string().min(4).max(4),
});

interface FirestoreDocument {
  name?: string;
  fields?: Record<string, { stringValue?: string }>;
}

function getPinFromDoc(doc: FirestoreDocument): string | undefined {
  return doc.fields?.pin?.stringValue;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, pin } = validateSchema.parse(body);

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) {
      return NextResponse.json(
        { valid: false, error: "Firebase configuration missing" },
        { status: 500 }
      );
    }

    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/siteCalendars/${encodeURIComponent(
      slug
    )}?key=${encodeURIComponent(apiKey)}`;

    const firestoreRes = await fetch(url);

    if (!firestoreRes.ok) {
      if (firestoreRes.status === 404) {
        return NextResponse.json(
          { valid: false, error: "Site not found" },
          { status: 404 }
        );
      }
      const errorText = await firestoreRes.text();
      console.error("Firestore REST error:", firestoreRes.status, errorText);
      return NextResponse.json(
        { valid: false, error: "Failed to load site calendar" },
        { status: 500 }
      );
    }

    const doc: FirestoreDocument = await firestoreRes.json();
    const storedPin = getPinFromDoc(doc);

    if (!storedPin) {
      return NextResponse.json(
        { valid: false, error: "PIN not configured for this site" },
        { status: 500 }
      );
    }

    if (storedPin !== pin) {
      return NextResponse.json(
        { valid: false, error: "Invalid PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true, siteId: slug });
  } catch (error) {
    console.error("Error validating PIN:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
