import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { company, companyMember } from "@ai-company/db/schema/companies";
import { kpiDefinition, kpiValue } from "@ai-company/db/schema/metrics";
import {
  createPredictionService,
  getModel,
  type CompanyContext,
} from "@ai-company/ai";
import {
  getEffectiveAIConfigForUser,
  MissingAIKeyError,
} from "../services/ai-keys";

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

async function getPredictionServiceForUser(userId: string) {
  try {
    const { provider, apiKey } = await getEffectiveAIConfigForUser(userId);
    const model = getModel(provider, apiKey);
    return createPredictionService(model);
  } catch (error) {
    if (error instanceof MissingAIKeyError) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: error.message,
      });
    }
    throw error;
  }
}

export const predictionsRouter = router({
  predictMetric: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        kpiDefinitionId: z.string(),
        forecastPeriods: z.number().int().min(1).max(12).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const definition = await db.query.kpiDefinition.findFirst({
        where: eq(kpiDefinition.id, input.kpiDefinitionId),
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

      const metricHistory = definition.values.map((v) => ({
        name: definition.name,
        slug: definition.slug,
        value: Number(v.value),
        unit: definition.unit || undefined,
        trend: "stable" as const,
        recordedAt: v.recordedAt,
      }));

      const service = await getPredictionServiceForUser(ctx.session.user.id);
      const predictions = await service.predictMetric(
        metricHistory,
        input.forecastPeriods || 3
      );

      return predictions;
    }),

  forecastRevenue: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        forecastMonths: z.number().int().min(1).max(24).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const comp = await db.query.company.findFirst({
        where: eq(company.id, input.companyId),
      });

      if (!comp) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found",
        });
      }

      const mrrDef = await db.query.kpiDefinition.findFirst({
        where: and(
          eq(kpiDefinition.companyId, input.companyId),
          eq(kpiDefinition.slug, "mrr")
        ),
        with: {
          values: {
            orderBy: [desc(kpiValue.recordedAt)],
            limit: 12,
          },
        },
      });

      const historicalRevenue = (mrrDef?.values || []).map((v) => ({
        period: v.recordedAt.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        revenue: Number(v.value),
      }));

      const context: CompanyContext = {
        name: comp.name,
        stage: comp.stage,
        employeeCount: comp.employeeCount || undefined,
        arrCents: comp.arrCents || undefined,
        runwayMonths: comp.runwayMonths || undefined,
        industry: comp.industry || undefined,
      };

      const service = await getPredictionServiceForUser(ctx.session.user.id);
      const forecasts = await service.forecastRevenue(
        historicalRevenue,
        context,
        input.forecastMonths || 6
      );

      return forecasts;
    }),

  predictDeal: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        deal: z.object({
          value: z.number(),
          stage: z.string(),
          daysInStage: z.number(),
          interactions: z.number(),
          competitorMentioned: z.boolean(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const service = await getPredictionServiceForUser(ctx.session.user.id);
      const prediction = await service.predictDealProbability(input.deal);

      return prediction;
    }),
});
