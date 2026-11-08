import { createHash, randomBytes } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import {
  COLLECTIONS,
  type HardhatQrCodeDoc,
  type HardhatQrEventAction,
  type HardhatQrEventDoc,
  type TeamMemberDoc,
} from "@/lib/schema";
import type { AuthenticatedActor } from "@/lib/auth/server-auth";

export function createHardhatQrToken() {
  return randomBytes(24).toString("base64url");
}

export function hashScanIp(value: string) {
  if (!value) return "";
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export async function writeHardhatQrEvent(
  code: Pick<HardhatQrCodeDoc, "id" | "teamMemberId" | "moduleSlug" | "moduleRecordId">,
  action: HardhatQrEventAction,
  options: {
    actor?: Pick<AuthenticatedActor, "uid" | "email"> | null;
    actorType?: HardhatQrEventDoc["actorType"];
    ipHash?: string;
    userAgent?: string;
    metadata?: HardhatQrEventDoc["metadata"];
  } = {},
) {
  if (!adminDb) return;
  const event: Omit<HardhatQrEventDoc, "id"> = {
    codeId: code.id,
    teamMemberId: code.teamMemberId,
    ...(code.moduleSlug ? { moduleSlug: code.moduleSlug } : {}),
    ...(code.moduleRecordId ? { moduleRecordId: code.moduleRecordId } : {}),
    action,
    actorType: options.actorType || (options.actor ? "admin" : "system"),
    ...(options.actor?.uid ? { actorUid: options.actor.uid } : {}),
    ...(options.actor?.email ? { actorName: options.actor.email } : {}),
    ...(options.ipHash ? { ipHash: options.ipHash } : {}),
    ...(options.userAgent ? { userAgent: options.userAgent.slice(0, 500) } : {}),
    ...(options.metadata ? { metadata: options.metadata } : {}),
    createdAt: Timestamp.now() as unknown as HardhatQrEventDoc["createdAt"],
  };
  await adminDb.collection(COLLECTIONS.HARDHAT_QR_EVENTS).add(event);
}

export async function issueHardhatQrCode(options: {
  member: TeamMemberDoc;
  actor: Pick<AuthenticatedActor, "uid" | "email">;
  moduleSlug?: string;
  moduleRecordId?: string;
  hardhatAssetId?: string;
}) {
  if (!adminDb) throw new Error("Database service unavailable");
  const token = createHardhatQrToken();
  const now = Timestamp.now() as unknown as HardhatQrCodeDoc["createdAt"];
  const existing = options.moduleRecordId
    ? await adminDb
        .collection(COLLECTIONS.HARDHAT_QR_CODES)
        .where("moduleRecordId", "==", options.moduleRecordId)
        .get()
    : await adminDb
        .collection(COLLECTIONS.HARDHAT_QR_CODES)
        .where("teamMemberId", "==", options.member.id)
        .get();

  const previousVersion = existing.docs.reduce(
    (version, item) => Math.max(version, Number(item.data().tokenVersion || 1)),
    0,
  );
  const code: Omit<HardhatQrCodeDoc, "id"> = {
    teamMemberId: options.member.id,
    teamMemberName: [options.member.firstName, options.member.middleName, options.member.lastName]
      .filter(Boolean)
      .join(" "),
    ...(options.moduleSlug ? { moduleSlug: options.moduleSlug } : {}),
    ...(options.moduleRecordId ? { moduleRecordId: options.moduleRecordId } : {}),
    ...(options.hardhatAssetId ? { hardhatAssetId: options.hardhatAssetId } : {}),
    status: "active",
    tokenVersion: previousVersion + 1 || 1,
    scanCount: 0,
    printCount: 0,
    issuedByUid: options.actor.uid,
    issuedByName: options.actor.email || "Admin",
    issuedAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const batch = adminDb.batch();
  const ref = adminDb.collection(COLLECTIONS.HARDHAT_QR_CODES).doc(token);
  batch.set(ref, code);
  for (const oldCode of existing.docs.filter((item) => item.data().status === "active")) {
    batch.update(oldCode.ref, {
      status: "revoked",
      revokedAt: now,
      revokedByUid: options.actor.uid,
      revokedByName: options.actor.email || "Admin",
      revokeReason: "replaced_by_new_token",
      updatedAt: now,
    });
  }
  await batch.commit();

  const saved = { id: token, ...code } as HardhatQrCodeDoc;
  await writeHardhatQrEvent(saved, "generated", { actor: options.actor });
  for (const oldCode of existing.docs.filter((item) => item.data().status === "active")) {
    await writeHardhatQrEvent(
      { id: oldCode.id, ...oldCode.data() } as HardhatQrCodeDoc,
      "revoked",
      {
        actor: options.actor,
        metadata: { replacementCodeId: token },
      },
    );
  }
  return saved;
}

export async function persistQrDetailsToRecord(code: HardhatQrCodeDoc) {
  if (!adminDb || !code.moduleRecordId) return;
  const recordRef = adminDb.collection(COLLECTIONS.MODULE_RECORDS).doc(code.moduleRecordId);
  const snap = await recordRef.get();
  if (!snap.exists) return;
  const record = snap.data() as { extendedData?: Record<string, unknown> };
  await recordRef.update({
    extendedData: {
      ...(record.extendedData || {}),
      qr_code_id: code.id,
      qr_code_status: code.status,
      qr_code_version: code.tokenVersion,
      qr_code_url: `/worker/${code.id}`,
      qr_code_updated_at: new Date().toISOString(),
    },
    updatedAt: Timestamp.now(),
  });
}

export async function getCodeForRecord(moduleRecordId: string) {
  if (!adminDb) return null;
  const snap = await adminDb
    .collection(COLLECTIONS.HARDHAT_QR_CODES)
    .where("moduleRecordId", "==", moduleRecordId)
    .get();
  if (snap.empty) return null;
  return snap.docs
    .map((item) => ({ id: item.id, ...item.data() }) as HardhatQrCodeDoc)
    .sort((a, b) => b.tokenVersion - a.tokenVersion)[0];
}

export function incrementQrScan(codeId: string) {
  if (!adminDb) return Promise.resolve();
  return adminDb.collection(COLLECTIONS.HARDHAT_QR_CODES).doc(codeId).update({
    scanCount: FieldValue.increment(1),
    lastScannedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}
