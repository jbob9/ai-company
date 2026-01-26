import { z } from "zod";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { companyMember } from "@ai-company/db/schema/companies";
import { departmentTypeEnum } from "@ai-company/db/schema/departments";
import {
  kpiDefinition,
  kpiValue,
  metricGranularityEnum,
  type KpiThresholds,
} from "@ai-company/db/schema/metrics";

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

const createKpiInput = z.object({
  companyId: z.string(),
  departmentType: z.enum(departmentTypeEnum.enumValues),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  unit: z.string().max(50).optional(),
  unitPosition: z.enum(["prefix", "suffix"]).optional(),
  thresholds: z
    .object({
      criticalMin: z.number().optional(),
      criticalMax: z.number().optional(),
      warningMin: z.number().optional(),
      warningMax: z.number().optional(),
      target: z.number().optional(),
      goodDirection: z.enum(["up", "down", "stable"]).optional(),
    })
    .optional(),
  decimalPlaces: z.number().int().min(0).max(10).optional(),
});

export const metricsRouter = router({
  listDefinitions: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const conditions = [eq(kpiDefinition.companyId, input.companyId)];
      if (input.departmentType) {
        conditions.push(eq(kpiDefinition.departmentType, input.departmentType));
      }

      const definitions = await db.query.kpiDefinition.findMany({
        where: and(...conditions),
        orderBy: [desc(kpiDefinition.departmentType)],
      });

      return definitions;
    }),

  getDefinition: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.id),
        with: {
          values: {
            orderBy: [desc(kpiValue.recordedAt)],
            limit: 30,
          },
        },
      });

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KPI definition not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, definition.companyId);
      return definition;
    }),

  createDefinition: protectedProcedure
    .input(createKpiInput)
    .mutation(async ({ ctx, input }) => {
      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        input.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create KPI definitions",
        });
      }

      const existing = await db.query.kpiDefinition.findFirst({
        where: and(
          eq(kpiDefinition.companyId, input.companyId),
          eq(kpiDefinition.slug, input.slug)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A KPI with this slug already exists",
        });
      }

      const id = nanoid();

      await db.insert(kpiDefinition).values({
        id,
        companyId: input.companyId,
        departmentType: input.departmentType,
        name: input.name,
        slug: input.slug,
        description: input.description,
        unit: input.unit,
        unitPosition: input.unitPosition ?? "suffix",
        thresholds: input.thresholds as KpiThresholds,
        decimalPlaces: input.decimalPlaces ?? 2,
      });

      return db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, id),
      });
    }),

  updateDefinition: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(500).optional(),
        unit: z.string().max(50).optional(),
        thresholds: z
          .object({
            criticalMin: z.number().optional(),
            criticalMax: z.number().optional(),
            warningMin: z.number().optional(),
            warningMax: z.number().optional(),
            target: z.number().optional(),
            goodDirection: z.enum(["up", "down", "stable"]).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.id),
      });

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KPI definition not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        definition.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update KPI definitions",
        });
      }

      const { id, thresholds, ...rest } = input;

      await db
        .update(kpiDefinition)
        .set({
          ...rest,
          ...(thresholds && { thresholds: thresholds as KpiThresholds }),
        })
        .where(eq(kpiDefinition.id, id));

      return db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, id),
      });
    }),

  deleteDefinition: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.id),
      });

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KPI definition not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        definition.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete KPI definitions",
        });
      }

      await db.delete(kpiDefinition).where(eq(kpiDefinition.id, input.id));
      return { success: true };
    }),

  recordValue: protectedProcedure
    .input(
      z.object({
        kpiDefinitionId: z.string(),
        value: z.number(),
        recordedAt: z.string().datetime().optional(),
        granularity: z.enum(metricGranularityEnum.enumValues).optional(),
        source: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.kpiDefinitionId),
      });

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KPI definition not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, definition.companyId);

      const id = nanoid();
      const recordedAt = input.recordedAt
        ? new Date(input.recordedAt)
        : new Date();

      await db.insert(kpiValue).values({
        id,
        kpiDefinitionId: input.kpiDefinitionId,
        companyId: definition.companyId,
        value: String(input.value),
        recordedAt,
        granularity: input.granularity ?? "daily",
        source: input.source ?? "manual",
        notes: input.notes,
      });

      return db.query.kpiValue.findFirst({
        where: eq(kpiValue.id, id),
      });
    }),

  bulkRecordValues: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        values: z.array(
          z.object({
            slug: z.string(),
            value: z.number(),
            recordedAt: z.string().datetime().optional(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const definitions = await db.query.kpiDefinition.findMany({
        where: eq(kpiDefinition.companyId, input.companyId),
      });

      const defBySlug = new Map(definitions.map((d) => [d.slug, d]));
      const valuesToInsert = [];
      const errors: string[] = [];

      for (const v of input.values) {
        const def = defBySlug.get(v.slug);
        if (!def) {
          errors.push("Unknown KPI slug: " + v.slug);
          continue;
        }

        valuesToInsert.push({
          id: nanoid(),
          kpiDefinitionId: def.id,
          companyId: input.companyId,
          value: String(v.value),
          recordedAt: v.recordedAt ? new Date(v.recordedAt) : new Date(),
          granularity: "daily" as const,
          source: "manual",
          notes: v.notes,
        });
      }

      if (valuesToInsert.length > 0) {
        await db.insert(kpiValue).values(valuesToInsert);
      }

      return { recorded: valuesToInsert.length, errors };
    }),

  getHistory: protectedProcedure
    .input(
      z.object({
        kpiDefinitionId: z.string(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(365).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.kpiDefinitionId),
      });

      if (!definition) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "KPI definition not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, definition.companyId);

      const conditions = [eq(kpiValue.kpiDefinitionId, input.kpiDefinitionId)];

      if (input.startDate) {
        conditions.push(gte(kpiValue.recordedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(kpiValue.recordedAt, new Date(input.endDate)));
      }

      return db.query.kpiValue.findMany({
        where: and(...conditions),
        orderBy: [desc(kpiValue.recordedAt)],
        limit: input.limit ?? 30,
      });
    }),

  getLatestValues: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const conditions = [eq(kpiDefinition.companyId, input.companyId)];
      if (input.departmentType) {
        conditions.push(eq(kpiDefinition.departmentType, input.departmentType));
      }

      const definitions = await db.query.kpiDefinition.findMany({
        where: and(...conditions),
        with: {
          values: {
            orderBy: [desc(kpiValue.recordedAt)],
            limit: 2,
          },
        },
      });

      return definitions.map((def) => {
        const [latest, previous] = def.values;
        const latestValue = latest ? Number(latest.value) : null;
        const previousValue = previous ? Number(previous.value) : null;

        let trend: "up" | "down" | "stable" = "stable";
        let changePercent: number | null = null;

        if (
          latestValue !== null &&
          previousValue !== null &&
          previousValue !== 0
        ) {
          changePercent =
            ((latestValue - previousValue) / Math.abs(previousValue)) * 100;
          if (changePercent > 1) trend = "up";
          else if (changePercent < -1) trend = "down";
        }

        return {
          id: def.id,
          name: def.name,
          slug: def.slug,
          departmentType: def.departmentType,
          unit: def.unit,
          value: latestValue,
          previousValue,
          trend,
          changePercent,
          recordedAt: latest?.recordedAt ?? null,
          thresholds: def.thresholds,
        };
      });
    }),
});
