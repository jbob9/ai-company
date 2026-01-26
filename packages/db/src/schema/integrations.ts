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
import { user } from "./auth";

// Integration provider types
export const integrationProviderEnum = pgEnum("integration_provider", [
  // Revenue & Billing
  "stripe",
  // CRM
  "salesforce",
  "hubspot",
  // Project Management
  "jira",
  "linear",
  "asana",
  // Code & Engineering
  "github",
  "gitlab",
  // Analytics
  "google_analytics",
  "mixpanel",
  // Communication
  "slack",
  // Accounting
  "quickbooks",
  "xero",
  // Custom/Manual
  "manual",
  "webhook",
]);

// Integration status
export const integrationStatusEnum = pgEnum("integration_status", [
  "pending", // Setup started but not complete
  "active", // Working correctly
  "error", // Has errors
  "disconnected", // User disconnected
  "expired", // Token expired
]);

export const integration = pgTable(
  "integration",
  {
    id: text("id").primaryKey(),
    companyId: text("company_id")
      .notNull()
      .references(() => company.id, { onDelete: "cascade" }),

    provider: integrationProviderEnum("provider").notNull(),
    status: integrationStatusEnum("status").default("pending").notNull(),

    // Display name (can be customized)
    name: text("name").notNull(),

    // OAuth/API credentials (encrypted in production)
    credentials: jsonb("credentials").$type<IntegrationCredentials>(),

    // Configuration for data fetching
    config: jsonb("config").$type<IntegrationConfig>(),

    // Sync status
    lastSyncAt: timestamp("last_sync_at"),
    lastSyncError: text("last_sync_error"),
    syncEnabled: boolean("sync_enabled").default(true).notNull(),

    // Who connected this integration
    connectedBy: text("connected_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("integration_company_idx").on(table.companyId),
    index("integration_provider_idx").on(table.provider),
    index("integration_status_idx").on(table.status),
  ]
);

// Sync log for tracking data imports
export const integrationSyncLog = pgTable(
  "integration_sync_log",
  {
    id: text("id").primaryKey(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integration.id, { onDelete: "cascade" }),

    // Sync details
    startedAt: timestamp("started_at").notNull(),
    completedAt: timestamp("completed_at"),
    status: text("status").notNull(), // running, success, error
    error: text("error"),

    // What was synced
    recordsProcessed: text("records_processed"),
    metricsUpdated: text("metrics_updated"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sync_log_integration_idx").on(table.integrationId),
    index("sync_log_started_idx").on(table.startedAt),
  ]
);

// Credentials type (encrypted at rest in production)
export interface IntegrationCredentials {
  // OAuth tokens
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  // API keys
  apiKey?: string;
  apiSecret?: string;
  // Webhook secrets
  webhookSecret?: string;
  // Account identifiers
  accountId?: string;
  organizationId?: string;
}

// Integration configuration
export interface IntegrationConfig {
  // Which metrics to fetch
  enabledMetrics?: string[];
  // Sync frequency in minutes
  syncFrequencyMinutes?: number;
  // Date range for historical data
  historicalDays?: number;
  // Provider-specific settings
  providerSettings?: Record<string, unknown>;
}

// Relations
export const integrationRelations = relations(
  integration,
  ({ one, many }) => ({
    company: one(company, {
      fields: [integration.companyId],
      references: [company.id],
    }),
    connectedByUser: one(user, {
      fields: [integration.connectedBy],
      references: [user.id],
    }),
    syncLogs: many(integrationSyncLog),
  })
);

export const integrationSyncLogRelations = relations(
  integrationSyncLog,
  ({ one }) => ({
    integration: one(integration, {
      fields: [integrationSyncLog.integrationId],
      references: [integration.id],
    }),
  })
);
