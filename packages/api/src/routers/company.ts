import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import {
  company,
  companyMember,
  companyStageEnum,
} from "@ai-company/db/schema/companies";

// Validation schemas
const createCompanyInput = z.object({
  name: z.string().min(1).max(255),
  stage: z.enum(companyStageEnum.enumValues).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  employeeCount: z.number().int().min(0).optional(),
  arrCents: z.number().int().min(0).optional(),
});

const updateCompanyInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  stage: z.enum(companyStageEnum.enumValues).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().url().optional(),
  description: z.string().max(1000).optional(),
  employeeCount: z.number().int().min(0).optional(),
  arrCents: z.number().int().min(0).optional(),
  runwayMonths: z.number().int().min(0).optional(),
});

export const companyRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const memberships = await db.query.companyMember.findMany({
      where: eq(companyMember.userId, userId),
      with: {
        company: true,
      },
    });

    return memberships.map((m) => ({
      ...m.company,
      role: m.role,
    }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const membership = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.id),
          eq(companyMember.userId, userId)
        ),
        with: {
          company: true,
        },
      });

      if (!membership) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Company not found or access denied",
        });
      }

      return {
        ...membership.company,
        role: membership.role,
      };
    }),

  create: protectedProcedure
    .input(createCompanyInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const companyId = nanoid();

      await db.insert(company).values({
        id: companyId,
        name: input.name,
        stage: input.stage ?? "bootstrap",
        industry: input.industry,
        website: input.website,
        description: input.description,
        employeeCount: input.employeeCount,
        arrCents: input.arrCents,
        ownerId: userId,
      });

      await db.insert(companyMember).values({
        id: nanoid(),
        companyId,
        userId,
        role: "owner",
      });

      const newCompany = await db.query.company.findFirst({
        where: eq(company.id, companyId),
      });

      return newCompany;
    }),

  update: protectedProcedure
    .input(updateCompanyInput)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const membership = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.id),
          eq(companyMember.userId, userId)
        ),
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update company settings",
        });
      }

      const { id, ...updateData } = input;

      await db.update(company).set(updateData).where(eq(company.id, id));

      const updated = await db.query.company.findFirst({
        where: eq(company.id, id),
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const comp = await db.query.company.findFirst({
        where: eq(company.id, input.id),
      });

      if (!comp || comp.ownerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the owner can delete the company",
        });
      }

      await db.delete(company).where(eq(company.id, input.id));

      return { success: true };
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        userId: z.string(),
        role: z.enum(["admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const membership = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.companyId),
          eq(companyMember.userId, currentUserId)
        ),
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can add members",
        });
      }

      const existingMember = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.companyId),
          eq(companyMember.userId, input.userId)
        ),
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a member",
        });
      }

      await db.insert(companyMember).values({
        id: nanoid(),
        companyId: input.companyId,
        userId: input.userId,
        role: input.role,
      });

      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const membership = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.companyId),
          eq(companyMember.userId, currentUserId)
        ),
      });

      if (!membership || !["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can remove members",
        });
      }

      const comp = await db.query.company.findFirst({
        where: eq(company.id, input.companyId),
      });

      if (comp?.ownerId === input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot remove the owner",
        });
      }

      await db
        .delete(companyMember)
        .where(
          and(
            eq(companyMember.companyId, input.companyId),
            eq(companyMember.userId, input.userId)
          )
        );

      return { success: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const membership = await db.query.companyMember.findFirst({
        where: and(
          eq(companyMember.companyId, input.companyId),
          eq(companyMember.userId, userId)
        ),
      });

      if (!membership) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const members = await db.query.companyMember.findMany({
        where: eq(companyMember.companyId, input.companyId),
        with: {
          user: true,
        },
      });

      return members.map((m) => ({
        id: m.id,
        role: m.role,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
        },
      }));
    }),
});
