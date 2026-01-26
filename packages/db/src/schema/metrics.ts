import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  numeric,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { company } from "./companies";
import { department, departmentTypeEnum } from "./departments";

// KPI definition - defines what metrics are tracked
export const kpiDefinition = pgTable(
  "kpi_definition",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    // Which department this KPI belongs to
    departmentType: departmentTypeEnum("department_type").notNull(),

    // KPI metadata
    name: text("name").notNull(), // e.g., "Monthly Recurring Revenue"
    slug: text("slug").notNull(), // e.g., "mrr"
    description: text("description"),
    unit: text("unit"), // e.g., "USD", "%", "days"
    unitPosition: text("unit_position").default("suffix"), // prefix or suffix

    // Threshold configuration for alerts
    thresholds: jsonb("thresholds").$type<KpiThresholds>(),

    // Is this a default KPI or custom?
    isDefault: text("is_default").default("false"),

    // Formatting
    decimalPlaces: integer("decimal_places").default(2),
    formatAsCurrency: text("format_as_currency").default("false"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("kpi_def_company_idx").on(table.companyId),
    index("kpi_def_dept_idx").on(table.departmentType),
    index("kpi_def_slug_idx").on(table.companyId, table.slug),
  ]
);

// Threshold configuration for KPIs
export interface KpiThresholds {
  // Critical alert if value goes below/above this
  criticalMin?: number;
  criticalMax?: number;
  // Warning if value goes below/above this
  warningMin?: number;
  warningMax?: number;
  // Watch threshold
  watchMin?: number;
  watchMax?: number;
  // Target value (for opportunity alerts)
  target?: number;
  // Trend direction that's "good" - increasing or decreasing
  goodDirection?: "up" | "down" | "stable";
}

// Time granularity for metric values
export const metricGranularityEnum = pgEnum("metric_granularity", [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

// KPI values - time-series data for each KPI
export const kpiValue = pgTable(
  "kpi_value",
  {
    id: text("id").primaryKey(),
    kpiDefinitionId: text("kpi_definition_id")
      .notNull()
      .references(() => kpiDefinition.id, { onDelete: "cascade" }),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    // The actual value
    value: numeric("value", { precision: 20, scale: 4 }).notNull(),

    // When this value was recorded
    recordedAt: timestamp("recorded_at").notNull(),
    granularity: metricGranularityEnum("granularity").default("daily").notNull(),

    // Source of the data
    source: text("source").default("manual"), // manual, stripe, hubspot, etc.
    sourceId: text("source_id"), // External ID from the source

    // Optional notes
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("kpi_value_kpi_idx").on(table.kpiDefinitionId),
    index("kpi_value_company_idx").on(table.companyId),
    index("kpi_value_recorded_idx").on(table.recordedAt),
    index("kpi_value_source_idx").on(table.source),
  ]
);

// Relations
export const kpiDefinitionRelations = relations(
  kpiDefinition,
  ({ one, many }) => ({
    company: one(company, {
      fields: [kpiDefinition.companyId],
      references: [company.id],
    }),
    values: many(kpiValue),
  })
);

export const kpiValueRelations = relations(kpiValue, ({ one }) => ({
  kpiDefinition: one(kpiDefinition, {
    fields: [kpiValue.kpiDefinitionId],
    references: [kpiDefinition.id],
  }),
  company: one(company, {
    fields: [kpiValue.companyId],
    references: [company.id],
  }),
}));
