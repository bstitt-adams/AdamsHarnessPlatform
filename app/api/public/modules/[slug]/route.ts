import { NextRequest, NextResponse } from "next/server";
import { getDb, serializeDoc } from "@/lib/adams-harness/server-store";
import { listAllAvailableModules, getModuleAppSettings } from "@/lib/modules/dynamic-catalog";
import { GENERATED_MODULES } from "@/modules/generated/registry";
import { COLLECTIONS } from "@/lib/schema";
import type { ModuleRecordDoc } from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ slug: string }> };

function extractApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) return headerKey;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer) return bearer;
  const queryKey = new URL(request.url).searchParams.get("apiKey")?.trim();
  return queryKey || null;
}

async function resolvePublicEndpoint(slug: string, method: "GET" | "POST" | "PATCH", apiKey: string | null) {
  if (!apiKey) return null;
  const dynamicModules = await listAllAvailableModules();
  const definition =
    GENERATED_MODULES.find((m) => m.slug === slug) ||
    dynamicModules.find((m) => m.slug === slug);
  if (!definition) return null;

  const settings = await getModuleAppSettings(definition);
  const endpoint = settings.apiEndpoints.find(
    (ep) => ep.enabled && ep.apiKey === apiKey && ep.methods.includes(method)
  );
  if (!endpoint) return null;
  return { definition, endpoint };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const apiKey = extractApiKey(request);
    const resolved = await resolvePublicEndpoint(slug, "GET", apiKey);
    if (!resolved) {
      return NextResponse.json(
        { error: "Unauthorized or endpoint not enabled for GET" },
        { status: 401 }
      );
    }

    const { definition, endpoint } = resolved;
    const db = getDb();
    const snapshot = await db
      .collection(COLLECTIONS.MODULE_RECORDS)
      .where("moduleSlug", "==", definition.slug)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    const records = snapshot.docs.map((docSnap) => {
      const rec = serializeDoc({ id: docSnap.id, ...docSnap.data() } as ModuleRecordDoc);
      const filteredData: Record<string, unknown> = {};
      if (endpoint.exposedFields.length === 0) {
        Object.assign(filteredData, rec.data);
      } else {
        for (const field of endpoint.exposedFields) {
          if (field in (rec.data || {})) {
            filteredData[field] = rec.data[field];
          }
        }
      }
      return {
        id: rec.id,
        status: rec.status,
        data: filteredData,
        extendedData: rec.extendedData ?? {},
        notes: rec.notes ?? "",
        dueAt: rec.dueAt,
        createdAt: rec.createdAt,
        updatedAt: rec.updatedAt,
      };
    });

    return NextResponse.json({
      module: definition.slug,
      endpoint: endpoint.name,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error("Public module API GET error:", error);
    return NextResponse.json({ error: "Failed to fetch module records" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const apiKey = extractApiKey(request);
    const resolved = await resolvePublicEndpoint(slug, "POST", apiKey);
    if (!resolved) {
      return NextResponse.json(
        { error: "Unauthorized or endpoint not enabled for POST" },
        { status: 401 }
      );
    }

    const { definition, endpoint } = resolved;
    const body = (await request.json().catch(() => ({}))) as {
      data?: Record<string, string | number | boolean | null>;
      extendedData?: Record<string, string | number | boolean | null>;
      notes?: string;
    };

    const primaryRecordType = definition.recordTypes[0];
    const primaryForm = definition.forms[0];
    const db = getDb();
    const ref = db.collection(COLLECTIONS.MODULE_RECORDS).doc();
    const now = new Date();

    const record = {
      id: ref.id,
      moduleSlug: definition.slug,
      recordTypeId: primaryRecordType?.id || "solution_item",
      formId: primaryForm?.id || "create_item",
      departmentId: definition.departmentId,
      data: body.data || {},
      extendedData: body.extendedData || {},
      notes: body.notes || "",
      status: "active" as const,
      evidencePaths: [],
      version: 1,
      createdByUid: `api:${endpoint.id}`,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(record);
    return NextResponse.json({ ok: true, recordId: ref.id, record }, { status: 201 });
  } catch (error) {
    console.error("Public module API POST error:", error);
    return NextResponse.json({ error: "Failed to create module record" }, { status: 500 });
  }
}
