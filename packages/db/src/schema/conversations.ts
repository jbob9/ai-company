import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { company } from "./companies";
import { departmentTypeEnum } from "./departments";
import { user } from "./auth";

// Conversation with AI agents
export const aiConversation = pgTable(
  "ai_conversation",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Which agent is this conversation with?
    // null means orchestration AI
    departmentType: departmentTypeEnum("department_type"),

    // Conversation metadata
    title: text("title"), // Auto-generated or user-set title
    summary: text("summary"), // AI-generated summary of conversation

    // Context that was provided to the AI
    contextSnapshot: jsonb("context_snapshot").$type<ConversationContext>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("conversation_company_idx").on(table.companyId),
    index("conversation_user_idx").on(table.userId),
    index("conversation_dept_idx").on(table.departmentType),
    index("conversation_created_idx").on(table.createdAt),
  ]
);

// Message role enum
export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
]);

// Individual messages in a conversation
export const aiMessage = pgTable(
  "ai_message",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversation.id, { onDelete: "cascade" }),

    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),

    // AI metadata (for assistant messages)
    aiMetadata: jsonb("ai_metadata").$type<AIMessageMetadata>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("message_conversation_idx").on(table.conversationId),
    index("message_created_idx").on(table.createdAt),
  ]
);

// Context snapshot type
export interface ConversationContext {
  // Company state at the time of conversation
  companyStage?: string;
  // Relevant metrics
  metrics?: Array<{
    name: string;
    value: number;
    trend: "up" | "down" | "stable";
  }>;
  // Active alerts
  activeAlerts?: Array<{
    severity: string;
    title: string;
  }>;
  // Recent recommendations
  recentRecommendations?: Array<{
    title: string;
    status: string;
  }>;
}

// AI message metadata
export interface AIMessageMetadata {
  // Model used
  model?: string;
  // Token usage
  inputTokens?: number;
  outputTokens?: number;
  // Response time in ms
  responseTimeMs?: number;
  // Any tool calls made
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;
}

// Relations
export const aiConversationRelations = relations(
  aiConversation,
  ({ one, many }) => ({
    company: one(company, {
      fields: [aiConversation.companyId],
      references: [company.id],
    }),
    user: one(user, {
      fields: [aiConversation.userId],
      references: [user.id],
    }),
    messages: many(aiMessage),
  })
);

export const aiMessageRelations = relations(aiMessage, ({ one }) => ({
  conversation: one(aiConversation, {
    fields: [aiMessage.conversationId],
    references: [aiConversation.id],
  }),
}));
