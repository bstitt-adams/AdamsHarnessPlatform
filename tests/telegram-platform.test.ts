import assert from "node:assert/strict";
import { test } from "node:test";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { applyTelegramConfirmation } from "../lib/telegram-platform";
import {
  getPlatformModule, ownsPlatformRecord, platformIntentSchema, platformModules,
  projectPlatformRecord, validWebhookSecret, validatePlatformWrite,
} from "../lib/telegram-platform-policy";

const actor = { uid: "admin-uid", email: "admin@example.invalid", memberId: "member-1", displayName: "Test Admin", role: "admin", departmentIds: [] };
const message = { userId: "12345", chatId: "12345", updateId: 100, text: "/confirm" };
const nonce = "a".repeat(32);

class MemoryStore {
  rows = new Map<string, { data: Record<string, unknown>; time: Timestamp }>();
  sequence = 0;
  seed(path: string, data: Record<string, unknown>) {
    this.rows.set(path, { data, time: Timestamp.fromMillis(++this.sequence) });
  }
  collection(name: string) {
    return { doc: (id = `id-${++this.sequence}`) => ({ path: `${name}/${id}`, id }) };
  }
  async runTransaction<T>(work: (transaction: unknown) => Promise<T>): Promise<T> {
    const writes: (() => void)[] = [];
    const transaction = {
      get: async ({ path, id }: { path: string; id: string }) => {
        const row = this.rows.get(path);
        return { exists: Boolean(row), id, data: () => row?.data, updateTime: row?.time };
      },
      create: ({ path }: { path: string }, data: Record<string, unknown>) => {
        if (this.rows.has(path)) throw new Error("already exists");
        writes.push(() => this.seed(path, data));
      },
      update: ({ path }: { path: string }, data: Record<string, unknown>) => {
        if (!this.rows.has(path)) throw new Error("not found");
        writes.push(() => this.seed(path, { ...this.rows.get(path)!.data, ...data }));
      },
    };
    const result = await work(transaction);
    writes.forEach((write) => write());
    return result;
  }
  asFirestore() { return this as unknown as Firestore; }
}

function fixture(action: "create" | "update" = "create") {
  const db = new MemoryStore();
  db.seed("platformSecrets/telegram", { enabled: true, platformDataEnabled: true, platformAdminUid: actor.uid, platformAdminTelegramUserId: message.userId });
  db.seed(`users/${actor.uid}`, { role: "admin" });
  if (action === "update") db.seed("tractionTodos/record-1", { ownerId: actor.memberId, description: "Original", completed: false });
  db.seed(`telegramPlatformCommands/${nonce}`, {
    actorUid: actor.uid, telegramUserId: message.userId, chatId: message.chatId,
    intent: { action, module: "my-tasks", recordId: "record-1", data: action === "create" ? { description: "Inspect PPE" } : { completed: true } },
    persisted: action === "create"
      ? { description: "Inspect PPE", priority: "medium", ownerId: actor.memberId, status: "in-progress", completed: false, mindchukKind: "task" }
      : { completed: true, status: "complete" },
    before: {}, expectedUpdateTime: db.rows.get("tractionTodos/record-1")?.time || null,
    state: "pending", expiresAt: Timestamp.fromMillis(Date.now() + 60000),
  });
  return db;
}

for (const [label, expected, supplied] of [
  ["missing configured secret", undefined, "abc"],
  ["missing header", "abc", null],
  ["empty header", "abc", ""],
  ["wrong secret", "abc", "def"],
  ["different length", "abc", "abcdef"],
] as const) {
  test(`webhook rejects ${label}`, () => assert.equal(validWebhookSecret(expected, supplied), false));
}
test("webhook accepts exact configured secret", () => assert.equal(validWebhookSecret("random-secret", "random-secret"), true));

