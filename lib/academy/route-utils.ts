import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth/server-auth";
import { httpErrorResponse, serializeDoc } from "@/lib/adams-harness/server-store";

export function academyErrorResponse(error: unknown, fallback: string) {
  const auth = authErrorResponse(error);
  if (auth) return auth;
  const http = httpErrorResponse(error);
  if (http) return http;
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Recursively convert Firestore Timestamps to ISO strings for JSON responses. */
export function toJson<T>(value: T): T {
  return serializeDoc(value as never) as T;
}
