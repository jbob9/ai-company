import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { companyMember } from "@ai-company/db/schema/companies";
import {
  recommendation,
  recommendationPriorityEnum,
  recommendationTypeEnum,
  recommendationStatusEnum,
  type Alternative,
  type RecommendationOutcome,
} from "@ai-company/db/schema/recommendations";

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

const createRecommendationInput = z.object({
  companyId: z.string(),
  type: z.enum(recommendationTypeEnum.enumValues),
  priority: z.enum(recommendationPriorityEnum.enumValues),
  departmentTypes: z.array(z.string()).optional(),
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(5000),
  impact: z.string().max(1000).optional(),
  effort: z.string().max(1000).optional(),
  rationale: z.string().max(2000).optional(),
  alternatives: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        tradeoffs: z.string(),
      })
    )
    .optional(),
  aiModelVersion: z.string().optional(),
  aiConfidenceScore: z.number().int().min(0).max(100).optional(),
});

export const recommendationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        status: z.array(z.enum(recommendationStatusEnum.enumValues)).optional(),
        type: z.array(z.enum(recommendationTypeEnum.enumValues)).optional(),
        priority: z
          .array(z.enum(recommendationPriorityEnum.enumValues))
          .optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const conditions = [eq(recommendation.companyId, input.companyId)];

      if (input.status && input.status.length > 0) {
        conditions.push(inArray(recommendation.status, input.status));
      }
      if (input.type && input.type.length > 0) {
        conditions.push(inArray(recommendation.type, input.type));
      }
      if (input.priority && input.priority.length > 0) {
        conditions.push(inArray(recommendation.priority, input.priority));
      }

      return db.query.recommendation.findMany({
        where: and(...conditions),
        orderBy: [desc(recommendation.createdAt)],
        limit: input.limit ?? 50,
        offset: input.offset ?? 0,
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const rec = await db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
        with: {
          decidedByUser: true,
        },
      });

      if (!rec) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, rec.companyId);
      return rec;
    }),

  create: protectedProcedure
    .input(createRecommendationInput)
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const id = nanoid();

      await db.insert(recommendation).values({
        id,
        companyId: input.companyId,
        type: input.type,
        priority: input.priority,
        departmentTypes: input.departmentTypes,
        title: input.title,
        description: input.description,
        impact: input.impact,
        effort: input.effort,
        rationale: input.rationale,
        alternatives: input.alternatives as Alternative[],
        aiModelVersion: input.aiModelVersion,
        aiConfidenceScore: input.aiConfidenceScore,
        status: "pending",
      });

      return db.query.recommendation.findFirst({
        where: eq(recommendation.id, id),
      });
    }),

  accept: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        decisionNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });

      if (!rec) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        rec.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can accept recommendations",
        });
      }

      await db
        .update(recommendation)
        .set({
          status: "accepted",
          decidedAt: new Date(),
          decidedBy: ctx.session.user.id,
          decisionNotes: input.decisionNotes,
        })
        .where(eq(recommendation.id, input.id));

      return db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });
    }),

  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        decisionNotes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });

      if (!rec) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        rec.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can reject recommendations",
        });
      }

      await db
        .update(recommendation)
        .set({
          status: "rejected",
          decidedAt: new Date(),
          decidedBy: ctx.session.user.id,
          decisionNotes: input.decisionNotes,
        })
        .where(eq(recommendation.id, input.id));

      return db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });
    }),

  startImplementation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rec = await db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });

      if (!rec) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, rec.companyId);

      if (rec.status !== "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only accepted recommendations can be implemented",
        });
      }

      await db
        .update(recommendation)
        .set({
          status: "implementing",
          implementationStartedAt: new Date(),
        })
        .where(eq(recommendation.id, input.id));

      return db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });
    }),

  completeImplementation: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        outcome: z.object({
          success: z.boolean(),
          metricChanges: z
            .array(
              z.object({
                metricName: z.string(),
                beforeValue: z.number(),
                afterValue: z.number(),
                changePercent: z.number(),
              })
            )
            .optional(),
          feedback: z.string().optional(),
          lessonsLearned: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rec = await db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });

      if (!rec) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recommendation not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, rec.companyId);

      if (rec.status !== "implementing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only implementing recommendations can be completed",
        });
      }

      await db
        .update(recommendation)
        .set({
          status: input.outcome.success ? "completed" : "failed",
          implementationCompletedAt: new Date(),
          outcome: input.outcome as RecommendationOutcome,
        })
        .where(eq(recommendation.id, input.id));

      return db.query.recommendation.findFirst({
        where: eq(recommendation.id, input.id),
      });
    }),

  getCounts: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const recs = await db.query.recommendation.findMany({
        where: eq(recommendation.companyId, input.companyId),
        columns: { status: true, priority: true },
      });

      const byStatus = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        implementing: 0,
        completed: 0,
        failed: 0,
      };

      const byPriority = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      for (const r of recs) {
        byStatus[r.status]++;
        if (r.status === "pending") {
          byPriority[r.priority]++;
        }
      }

      return {
        byStatus,
        byPriority,
        total: recs.length,
        pendingCount: byStatus.pending,
      };
    }),
});
