import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const aiProviderEnum = pgEnum("ai_provider", [
  "openai",
  "anthropic",
  "gemini",
]);

export const userAIKey = pgTable(
  "user_ai_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    provider: aiProviderEnum("provider").notNull(),

    // Encrypted API key (ciphertext) stored at rest.
    apiKeyEncrypted: text("api_key_encrypted").notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    index("user_ai_key_user_idx").on(table.userId),
    index("user_ai_key_provider_idx").on(table.provider),
    uniqueIndex("user_ai_key_user_provider_idx").on(table.userId, table.provider),
  ],
);

export const userAIKeyRelations = relations(userAIKey, ({ one }) => ({
  user: one(user, {
    fields: [userAIKey.userId],
    references: [user.id],
  }),
}));

