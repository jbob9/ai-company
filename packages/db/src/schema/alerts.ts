import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { company } from "./companies";
import { department, departmentTypeEnum } from "./departments";
import { kpiDefinition } from "./metrics";
import { user } from "./auth";

// Alert severity levels as defined in the planning document
export const alertSeverityEnum = pgEnum("alert_severity", [
  "critical", // 🔴 Immediate action required
  "warning", // 🟠 Attention needed soon
  "watch", // 🟡 Monitor closely
  "opportunity", // 🟢 Positive signal
]);

// Alert status
export const alertStatusEnum = pgEnum("alert_status", [
  "active", // Alert is active and needs attention
  "acknowledged", // User has seen the alert
  "resolved", // Issue has been resolved
  "dismissed", // User dismissed without resolving
]);

export const alert = pgTable(
  "alert",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    // What triggered the alert
    departmentType: departmentTypeEnum("department_type"),
    kpiDefinitionId: text("kpi_definition_id").references(
      () => kpiDefinition.id,
      { onDelete: "set null" }
    ),

    // Alert details
    severity: alertSeverityEnum("severity").notNull(),
    status: alertStatusEnum("status").default("active").notNull(),

    // Alert content
    title: text("title").notNull(),
    message: text("message").notNull(),
    details: jsonb("details").$type<AlertDetails>(),

    // The metric value that triggered this alert (if applicable)
    triggerValue: text("trigger_value"),
    thresholdValue: text("threshold_value"),

    // AI-generated insight
    aiInsight: text("ai_insight"),
    aiRecommendation: text("ai_recommendation"),

    // Resolution
    acknowledgedAt: timestamp("acknowledged_at"),
    acknowledgedBy: text("acknowledged_by").references(() => user.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: text("resolved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    resolutionNotes: text("resolution_notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("alert_company_idx").on(table.companyId),
    index("alert_severity_idx").on(table.severity),
    index("alert_status_idx").on(table.status),
    index("alert_dept_idx").on(table.departmentType),
    index("alert_created_idx").on(table.createdAt),
  ]
);

// Alert details type
export interface AlertDetails {
  // The threshold that was breached
  thresholdType?: "criticalMin" | "criticalMax" | "warningMin" | "warningMax";
  // Historical context
  previousValue?: number;
  changePercent?: number;
  // Related metrics or context
  relatedMetrics?: Array<{
    name: string;
    value: number;
    trend: "up" | "down" | "stable";
  }>;
  // Cross-department context
  affectedDepartments?: string[];
}

// Relations
export const alertRelations = relations(alert, ({ one }) => ({
  company: one(company, {
    fields: [alert.companyId],
    references: [company.id],
  }),
  kpiDefinition: one(kpiDefinition, {
    fields: [alert.kpiDefinitionId],
    references: [kpiDefinition.id],
  }),
  acknowledgedByUser: one(user, {
    fields: [alert.acknowledgedBy],
    references: [user.id],
    relationName: "alertAcknowledgedBy",
  }),
  resolvedByUser: one(user, {
    fields: [alert.resolvedBy],
    references: [user.id],
    relationName: "alertResolvedBy",
  }),
}));
