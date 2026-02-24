import crypto from "node:crypto";
import { env } from "@ai-company/env/server";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce for GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = env.AI_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("AI_KEY_ENCRYPTION_SECRET is not set");
  }
  // Derive a 32-byte key from the secret (supports arbitrary length secret string)
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();

  const cipher = crypto.createCipheriv(ALGO, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Store as base64: iv:authTag:ciphertext
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertext: string): string {
  try {
    const raw = Buffer.from(ciphertext, "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    // Treat decryption failures as missing/invalid secret.
    throw new Error("Failed to decrypt secret");
  }
}

