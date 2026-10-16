import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authErrorResponse,
  requireUser,
  ApiAuthError,
} from "@/lib/auth/server-auth";
import {
  httpErrorResponse,
  HttpError,
} from "@/lib/adams-harness/server-store";
import { getAuthorizedModule } from "@/lib/modules/runtime";
import { requestHermesStructured } from "@/lib/hermes/client";
import type {
  ModuleChartConfig,
  ModuleCustomMetric,
  ModuleTriggerRule,
} from "@/lib/adams-harness/types";

type Ctx = { params: Promise<{ slug: string }> };

const aiPromptSchema = z.object({
  mode: z.enum(["chart", "metric", "automation"]),
  prompt: z.string().trim().min(3).max(2000),
});

const aiChartResponseSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  chartType: z.enum(["bar", "line", "pie", "area"]),
  groupByField: z.string(),
  metric: z.enum(["count", "sum", "avg"]),
  valueField: z.string().optional(),
});

const aiMetricResponseSchema = z.object({
  label: z.string(),
  description: z.string().optional(),
  aggregation: z.enum([
    "count",
    "completed_rate",
    "overdue_count",
    "active_count",
    "field_sum",
  ]),
  fieldId: z.string().optional(),
  filterStatus: z.enum(["active", "completed", "archived"]).optional(),
});

