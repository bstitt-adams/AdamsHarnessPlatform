import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  getDb,
  httpErrorResponse,
  HttpError,
} from "@/lib/adams-harness/server-store";
import { getAuthorizedModule } from "@/lib/modules/runtime";
import { getModuleAppSettings } from "@/lib/modules/dynamic-catalog";
import { COLLECTIONS } from "@/lib/schema";

type Ctx = { params: Promise<{ slug: string }> };

const customMetricSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  aggregation: z.enum([
    "count",
    "completed_rate",
    "overdue_count",
    "active_count",
    "field_sum",
  ]),
  fieldId: z.string().max(100).optional(),
  filterStatus: z.enum(["active", "completed", "archived"]).optional(),
  promptUsed: z.string().max(1000).optional(),
});

const chartConfigSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  chartType: z.enum(["bar", "line", "pie", "area"]),
  groupByField: z.string().min(1).max(100),
  metric: z.enum(["count", "sum", "avg"]),
  valueField: z.string().max(100).optional(),
  aiRecommended: z.boolean().optional(),
  promptUsed: z.string().max(1000).optional(),
});

const triggerRuleSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  enabled: z.boolean(),
  event: z.enum(["record_created", "record_updated", "status_completed", "overdue"]),
  conditionField: z.string().max(100).optional(),
  conditionOperator: z.enum(["equals", "contains", "not_empty"]).optional(),
  conditionValue: z.string().max(500).optional(),
  actionType: z.enum([
    "in_app_notification",
    "telegram_notification",
    "teams_notification",
    "webhook",
    "auto_assign",
    "mark_completed",
  ]),
  targetRecipient: z.string().max(200).optional(),
  messageTemplate: z.string().min(1).max(2000),
  webhookUrl: z.string().max(1000).optional(),
  createdByAiPrompt: z.string().max(1000).optional(),
});

const apiEndpointSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  enabled: z.boolean(),
  methods: z.array(z.enum(["GET", "POST", "PATCH"])).min(1),
  apiKey: z.string().min(8).max(200),
  exposedFields: z.array(z.string().max(100)),
  createdAt: z.string(),
});

const detailFieldSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(["text", "textarea", "number", "date"]),
});

const putSettingsSchema = z.object({
  visibleColumns: z.array(z.string().max(100)).optional(),
  customMetrics: z.array(customMetricSchema).optional(),
  charts: z.array(chartConfigSchema).optional(),
  triggers: z.array(triggerRuleSchema).optional(),
  apiEndpoints: z.array(apiEndpointSchema).optional(),
  detailFields: z.array(detailFieldSchema).optional(),
});

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);
    const settings = await getModuleAppSettings(definition);
    return Response.json({ module: definition, settings });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Get module settings error:", error);
    return Response.json({ error: "Failed to load module settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);
    const current = await getModuleAppSettings(definition);

    const parsed = putSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid settings payload");
    }

    const updated = {
      ...current,
      ...parsed.data,
      slug: definition.slug,
      updatedAt: new Date(),
      updatedByUid: actor.uid,
    };

    const db = getDb();
    await db
      .collection(COLLECTIONS.MODULE_SETTINGS)
      .doc(definition.slug)
      .set(updated, { merge: true });

    return Response.json({ settings: updated });
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Save module settings error:", error);
    return Response.json({ error: "Failed to save module settings." }, { status: 500 });
  }
}
