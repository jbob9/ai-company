import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import {
  createAIService,
  type CompanyContext,
  type DepartmentContext,
  type MetricData,
} from "@ai-company/ai";
import { db } from "@ai-company/db";
import { company, companyMember } from "@ai-company/db/schema/companies";
import {
  aiConversation,
  aiMessage,
  type AIMessageMetadata,
} from "@ai-company/db/schema/conversations";
import {
  department,
  departmentDocument,
  departmentTypeEnum,
} from "@ai-company/db/schema/departments";
import { kpiDefinition, kpiValue } from "@ai-company/db/schema/metrics";
import { env } from "@ai-company/env/server";
import { protectedProcedure, router } from "../index";

async function checkCompanyAccess(userId: string, companyId: string) {
  const membership = await db.query.companyMember.findFirst({
    where: and(
      eq(companyMember.companyId, companyId),
      eq(companyMember.userId, userId),
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

function getAIService() {
  const provider = env.AI_PROVIDER;

  const keyMap: Record<string, string | undefined> = {
    gemini: env.GOOGLE_AI_API_KEY,
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
  };

  const apiKey = keyMap[provider];
  if (!apiKey) {
    const envVar =
      provider === "gemini"
        ? "GOOGLE_AI_API_KEY"
        : provider === "openai"
          ? "OPENAI_API_KEY"
          : "ANTHROPIC_API_KEY";
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `AI service not configured. Set ${envVar} for the "${provider}" provider.`,
    });
  }

  return createAIService({ provider, apiKey });
}

async function getCompanyContext(companyId: string): Promise<CompanyContext> {
  const comp = await db.query.company.findFirst({
    where: eq(company.id, companyId),
  });

  if (!comp) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Company not found",
    });
  }

  return {
    name: comp.name,
    stage: comp.stage,
    employeeCount: comp.employeeCount ?? undefined,
    arrCents: comp.arrCents ?? undefined,
    runwayMonths: comp.runwayMonths ?? undefined,
    industry: comp.industry ?? undefined,
  };
}

async function getDepartmentContext(
  companyId: string,
  departmentType: (typeof departmentTypeEnum.enumValues)[number],
): Promise<DepartmentContext> {
  const comp = await db.query.company.findFirst({
    where: eq(company.id, companyId),
  });

  if (!comp) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Company not found",
    });
  }

  const dept = await db.query.department.findFirst({
    where: and(
      eq(department.companyId, companyId),
      eq(department.type, departmentType),
    ),
  });

  let documents: { category: string; title: string; content: string }[] = [];
  if (dept) {
    const docs = await db.query.departmentDocument.findMany({
      where: eq(departmentDocument.departmentId, dept.id),
      orderBy: (d, { asc }) => [asc(d.sortOrder), asc(d.createdAt)],
    });
    documents = docs
      .filter((d) => d.content.trim().length > 0)
      .map((d) => ({
        category: d.category,
        title: d.title,
        content: d.content,
      }));
  }

  return {
    departmentType,
    companyName: comp.name,
    companyStage: comp.stage,
    headcount: dept?.headcount ? parseInt(dept.headcount) : undefined,
    goals: (dept?.goals as string[]) ?? undefined,
    customInstructions: dept?.context ?? undefined,
    documents,
  };
}

async function getDepartmentMetrics(
  companyId: string,
  departmentType: (typeof departmentTypeEnum.enumValues)[number],
): Promise<MetricData[]> {
  const definitions = await db.query.kpiDefinition.findMany({
    where: and(
      eq(kpiDefinition.companyId, companyId),
      eq(kpiDefinition.departmentType, departmentType),
    ),
    with: {
      values: {
        orderBy: [desc(kpiValue.recordedAt)],
        limit: 2,
      },
    },
  });

  return definitions.map((def) => {
    const [latest, previous] = def.values;
    const latestValue = latest ? Number(latest.value) : 0;
    const previousValue = previous ? Number(previous.value) : undefined;

    let trend: "up" | "down" | "stable" = "stable";
    let changePercent: number | undefined;

    if (previousValue !== undefined && previousValue !== 0) {
      changePercent =
        ((latestValue - previousValue) / Math.abs(previousValue)) * 100;
      if (changePercent > 1) trend = "up";
      else if (changePercent < -1) trend = "down";
    }

    return {
      name: def.name,
      slug: def.slug,
      value: latestValue,
      previousValue,
      unit: def.unit ?? undefined,
      trend,
      changePercent,
      recordedAt: latest?.recordedAt ?? new Date(),
    };
  });
}