test("module lookup cannot address arbitrary collections or prototype keys", () => {
  for (const key of ["platformSecrets", "users", "__proto__", "constructor", "../users", undefined]) assert.throws(() => getPlatformModule(key));
});
test("intent rejects raw paths, deletes, nested payloads and unknown control fields", () => {
  for (const intent of [
    { action: "delete", module: "my-tasks" },
    { action: "update", module: "my-tasks", recordId: "../users/admin" },
    { action: "read", module: "my-tasks", actorUid: "another-user" },
    { action: "update", module: "my-tasks", data: { status: { role: "superadmin" } } },
  ]) assert.equal(platformIntentSchema.safeParse(intent).success, false);
});
test("write schemas reject ownership, roles, grades and privileged field injection", () => {
  for (const module of ["my-tasks", "my-orders", "my-ideas", "safety-requests"]) {
    assert.throws(() => validatePlatformWrite({ action: "update", module, recordId: "record-1", data: { role: "superadmin", ownerId: "someone-else" } }));
  }
  for (const module of ["academy-admin", "certifications", "team-members", "backups", "module-records"]) {
    assert.throws(() => validatePlatformWrite({ action: "update", module, recordId: "record-1", data: { score: 100 } }));
  }
});
test("empty writes and updates without an exact record ID fail", () => {
  assert.throws(() => validatePlatformWrite({ action: "update", module: "my-tasks", data: { completed: true } }));
  assert.throws(() => validatePlatformWrite({ action: "update", module: "my-tasks", recordId: "r", data: {} }));
});
test("real required fields and dates are validated", () => {
  assert.throws(() => validatePlatformWrite({ action: "create", module: "my-orders", data: { itemSummary: "PPE" } }));
  assert.throws(() => validatePlatformWrite({ action: "create", module: "my-tasks", data: { description: "PPE", dueDate: "2026-02-30" } }));
  assert.deepEqual(validatePlatformWrite({ action: "create", module: "my-tasks", data: { description: "PPE" } }), { description: "PPE", priority: "medium" });
});
test("calendar events cannot end before they start", () => {
  assert.throws(() => validatePlatformWrite({ action: "create", module: "calendar", data: { title: "Training", startDate: "2026-11-20T14:00:00Z", endDate: "2026-11-19T14:00:00Z" } }));
});
test("personal pages enforce linked identity even for administrators", () => {
  const assets = getPlatformModule("my-assets");
  assert.equal(ownsPlatformRecord(assets, { assignedToTeamMemberId: "someone-else" }, actor), false);
  assert.equal(ownsPlatformRecord(assets, { assignedToTeamMemberId: actor.memberId }, actor), true);
  assert.equal(ownsPlatformRecord(assets, { assignedToUid: actor.uid }, actor), true);
  assert.equal(ownsPlatformRecord(assets, { assignedToTeamMemberId: "" }, { ...actor, memberId: undefined }), false);
  assert.equal(ownsPlatformRecord(getPlatformModule("my-tasks"), { ownerId: actor.uid }, actor), true);
});
test("record projection excludes secrets, contact details, nested fields, answer keys and artifacts", () => {
  const row = { firstName: "Brian", password: "hidden", emergencyContacts: [{ phone: "hidden" }], emailPrimary: "hidden", role: "superadmin", apiKey: "hidden" };
  assert.deepEqual(projectPlatformRecord(getPlatformModule("team-members"), row), { firstName: "Brian" });
  assert.deepEqual(projectPlatformRecord(getPlatformModule("academy"), { title: "Safety", textContent: "ANSWER KEY", questions: ["answers"] }), { title: "Safety" });
  assert.deepEqual(projectPlatformRecord(getPlatformModule("certifications"), { trainingTitle: "LOTO", artifactPath: "private/file" }), { trainingTitle: "LOTO" });
});
test("unavailable pages are explicit, not invented collections", () => {
  for (const key of ["order-tracking", "system-docs"]) {
    assert.equal(platformModules[key].collection, undefined);
    assert.ok(platformModules[key].unavailable);
  }
});

test("confirmed create atomically creates record, consumes token and audits actor", async () => {
  const db = fixture();
  const result = await applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false);
  assert.match(result, /Saved My Tasks/);
  assert.equal(db.rows.get("tractionTodos/record-1")?.data.ownerId, actor.memberId);
  assert.equal(db.rows.get(`telegramPlatformCommands/${nonce}`)?.data.state, "applied");
  assert.equal(db.rows.get(`telegramPlatformEvents/${nonce}`)?.data.actorUid, actor.uid);
});
test("confirmation is single use", async () => {
  const db = fixture();
  await applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false);
  const size = db.rows.size;
  assert.match(await applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /already applied/);
  assert.equal(db.rows.size, size);
});
test("cancellation never changes the target record", async () => {
  const db = fixture();
  await applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, true);
  assert.equal(db.rows.has("tractionTodos/record-1"), false);
  assert.equal(db.rows.get(`telegramPlatformCommands/${nonce}`)?.data.state, "cancelled");
});
test("another Telegram user or group cannot confirm", async () => {
  for (const mismatch of [{ userId: "67890", chatId: "67890" }, { userId: message.userId, chatId: "-12345" }]) {
    const db = fixture();
    await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, { ...message, ...mismatch }, nonce, false));
    assert.equal(db.rows.has("tractionTodos/record-1"), false);
  }
});
test("another linked account cannot confirm a prior account's command", async () => {
  const db = fixture();
  const command = db.rows.get(`telegramPlatformCommands/${nonce}`)!.data;
  db.seed(`telegramPlatformCommands/${nonce}`, { ...command, actorUid: "old-admin" });
  await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /Confirmation not found/);
});
test("expired commands cannot be applied", async () => {
  const db = fixture();
  db.seed(`telegramPlatformCommands/${nonce}`, { ...db.rows.get(`telegramPlatformCommands/${nonce}`)!.data, expiresAt: Timestamp.fromMillis(1) });
  await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /expired/);
});
test("revoked roles and disabled platform access are checked again inside the transaction", async () => {
  for (const mutation of ["role", "binding", "enabled"]) {
    const db = fixture();
    if (mutation === "role") db.seed(`users/${actor.uid}`, { role: "team" });
    else db.seed("platformSecrets/telegram", { ...db.rows.get("platformSecrets/telegram")!.data, ...(mutation === "enabled" ? { enabled: false } : { platformAdminTelegramUserId: "other-user" }) });
    await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /active linked/);
    assert.equal(db.rows.has("tractionTodos/record-1"), false);
  }
});
test("concurrent edits require a fresh preview", async () => {
  const db = fixture("update");
  db.seed("tractionTodos/record-1", { ownerId: actor.memberId, description: "Changed in UI" });
  await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /Record changed/);
  assert.equal(db.rows.get("tractionTodos/record-1")?.data.description, "Changed in UI");
});
test("record reassigned to someone else cannot be updated", async () => {
  const db = fixture("update");
  db.seed("tractionTodos/record-1", { ownerId: "another-person" });
  await assert.rejects(applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false), /permitted scope/);
});
test("confirmed completion uses the UI task status convention", async () => {
  const db = fixture("update");
  await applyTelegramConfirmation(db.asFirestore(), actor, message, nonce, false);
  assert.equal(db.rows.get("tractionTodos/record-1")?.data.status, "complete");
  assert.equal(db.rows.get("tractionTodos/record-1")?.data.completed, true);
});
