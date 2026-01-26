import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { companyMember } from "@ai-company/db/schema/companies";
import { departmentTypeEnum } from "@ai-company/db/schema/departments";
import {
  alert,
  alertSeverityEnum,
  alertStatusEnum,
  type AlertDetails,
} from "@ai-company/db/schema/alerts";
import { checkAlertsForCompany, checkOpportunityAlerts } from "../services/alert-checker";

// Helper to check company membership
async function checkCompanyAccess(userId: string, companyId: string) {
  const membership = await db.query.companyMember.findFirst({
    where: and(
      eq(companyMember.companyId, companyId),
      eq(companyMember.userId, userId)
    ),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied",
    });
  }

  return membership;
}

// Validation schemas
const createAlertInput = z.object({
  companyId: z.string(),
  departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
  kpiDefinitionId: z.string().optional(),
  severity: z.enum(alertSeverityEnum.enumValues),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(2000),
  details: z
    .object({
      thresholdType: z
        .enum(["criticalMin", "criticalMax", "warningMin", "warningMax"])
        .optional(),
      previousValue: z.number().optional(),
      changePercent: z.number().optional(),
      relatedMetrics: z
        .array(
          z.object({
            name: z.string(),
            value: z.number(),
            trend: z.enum(["up", "down", "stable"]),
          })
        )
        .optional(),
      affectedDepartments: z.array(z.string()).optional(),
    })
    .optional(),
  triggerValue: z.string().optional(),
  thresholdValue: z.string().optional(),
  aiInsight: z.string().optional(),
  aiRecommendation: z.string().optional(),
});

export const alertsRouter = router({
  // List alerts for a company
  list: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        status: z.array(z.enum(alertStatusEnum.enumValues)).optional(),
        severity: z.array(z.enum(alertSeverityEnum.enumValues)).optional(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const conditions = [eq(alert.companyId, input.companyId)];

      if (input.status && input.status.length > 0) {
        conditions.push(inArray(alert.status, input.status));
      }
      if (input.severity && input.severity.length > 0) {
        conditions.push(inArray(alert.severity, input.severity));
      }
      if (input.departmentType) {
        conditions.push(eq(alert.departmentType, input.departmentType));
      }

      const alerts = await db.query.alert.findMany({
        where: and(...conditions),
        orderBy: [desc(alert.createdAt)],
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
        with: {
          kpiDefinition: true,
        },
      });

      return alerts;
    }),

  // Get a single alert
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const alertRecord = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
        with: {
          kpiDefinition: true,
          acknowledgedByUser: true,
          resolvedByUser: true,
        },
      });

      if (!alertRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, alertRecord.companyId);

      return alertRecord;
    }),

  // Create an alert (usually done by the system, but can be manual)
  create: protectedProcedure
    .input(createAlertInput)
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const id = nanoid();

      await db.insert(alert).values({
        id,
        companyId: input.companyId,
        departmentType: input.departmentType,
        kpiDefinitionId: input.kpiDefinitionId,
        severity: input.severity,
        status: "active",
        title: input.title,
        message: input.message,
        details: input.details as AlertDetails,
        triggerValue: input.triggerValue,
        thresholdValue: input.thresholdValue,
        aiInsight: input.aiInsight,
        aiRecommendation: input.aiRecommendation,
      });

      const created = await db.query.alert.findFirst({
        where: eq(alert.id, id),
      });

      return created;
    }),

  // Acknowledge an alert
  acknowledge: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const alertRecord = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      if (!alertRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, alertRecord.companyId);

      await db
        .update(alert)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.session.user.id,
        })
        .where(eq(alert.id, input.id));

      const updated = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      return updated;
    }),

  // Resolve an alert
  resolve: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolutionNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const alertRecord = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      if (!alertRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, alertRecord.companyId);

      await db
        .update(alert)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolvedBy: ctx.session.user.id,
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(alert.id, input.id));

      const updated = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      return updated;
    }),

  // Dismiss an alert
  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const alertRecord = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      if (!alertRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, alertRecord.companyId);

      await db
        .update(alert)
        .set({
          status: "dismissed",
        })
        .where(eq(alert.id, input.id));

      const updated = await db.query.alert.findFirst({
        where: eq(alert.id, input.id),
      });

      return updated;
    }),

  // Bulk acknowledge alerts
  bulkAcknowledge: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.ids.length === 0) {
        return { updated: 0 };
      }

      // Verify access to all alerts
      const alerts = await db.query.alert.findMany({
        where: inArray(alert.id, input.ids),
      });

      const companyIds = [...new Set(alerts.map((a) => a.companyId))];
      for (const companyId of companyIds) {
        await checkCompanyAccess(ctx.session.user.id, companyId);
      }

      await db
        .update(alert)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.session.user.id,
        })
        .where(inArray(alert.id, input.ids));

      return { updated: input.ids.length };
    }),

  // Get alert counts by status
  getCounts: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const alerts = await db.query.alert.findMany({
        where: eq(alert.companyId, input.companyId),
        columns: { status: true, severity: true },
      });

      const byStatus = {
        active: 0,
        acknowledged: 0,
        resolved: 0,
        dismissed: 0,
      };

      const bySeverity = {
        critical: 0,
        warning: 0,
        watch: 0,
        opportunity: 0,
      };

      for (const a of alerts) {
        byStatus[a.status]++;
        if (a.status === "active" || a.status === "acknowledged") {
          bySeverity[a.severity]++;
        }
      }

      return {
        byStatus,
        bySeverity,
        total: alerts.length,
        activeCount: byStatus.active + byStatus.acknowledged,
      };
    }),

  // Check alerts for a company (scan metrics against thresholds)
  checkAlerts: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const thresholdResult = await checkAlertsForCompany(input.companyId);
      const opportunityResult = await checkOpportunityAlerts(input.companyId);

      return {
        checked: thresholdResult.checked,
        alertsCreated: thresholdResult.created + opportunityResult.created,
      };
    }),
});