export const aiRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
        conversationId: z.string().optional(),
        message: z.string().min(1).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const aiService = getAIService();

      let conversationId = input.conversationId;
      let history: Array<{ role: "user" | "assistant"; content: string }> = [];

      if (conversationId) {
        const existingConversation = await db.query.aiConversation.findFirst({
          where: eq(aiConversation.id, conversationId),
          with: {
            messages: {
              orderBy: [desc(aiMessage.createdAt)],
              limit: 20,
            },
          },
        });

        if (existingConversation) {
          history = existingConversation.messages
            .filter((m) => m.role !== "system")
            .reverse()
            .map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }));
        }
      } else {
        conversationId = nanoid();
        const title = input.message.slice(0, 80).trim();
        await db.insert(aiConversation).values({
          id: conversationId,
          companyId: input.companyId,
          userId: ctx.session.user.id,
          departmentType: input.departmentType,
          title: title || "New chat",
        });
      }

      await db.insert(aiMessage).values({
        id: nanoid(),
        conversationId,
        role: "user",
        content: input.message,
      });

      let response;
      if (input.departmentType) {
        const deptContext = await getDepartmentContext(
          input.companyId,
          input.departmentType,
        );
        const metrics = await getDepartmentMetrics(
          input.companyId,
          input.departmentType,
        );

        const agent = aiService.getDepartmentAgent(
          input.companyId,
          deptContext,
          metrics,
        );
        response = await agent.chat(input.message, history);
      } else {
        const companyContext = await getCompanyContext(input.companyId);
        const orchestrator = aiService.getOrchestrationAgent(
          input.companyId,
          companyContext,
        );
        response = await orchestrator.chat(input.message, history);
      }

      await db.insert(aiMessage).values({
        id: nanoid(),
        conversationId,
        role: "assistant",
        content: response.content,
        aiMetadata: {
          model: response.metadata.model,
          inputTokens: response.metadata.inputTokens,
          outputTokens: response.metadata.outputTokens,
          responseTimeMs: response.metadata.responseTimeMs,
        } as AIMessageMetadata,
      });

      return {
        conversationId,
        content: response.content,
        metadata: response.metadata,
      };
    }),

  analyzeDepartment: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const aiService = getAIService();

      const deptContext = await getDepartmentContext(
        input.companyId,
        input.departmentType,
      );
      const metrics = await getDepartmentMetrics(
        input.companyId,
        input.departmentType,
      );

      const analysis = await aiService.analyzeDepartment(
        input.companyId,
        deptContext,
        metrics,
      );

      return analysis;
    }),

  analyzeCompany: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const aiService = getAIService();
      const companyContext = await getCompanyContext(input.companyId);

      const departments = await db.query.department.findMany({
        where: and(
          eq(department.companyId, input.companyId),
          eq(department.aiEnabled, true),
        ),
      });

      const departmentData = await Promise.all(
        departments.map(async (dept) => {
          const deptContext = await getDepartmentContext(
            input.companyId,
            dept.type,
          );
          const metrics = await getDepartmentMetrics(
            input.companyId,
            dept.type,
          );
          return { context: deptContext, metrics };
        }),
      );

      const result = await aiService.analyzeCompany(
        input.companyId,
        companyContext,
        departmentData,
      );

      return result;
    }),

  generateRecommendations: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const aiService = getAIService();
      const companyContext = await getCompanyContext(input.companyId);

      if (input.departmentType) {
        const deptContext = await getDepartmentContext(
          input.companyId,
          input.departmentType,
        );
        const metrics = await getDepartmentMetrics(
          input.companyId,
          input.departmentType,
        );

        return aiService.getDepartmentRecommendations(
          input.companyId,
          deptContext,
          companyContext,
          metrics,
        );
      } else {
        const departments = await db.query.department.findMany({
          where: and(
            eq(department.companyId, input.companyId),
            eq(department.aiEnabled, true),
          ),
        });

        const departmentAnalyses = await Promise.all(
          departments.map(async (dept) => {
            const deptContext = await getDepartmentContext(
              input.companyId,
              dept.type,
            );
            const metrics = await getDepartmentMetrics(
              input.companyId,
              dept.type,
            );
            return aiService.analyzeDepartment(
              input.companyId,
              deptContext,
              metrics,
            );
          }),
        );

        return aiService.getCompanyRecommendations(
          input.companyId,
          companyContext,
          departmentAnalyses,
        );
      }
    }),

  listConversations: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.enum(departmentTypeEnum.enumValues).optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const conditions = [
        eq(aiConversation.companyId, input.companyId),
        eq(aiConversation.userId, ctx.session.user.id),
      ];

      if (input.departmentType) {
        conditions.push(
          eq(aiConversation.departmentType, input.departmentType),
        );
      }

      return db.query.aiConversation.findMany({
        where: and(...conditions),
        orderBy: [desc(aiConversation.updatedAt)],
        limit: input.limit ?? 20,
      });
    }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await db.query.aiConversation.findFirst({
        where: eq(aiConversation.id, input.id),
        with: {
          messages: {
            orderBy: [desc(aiMessage.createdAt)],
          },
        },
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, conversation.companyId);

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return {
        ...conversation,
        messages: conversation.messages.reverse(),
      };
    }),

  listMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
        before: z.string().datetime().optional(), // ISO date: fetch messages older than this (for "load more" at top)
      }),
    )
    .query(async ({ ctx, input }) => {
      const conversation = await db.query.aiConversation.findFirst({
        where: eq(aiConversation.id, input.conversationId),
      });
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
      await checkCompanyAccess(ctx.session.user.id, conversation.companyId);
      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const conditions = [eq(aiMessage.conversationId, input.conversationId)];
      if (input.before) {
        conditions.push(lt(aiMessage.createdAt, new Date(input.before)));
      }
      const raw = await db.query.aiMessage.findMany({
        where: and(...conditions),
        orderBy: [desc(aiMessage.createdAt)],
        limit: input.limit + 1,
      });
      const hasMore = raw.length > input.limit;
      const page = hasMore ? raw.slice(0, input.limit) : raw;
      const messages = [...page].reverse(); // chronological order for display
      return {
        messages,
        hasMore,
      };
    }),

  updateConversation: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await db.query.aiConversation.findFirst({
        where: eq(aiConversation.id, input.id),
      });
      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }
      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }
      if (input.title !== undefined) {
        await db
          .update(aiConversation)
          .set({ title: input.title, updatedAt: new Date() })
          .where(eq(aiConversation.id, input.id));
      }
      return { success: true };
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await db.query.aiConversation.findFirst({
        where: eq(aiConversation.id, input.id),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      if (conversation.userId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      await db.delete(aiConversation).where(eq(aiConversation.id, input.id));

      return { success: true };
    }),
});
