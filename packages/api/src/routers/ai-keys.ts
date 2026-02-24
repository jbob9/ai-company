import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { userAIKey } from "@ai-company/db/schema/user-ai-keys";
import { encryptSecret } from "../utils/crypto";
import { invalidateUserAIConfig } from "../services/ai-keys";

const providerSchema = z.enum(["openai", "anthropic", "gemini"]);

export const aiKeysRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const rows = await db.query.userAIKey.findMany({
      where: eq(userAIKey.userId, userId),
      orderBy: (keys, { asc }) => [asc(keys.provider)],
    });

    return rows.map((row) => {
      const last4 = row.apiKeyEncrypted ? "****" : undefined;
      return {
        provider: row.provider,
        configured: true,
        last4,
        createdAt: row.createdAt,
        lastUsedAt: row.lastUsedAt,
      };
    });
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        apiKey: z.string().min(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const encrypted = encryptSecret(input.apiKey);

      await db
        .insert(userAIKey)
        .values({
          id: `${userId}:${input.provider}`,
          userId,
          provider: input.provider,
          apiKeyEncrypted: encrypted,
        })
        .onConflictDoUpdate({
          target: [userAIKey.userId, userAIKey.provider],
          set: {
            apiKeyEncrypted: encrypted,
            updatedAt: new Date(),
          },
        });

      invalidateUserAIConfig(userId, input.provider);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      await db
        .delete(userAIKey)
        .where(and(eq(userAIKey.userId, userId), eq(userAIKey.provider, input.provider)));

      invalidateUserAIConfig(userId, input.provider);

      return { success: true };
    }),
});

