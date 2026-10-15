/**
 * Simple symmetric encryption for Microsoft tokens at rest.
 * Uses AES-256-GCM. If no encryption key is set, tokens are stored plaintext
 * (useful for local dev, not for production).
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer | null {
  const key = process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY;
  if (!key) return null;
  // Derive a 32-byte key from the provided string
  return crypto.scryptSync(key, "salt", 32);
}

export function encryptToken(plainText: string): string {
  const key = getKey();
  if (!key) return plainText;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store as iv:authTag:ciphertext (base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(cipherText: string): string {
  const key = getKey();
  if (!key) return cipherText;

  const [ivBase64, authTagBase64, encryptedBase64] = cipherText.split(":");
  if (!ivBase64 || !authTagBase64 || !encryptedBase64) return cipherText;

  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
