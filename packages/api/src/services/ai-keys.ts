import { and, eq } from "drizzle-orm";

import { db } from "@ai-company/db";
import { userAIKey } from "@ai-company/db/schema/user-ai-keys";
import { env } from "@ai-company/env/server";
import type { ProviderName } from "@ai-company/ai";

import { decryptSecret } from "../utils/crypto";

export type EffectiveAIConfig = {
  provider: ProviderName;
  apiKey: string;
  source: "user" | "system";
};

export class MissingAIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingAIKeyError";
  }
}

const PROVIDER_ENV_KEY_MAP: Record<string, keyof typeof env | undefined> = {
  gemini: "GOOGLE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
};

// Simple in-memory cache to avoid hitting the database for every AI call.
// Keys are per-process and cleared on restart.
type CacheKey = string;
type CachedConfig = {
  config: EffectiveAIConfig;
  expiresAt: number;
};

const USER_CONFIG_CACHE = new Map<CacheKey, CachedConfig>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function makeCacheKey(userId: string, provider: ProviderName): CacheKey {
  return `${userId}:${provider}`;
}

export function invalidateUserAIConfig(
  userId: string,
  providerOverride?: ProviderName,
): void {
  const provider = providerOverride ?? env.AI_PROVIDER;
  USER_CONFIG_CACHE.delete(makeCacheKey(userId, provider));
}

function resolveSystemKey(provider: ProviderName): EffectiveAIConfig {
  const envKeyName = PROVIDER_ENV_KEY_MAP[provider];
  const apiKey = envKeyName ? env[envKeyName] : undefined;

  if (!apiKey) {
    throw new MissingAIKeyError(
      `AI service not configured for provider "${provider}". Set ${envKeyName} or add a user API key.`,
    );
  }

  return {
    provider,
    apiKey,
    source: "system",
  };
}

export function getSystemAIConfig(providerOverride?: ProviderName): EffectiveAIConfig {
  const provider = providerOverride ?? env.AI_PROVIDER;
  return resolveSystemKey(provider);
}

export async function getEffectiveAIConfigForUser(
  userId: string,
  providerOverride?: ProviderName,
): Promise<EffectiveAIConfig> {
  const provider = providerOverride ?? env.AI_PROVIDER;

  // Check in-memory cache first
  const cacheKey = makeCacheKey(userId, provider);
  const cached = USER_CONFIG_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.config;
  }

  // Try user-provided key first
  const userKeyRow = await db.query.userAIKey.findFirst({
    where: and(
      eq(userAIKey.userId, userId),
      eq(userAIKey.provider, provider as "gemini" | "openai" | "anthropic"),
    ),
  });

  if (userKeyRow) {
    try {
      const apiKey = decryptSecret(userKeyRow.apiKeyEncrypted);

      // Fire-and-forget update of lastUsedAt
      void db
        .update(userAIKey)
        .set({ lastUsedAt: new Date() })
        .where(
          and(
            eq(userAIKey.userId, userId),
            eq(userAIKey.provider, provider as "gemini" | "openai" | "anthropic"),
          ),
        );

      return {
        provider,
        apiKey,
        source: "user",
      };
    } catch {
      // If decryption fails, fall back to system key (and effectively treat this as missing/invalid).
    }
  }

  // Fallback to system-level key
  const systemConfig = resolveSystemKey(provider);

  USER_CONFIG_CACHE.set(cacheKey, {
    config: systemConfig,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return systemConfig;
}

