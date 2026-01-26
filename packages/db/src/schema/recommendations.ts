import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { company } from "./companies";
import { departmentTypeEnum } from "./departments";
import { user } from "./auth";

// Recommendation priority levels
export const recommendationPriorityEnum = pgEnum("recommendation_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

// Recommendation type (as defined in planning doc)
export const recommendationTypeEnum = pgEnum("recommendation_type", [
  "tactical", // Short-term, < 1 month
  "strategic", // Medium-term, 1-6 months
  "resource_allocation", // Ongoing resource changes
]);

// Recommendation status
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending", // Waiting for user decision
  "accepted", // User accepted the recommendation
  "rejected", // User rejected the recommendation
  "implementing", // Currently being implemented
  "completed", // Implementation finished
  "failed", // Implementation failed
]);

export const recommendation = pgTable(
  "recommendation",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    // Classification
    type: recommendationTypeEnum("type").notNull(),
    priority: recommendationPriorityEnum("priority").notNull(),
    departmentTypes: jsonb("department_types").$type<string[]>(), // Affected departments

    // Content (following the format from planning doc)
    title: text("title").notNull(),
    description: text("description").notNull(),
    impact: text("impact"), // Expected outcome with metrics
    effort: text("effort"), // Time, cost, resources needed
    rationale: text("rationale"), // Why this recommendation, data supporting it
    alternatives: jsonb("alternatives").$type<Alternative[]>(), // Other paths considered

    // Status tracking
    status: recommendationStatusEnum("status").default("pending").notNull(),

    // Decision tracking
    decidedAt: timestamp("decided_at"),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    decisionNotes: text("decision_notes"),

    // Implementation tracking
    implementationStartedAt: timestamp("implementation_started_at"),
    implementationCompletedAt: timestamp("implementation_completed_at"),

    // Outcome tracking (for learning loop)
    outcome: jsonb("outcome").$type<RecommendationOutcome>(),

    // AI metadata
    aiModelVersion: text("ai_model_version"),
    aiConfidenceScore: integer("ai_confidence_score"), // 0-100

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("recommendation_company_idx").on(table.companyId),
    index("recommendation_status_idx").on(table.status),
    index("recommendation_priority_idx").on(table.priority),
    index("recommendation_type_idx").on(table.type),
    index("recommendation_created_idx").on(table.createdAt),
  ]
);

// Alternative recommendation type
export interface Alternative {
  title: string;
  description: string;
  tradeoffs: string;
}

// Outcome tracking for learning loop
export interface RecommendationOutcome {
  // Did the recommendation achieve its goal?
  success: boolean;
  // Measured impact on metrics
  metricChanges?: Array<{
    metricName: string;
    beforeValue: number;
    afterValue: number;
    changePercent: number;
  }>;
  // User feedback
  feedback?: string;
  // Lessons learned
  lessonsLearned?: string;
}

// Relations
export const recommendationRelations = relations(recommendation, ({ one }) => ({
  company: one(company, {
    fields: [recommendation.companyId],
    references: [company.id],
  }),
  decidedByUser: one(user, {
    fields: [recommendation.decidedBy],
    references: [user.id],
  }),
}));
