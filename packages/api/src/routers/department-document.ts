import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { companyMember } from "@ai-company/db/schema/companies";
import {
  department,
  departmentDocument,
  documentCategoryEnum,
} from "@ai-company/db/schema/departments";

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

async function getDepartmentWithAccess(userId: string, departmentId: string) {
  const dept = await db.query.department.findFirst({
    where: eq(department.id, departmentId),
  });

  if (!dept) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Department not found",
    });
  }

  const membership = await checkCompanyAccess(userId, dept.companyId);
  return { dept, membership };
}

export const departmentDocumentRouter = router({
  list: protectedProcedure
    .input(z.object({ departmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { dept } = await getDepartmentWithAccess(
        ctx.session.user.id,
        input.departmentId
      );

      return db.query.departmentDocument.findMany({
        where: eq(departmentDocument.departmentId, dept.id),
        orderBy: [
          asc(departmentDocument.sortOrder),
          asc(departmentDocument.createdAt),
        ],
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await db.query.departmentDocument.findFirst({
        where: eq(departmentDocument.id, input.id),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      await getDepartmentWithAccess(ctx.session.user.id, doc.departmentId);
      return doc;
    }),

  create: protectedProcedure
    .input(
      z.object({
        departmentId: z.string(),
        category: z.enum(documentCategoryEnum.enumValues),
        title: z.string().min(1).max(255),
        content: z.string().default(""),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { dept, membership } = await getDepartmentWithAccess(
        ctx.session.user.id,
        input.departmentId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create documents",
        });
      }

      const docId = nanoid();
      await db.insert(departmentDocument).values({
        id: docId,
        departmentId: dept.id,
        category: input.category,
        title: input.title,
        content: input.content,
        sortOrder: input.sortOrder,
      });

      return db.query.departmentDocument.findFirst({
        where: eq(departmentDocument.id, docId),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        category: z.enum(documentCategoryEnum.enumValues).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await db.query.departmentDocument.findFirst({
        where: eq(departmentDocument.id, input.id),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const { membership } = await getDepartmentWithAccess(
        ctx.session.user.id,
        doc.departmentId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update documents",
        });
      }

      const { id, ...updateData } = input;
      await db
        .update(departmentDocument)
        .set(updateData)
        .where(eq(departmentDocument.id, id));

      return db.query.departmentDocument.findFirst({
        where: eq(departmentDocument.id, id),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await db.query.departmentDocument.findFirst({
        where: eq(departmentDocument.id, input.id),
      });

      if (!doc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const { membership } = await getDepartmentWithAccess(
        ctx.session.user.id,
        doc.departmentId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete documents",
        });
      }

      await db
        .delete(departmentDocument)
        .where(eq(departmentDocument.id, input.id));

      return { success: true };
    }),

  listByCompanyAndType: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        departmentType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const dept = await db.query.department.findFirst({
        where: and(
          eq(department.companyId, input.companyId),
          eq(department.type, input.departmentType as any)
        ),
      });

      if (!dept) return [];

      return db.query.departmentDocument.findMany({
        where: eq(departmentDocument.departmentId, dept.id),
        orderBy: [
          asc(departmentDocument.sortOrder),
          asc(departmentDocument.createdAt),
        ],
      });
    }),
});
