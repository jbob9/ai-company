import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  boolean,
  jsonb,
  integer,
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

// Document categories for department context
export const documentCategoryEnum = pgEnum("document_category", [
  "role",
  "kpis",
  "monitoring",
  "actions",
  "improvements",
  "general",
]);

// Markdown context documents for a department
export const departmentDocument = pgTable(
  "department_document",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => department.id, { onDelete: "cascade" }),
    category: documentCategoryEnum("category").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("doc_department_idx").on(table.departmentId),
    index("doc_category_idx").on(table.category),
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
export const departmentRelations = relations(department, ({ one, many }) => ({
  company: one(company, {
    fields: [department.companyId],
    references: [company.id],
  }),
  documents: many(departmentDocument),
}));

export const departmentDocumentRelations = relations(
  departmentDocument,
  ({ one }) => ({
    department: one(department, {
      fields: [departmentDocument.departmentId],
      references: [department.id],
    }),
  })
);