const aiAutomationResponseSchema = z.object({
  name: z.string(),
  event: z.enum(["record_created", "record_updated", "status_completed", "overdue"]),
  conditionField: z.string().optional(),
  conditionOperator: z.enum(["equals", "contains", "not_empty"]).optional(),
  conditionValue: z.string().optional(),
  actionType: z.enum([
    "in_app_notification",
    "telegram_notification",
    "teams_notification",
    "webhook",
    "auto_assign",
    "mark_completed",
  ]),
  targetRecipient: z.string().optional(),
  messageTemplate: z.string(),
});

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const actor = await requireUser(request);
    const { slug } = await params;
    const definition = await getAuthorizedModule(actor, slug);

    const parsed = aiPromptSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new HttpError(400, "Invalid AI prompt request");
    }

    const { mode, prompt } = parsed.data;
    const primaryRecord = definition.recordTypes[0];
    const availableFields = primaryRecord
      ? primaryRecord.fields.map((f) => `${f.id} (${f.label}, type=${f.type})`)
      : ["title", "status", "category", "priority"];

    const lowerPrompt = prompt.toLowerCase();

    if (mode === "chart") {
      try {
        const { data } = await requestHermesStructured({
          systemPrompt: `You design data charts for the Adams Electric solution "${definition.name}". Available fields: ${availableFields.join(", ")}, plus "status". Return JSON matching: {"title": string, "description": string, "chartType": "bar"|"line"|"pie"|"area", "groupByField": string, "metric": "count"|"sum"|"avg", "valueField"?: string}.`,
          messages: [{ role: "user", content: prompt }],
          schema: aiChartResponseSchema,
        });
        const chart: ModuleChartConfig = {
          id: `chart_${Date.now()}`,
          title: data.title,
          description: data.description || `Generated from prompt: "${prompt}"`,
          chartType: data.chartType,
          groupByField: data.groupByField,
          metric: data.metric,
          valueField: data.valueField,
          aiRecommended: true,
          promptUsed: prompt,
        };
        return Response.json({ chart });
      } catch {
        // Intelligent deterministic fallback when Hermes is offline
        const chartType: ModuleChartConfig["chartType"] = lowerPrompt.includes("pie")
          ? "pie"
          : lowerPrompt.includes("line") || lowerPrompt.includes("trend")
            ? "line"
            : lowerPrompt.includes("area")
              ? "area"
              : "bar";
        const matchedField =
          primaryRecord?.fields.find(
            (f) =>
              lowerPrompt.includes(f.id.toLowerCase()) ||
              lowerPrompt.includes(f.label.toLowerCase()),
          )?.id ||
          (lowerPrompt.includes("status")
            ? "status"
            : primaryRecord?.fields.find((f) => f.type === "select")?.id || "status");
        const numField = primaryRecord?.fields.find((f) => f.type === "number")?.id;
        const metric: ModuleChartConfig["metric"] =
          lowerPrompt.includes("sum") || lowerPrompt.includes("total cost")
            ? "sum"
            : lowerPrompt.includes("avg") || lowerPrompt.includes("average")
              ? "avg"
              : "count";

        const chart: ModuleChartConfig = {
          id: `chart_${Date.now()}`,
          title: prompt.slice(0, 65),
          description: `AI generated ${chartType} chart grouped by ${matchedField}`,
          chartType,
          groupByField: matchedField,
          metric,
          valueField: metric !== "count" ? numField : undefined,
          aiRecommended: true,
          promptUsed: prompt,
        };
        return Response.json({ chart });
      }
    }

    if (mode === "metric") {
      try {
        const { data } = await requestHermesStructured({
          systemPrompt: `You design KPI metric cards for the Adams Electric solution "${definition.name}". Available fields: ${availableFields.join(", ")}. Return JSON matching: {"label": string, "description": string, "aggregation": "count"|"completed_rate"|"overdue_count"|"active_count"|"field_sum", "fieldId"?: string, "filterStatus"?: "active"|"completed"|"archived"}.`,
          messages: [{ role: "user", content: prompt }],
          schema: aiMetricResponseSchema,
        });
        const metricCard: ModuleCustomMetric = {
          id: `metric_${Date.now()}`,
          label: data.label,
          description: data.description || `AI metric from prompt: "${prompt}"`,
          aggregation: data.aggregation,
          fieldId: data.fieldId,
          filterStatus: data.filterStatus,
          promptUsed: prompt,
        };
        return Response.json({ metric: metricCard });
      } catch {
        const aggregation: ModuleCustomMetric["aggregation"] = lowerPrompt.includes("overdue")
          ? "overdue_count"
          : lowerPrompt.includes("rate") || lowerPrompt.includes("%") || lowerPrompt.includes("percent")
            ? "completed_rate"
            : lowerPrompt.includes("sum") || lowerPrompt.includes("cost") || lowerPrompt.includes("value")
              ? "field_sum"
              : lowerPrompt.includes("active") || lowerPrompt.includes("open")
                ? "active_count"
                : "count";
        const numField = primaryRecord?.fields.find((f) => f.type === "number")?.id;
        const metricCard: ModuleCustomMetric = {
          id: `metric_${Date.now()}`,
          label: prompt.slice(0, 50),
          description: `AI custom metric (${aggregation.replace(/_/g, " ")})`,
          aggregation,
          fieldId: aggregation === "field_sum" ? numField : undefined,
          promptUsed: prompt,
        };
        return Response.json({ metric: metricCard });
      }
    }

    // mode === "automation"
    try {
      const { data } = await requestHermesStructured({
        systemPrompt: `You design workflow automations and notifications for the Adams Electric solution "${definition.name}". Available fields: ${availableFields.join(", ")}. Return JSON matching: {"name": string, "event": "record_created"|"record_updated"|"status_completed"|"overdue", "conditionField"?: string, "conditionOperator"?: "equals"|"contains"|"not_empty", "conditionValue"?: string, "actionType": "in_app_notification"|"telegram_notification"|"teams_notification"|"webhook"|"auto_assign"|"mark_completed", "targetRecipient"?: string, "messageTemplate": string}.`,
        messages: [{ role: "user", content: prompt }],
        schema: aiAutomationResponseSchema,
      });
      const trigger: ModuleTriggerRule = {
        id: `trg_${Date.now()}`,
        name: data.name,
        enabled: true,
        event: data.event,
        conditionField: data.conditionField,
        conditionOperator: data.conditionOperator,
        conditionValue: data.conditionValue,
        actionType: data.actionType,
        targetRecipient: data.targetRecipient,
        messageTemplate: data.messageTemplate,
        createdByAiPrompt: prompt,
      };
      return Response.json({ trigger });
    } catch {
      const event: ModuleTriggerRule["event"] = lowerPrompt.includes("complete")
        ? "status_completed"
        : lowerPrompt.includes("overdue") || lowerPrompt.includes("late")
          ? "overdue"
          : lowerPrompt.includes("update") || lowerPrompt.includes("change")
            ? "record_updated"
            : "record_created";
      const actionType: ModuleTriggerRule["actionType"] = lowerPrompt.includes("telegram")
        ? "telegram_notification"
        : lowerPrompt.includes("teams")
          ? "teams_notification"
          : lowerPrompt.includes("webhook")
            ? "webhook"
            : "in_app_notification";

      const trigger: ModuleTriggerRule = {
        id: `trg_${Date.now()}`,
        name: prompt.slice(0, 60),
        enabled: true,
        event,
        ...(lowerPrompt.includes("critical") || lowerPrompt.includes("high")
          ? {
              conditionField: "priority",
              conditionOperator: "equals" as const,
              conditionValue: lowerPrompt.includes("critical") ? "Critical" : "High",
            }
          : {}),
        actionType,
        messageTemplate: `[${definition.name}] ${prompt} — Item: {{record.title}} (ID: {{record.id}})`,
        createdByAiPrompt: prompt,
      };
      return Response.json({ trigger });
    }
  } catch (error) {
    if (error instanceof ApiAuthError) return authErrorResponse(error);
    const http = httpErrorResponse(error);
    if (http) return http;
    console.error("Module AI generator error:", error);
    return Response.json({ error: "Failed to run AI generator." }, { status: 500 });
  }
}
