"use client";

import { auth } from "@/lib/firebase";

export async function adamsFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error("Not signed in");
  }
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(path, { ...init, headers });
}

export async function adamsFetchJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await adamsFetch(path, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : `Request failed (${response.status})`,
    );
  }
  return data as T;
}
