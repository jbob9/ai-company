import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

import { protectedProcedure, router } from "../index";
import { db } from "@ai-company/db";
import { companyMember } from "@ai-company/db/schema/companies";
import {
  department,
  departmentDocument,
  departmentTypeEnum,
  type DepartmentAIConfig,
} from "@ai-company/db/schema/departments";
import { departmentNames } from "@ai-company/ai";
import type { DepartmentType } from "@ai-company/ai";
import { getDefaultDocuments } from "../utils/department-templates";

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

async function seedDefaultDocuments(deptId: string, deptType: DepartmentType) {
  const templates = getDefaultDocuments(deptType);
  if (templates.length > 0) {
    await db.insert(departmentDocument).values(
      templates.map((t) => ({
        id: nanoid(),
        departmentId: deptId,
        category: t.category as typeof departmentDocument.$inferInsert.category,
        title: t.title,
        content: t.content,
        sortOrder: t.sortOrder,
      }))
    );
  }
}

// Validation schemas
const createDepartmentInput = z.object({
  companyId: z.string(),
  type: z.enum(departmentTypeEnum.enumValues),
  name: z.string().min(1).max(255).optional(),
  headcount: z.string().optional(),
  goals: z.array(z.string()).optional(),
  context: z.string().max(2000).optional(),
  aiConfig: z
    .object({
      alertThresholds: z.record(z.number(), z.number()).optional(),
      customInstructions: z.string().optional(),
      notifyOnCritical: z.boolean().optional(),
      notifyOnWarning: z.boolean().optional(),
    })
    .optional(),
});

const updateDepartmentInput = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  isEnabled: z.boolean().optional(),
  headcount: z.string().optional(),
  aiEnabled: z.boolean().optional(),
  goals: z.array(z.string()).optional(),
  context: z.string().max(2000).optional(),
  aiConfig: z
    .object({
      alertThresholds: z.record(z.number(), z.number()).optional(),
      customInstructions: z.string().optional(),
      notifyOnCritical: z.boolean().optional(),
      notifyOnWarning: z.boolean().optional(),
    })
    .optional(),
});

export const departmentRouter = router({
  // List departments for a company
  list: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const departments = await db.query.department.findMany({
        where: eq(department.companyId, input.companyId),
        orderBy: (dept, { asc }) => [asc(dept.type)],
      });

      return departments;
    }),

  // Get a single department
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const dept = await db.query.department.findFirst({
        where: eq(department.id, input.id),
      });

      if (!dept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      await checkCompanyAccess(ctx.session.user.id, dept.companyId);

      return dept;
    }),

  // Get a department by company + type
  getByType: protectedProcedure
    .input(z.object({ companyId: z.string(), type: z.enum(departmentTypeEnum.enumValues) }))
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      const dept = await db.query.department.findFirst({
        where: and(
          eq(department.companyId, input.companyId),
          eq(department.type, input.type)
        ),
      });

      if (!dept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      return dept;
    }),

  // Create a new department
  create: protectedProcedure
    .input(createDepartmentInput)
    .mutation(async ({ ctx, input }) => {
      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        input.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create departments",
        });
      }

      // Check if department type already exists for this company
      const existing = await db.query.department.findFirst({
        where: and(
          eq(department.companyId, input.companyId),
          eq(department.type, input.type)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `A ${departmentNames[input.type]} department already exists`,
        });
      }

      const deptId = nanoid();

      await db.insert(department).values({
        id: deptId,
        companyId: input.companyId,
        type: input.type,
        name: input.name ?? departmentNames[input.type],
        headcount: input.headcount,
        goals: input.goals,
        context: input.context,
        aiConfig: input.aiConfig as DepartmentAIConfig,
      });

      await seedDefaultDocuments(deptId, input.type);

      const newDept = await db.query.department.findFirst({
        where: eq(department.id, deptId),
      });

      return newDept;
    }),

  // Update a department
  update: protectedProcedure
    .input(updateDepartmentInput)
    .mutation(async ({ ctx, input }) => {
      const dept = await db.query.department.findFirst({
        where: eq(department.id, input.id),
      });

      if (!dept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        dept.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update departments",
        });
      }

      const { id, ...updateData } = input;

      await db
        .update(department)
        .set(updateData as Partial<typeof department.$inferInsert>)
        .where(eq(department.id, id));

      const updated = await db.query.department.findFirst({
        where: eq(department.id, id),
      });

      return updated;
    }),

  // Delete a department
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dept = await db.query.department.findFirst({
        where: eq(department.id, input.id),
      });

      if (!dept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Department not found",
        });
      }

      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        dept.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can delete departments",
        });
      }

      await db.delete(department).where(eq(department.id, input.id));

      return { success: true };
    }),

  // Get available department types (for creating new departments)
  availableTypes: protectedProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      await checkCompanyAccess(ctx.session.user.id, input.companyId);

      // Get existing department types
      const existing = await db.query.department.findMany({
        where: eq(department.companyId, input.companyId),
        columns: { type: true },
      });

      const existingTypes = new Set(existing.map((d) => d.type));

      // Return all types with availability status
      return departmentTypeEnum.enumValues.map((type) => ({
        type,
        name: departmentNames[type],
        available: !existingTypes.has(type),
      }));
    }),

  // Initialize default departments for a company stage
  initializeForStage: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
        stage: z.enum(["bootstrap", "early", "growth", "scale"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const membership = await checkCompanyAccess(
        ctx.session.user.id,
        input.companyId
      );

      if (!["owner", "admin"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can initialize departments",
        });
      }

      // Department types recommended for each stage
      const stageDefaults: Record<string, typeof departmentTypeEnum.enumValues[number][]> = {
        bootstrap: ["product", "sales", "finance"],
        early: ["product", "engineering", "sales", "marketing", "customer_success", "finance", "operations"],
        growth: ["product", "engineering", "sales", "marketing", "customer_success", "finance", "operations", "hr", "legal", "data_analytics"],
        scale: departmentTypeEnum.enumValues,
      };

      const deptTypes = stageDefaults[input.stage] || stageDefaults.bootstrap;

      // Get existing departments
      const existing = await db.query.department.findMany({
        where: eq(department.companyId, input.companyId),
        columns: { type: true },
      });
      const existingTypes = new Set(existing.map((d) => d.type));

      // Create missing departments
      const toCreate = deptTypes?.filter((type) => !existingTypes.has(type)) ?? [];
      console.log("toCreate", toCreate);
      if (toCreate.length > 0) {
        const newDepts = toCreate.map((type) => ({
          id: nanoid(),
          companyId: input.companyId,
          type,
          name: departmentNames[type],
        }));
        await db.insert(department).values(newDepts);

        await Promise.all(
          newDepts.map((d) => seedDefaultDocuments(d.id, d.type))
        );
      }

      // Return all departments
      const departments = await db.query.department.findMany({
        where: eq(department.companyId, input.companyId),
        orderBy: (dept, { asc }) => [asc(dept.type)],
      });

      return departments;
    }),
});
