import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Company growth stages as defined in the planning document
export const companyStageEnum = pgEnum("company_stage", [
  "bootstrap", // 0-10 employees, $0-$500K ARR
  "early", // 10-50 employees, $500K-$5M ARR
  "growth", // 50-200 employees, $5M-$50M ARR
  "scale", // 200+ employees, $50M+ ARR
]);

export const company = pgTable(
  "company",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    stage: companyStageEnum("stage").default("bootstrap").notNull(),

    // Company metrics for stage assessment
    employeeCount: integer("employee_count").default(1),
    arrCents: integer("arr_cents").default(0), // Annual Recurring Revenue in cents
    runwayMonths: integer("runway_months"), // Calculated runway

    // Metadata
    industry: text("industry"),
    website: text("website"),
    description: text("description"),

    // Owner/Creator
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("company_owner_idx").on(table.ownerId),
    index("company_stage_idx").on(table.stage),
  ]
);

// Company members (users who belong to a company)
export const companyMember = pgTable(
  "company_member",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(), // owner, admin, member
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("company_member_company_idx").on(table.companyId),
    index("company_member_user_idx").on(table.userId),
  ]
);

// Relations
export const companyRelations = relations(company, ({ one, many }) => ({
  owner: one(user, {
    fields: [company.ownerId],
    references: [user.id],
  }),
  members: many(companyMember),
}));

export const companyMemberRelations = relations(companyMember, ({ one }) => ({
  company: one(company, {
    fields: [companyMember.companyId],
    references: [company.id],
  }),
  user: one(user, {
    fields: [companyMember.userId],
    references: [user.id],
  }),
}));
