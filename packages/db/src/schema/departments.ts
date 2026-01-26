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

// Department types as defined in the planning document
export const departmentTypeEnum = pgEnum("department_type", [
  "product",
  "engineering",
  "sales",
  "marketing",
  "customer_success",
  "finance",
  "operations",
  "hr",
  "legal",
  "data_analytics",
  "corporate_development",
  "security_compliance",
]);

export const department = pgTable(
  "department",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    type: departmentTypeEnum("type").notNull(),
    name: text("name").notNull(), // Custom display name

    // Department configuration
    isEnabled: boolean("is_enabled").default(true).notNull(),
    headcount: text("headcount"), // Number of people in department

    // AI agent configuration
    aiEnabled: boolean("ai_enabled").default(true).notNull(),
    aiConfig: jsonb("ai_config").$type<DepartmentAIConfig>(),

    // Department-specific goals and context
    goals: jsonb("goals").$type<string[]>(),
    context: text("context"), // Additional context for the AI agent

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("department_company_idx").on(table.companyId),
    index("department_type_idx").on(table.type),
  ]
);

// Type for AI configuration
export interface DepartmentAIConfig {
  // Alert thresholds
  alertThresholds?: Record<string, number>;
  // Custom prompts or instructions
  customInstructions?: string;
  // Notification preferences
  notifyOnCritical?: boolean;
  notifyOnWarning?: boolean;
}

// Relations
export const departmentRelations = relations(department, ({ one }) => ({
  company: one(company, {
    fields: [department.companyId],
    references: [company.id],
  }),
}));
