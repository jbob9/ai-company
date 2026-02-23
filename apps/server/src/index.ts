import { createContext } from "@ai-company/api/context";
import { appRouter } from "@ai-company/api/routers/index";
import { auth } from "@ai-company/auth";
import { env } from "@ai-company/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";
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
import {
  getModel,
  getDepartmentSystemPrompt,
  getOrchestrationSystemPrompt,
  type DepartmentContext,
  type CompanyContext,
  type MetricData,
} from "@ai-company/ai";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "User-Agent",
      "Accept",
      "Accept-Language",
      "Cache-Control",
      "X-Requested-With",
    ],
    exposeHeaders: ["Content-Type", "X-Vercel-AI-Data-Stream"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// --- Helpers for /api/chat ---

function getLanguageModel() {
  const provider = env.AI_PROVIDER;
  const keyMap: Record<string, string | undefined> = {
    gemini: env.GOOGLE_AI_API_KEY,
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
  };
  const apiKey = keyMap[provider];
  if (!apiKey) {
    throw new Error(`AI not configured for provider "${provider}"`);
  }
  return getModel(provider, apiKey);
}

async function loadCompanyContext(companyId: string): Promise<CompanyContext> {
  const comp = await db.query.company.findFirst({
    where: eq(company.id, companyId),
  });
  if (!comp) throw new Error("Company not found");
  return {
    name: comp.name,
    stage: comp.stage,
    employeeCount: comp.employeeCount ?? undefined,
    arrCents: comp.arrCents ?? undefined,
    runwayMonths: comp.runwayMonths ?? undefined,
    industry: comp.industry ?? undefined,
  };
}

async function loadDepartmentContext(
  companyId: string,
  departmentType: (typeof departmentTypeEnum.enumValues)[number],
): Promise<DepartmentContext> {
  const comp = await db.query.company.findFirst({
    where: eq(company.id, companyId),
  });
  if (!comp) throw new Error("Company not found");

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
      .map((d) => ({ category: d.category, title: d.title, content: d.content }));
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

async function loadDepartmentMetrics(
  companyId: string,
  departmentType: (typeof departmentTypeEnum.enumValues)[number],
): Promise<MetricData[]> {
  const definitions = await db.query.kpiDefinition.findMany({
    where: and(
      eq(kpiDefinition.companyId, companyId),
      eq(kpiDefinition.departmentType, departmentType),
    ),
    with: {
      values: { orderBy: [desc(kpiValue.recordedAt)], limit: 2 },
    },
  });

  return definitions.map((def) => {
    const [latest, previous] = def.values;
    const latestValue = latest ? Number(latest.value) : 0;
    const previousValue = previous ? Number(previous.value) : undefined;
    let trend: "up" | "down" | "stable" = "stable";
    let changePercent: number | undefined;
    if (previousValue !== undefined && previousValue !== 0) {
      changePercent = ((latestValue - previousValue) / Math.abs(previousValue)) * 100;
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

// --- Streaming chat endpoint ---

app.post("/api/chat", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const userId = session.user.id;

  const body = await c.req.json();
  const {
    messages: uiMessages,
    companyId,
    departmentType,
    conversationId: incomingConversationId,
  } = body as {
    messages: UIMessage[];
    companyId: string;
    departmentType?: string;
    conversationId?: string;
  };

  if (!companyId || !uiMessages?.length) {
    return c.json({ error: "Missing companyId or messages" }, 400);
  }

  const membership = await db.query.companyMember.findFirst({
    where: and(
      eq(companyMember.companyId, companyId),
      eq(companyMember.userId, userId),
    ),
  });
  if (!membership) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Resolve or create conversation
  let conversationId = incomingConversationId;
  if (!conversationId) {
    conversationId = nanoid();
    const lastUserMsg = uiMessages.findLast((m) => m.role === "user");
    const rawText = lastUserMsg?.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ") ?? "New chat";
    const title = rawText.slice(0, 80).trim() || "New chat";

    await db.insert(aiConversation).values({
      id: conversationId,
      companyId,
      userId,
      departmentType: departmentType as any ?? null,
      title,
    });
  }

  // Save the latest user message to DB
  const lastUserMsg = uiMessages.findLast((m) => m.role === "user");
  if (lastUserMsg) {
    const textContent = lastUserMsg.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n") ?? "";

    await db.insert(aiMessage).values({
      id: nanoid(),
      conversationId,
      role: "user",
      content: textContent,
    });
  }

  // Build system prompt
  let systemPrompt: string;
  if (departmentType && departmentTypeEnum.enumValues.includes(departmentType as any)) {
    const deptType = departmentType as (typeof departmentTypeEnum.enumValues)[number];
    const deptContext = await loadDepartmentContext(companyId, deptType);
    const metrics = await loadDepartmentMetrics(companyId, deptType);
    systemPrompt = getDepartmentSystemPrompt(deptContext, metrics);
  } else {
    const companyContext = await loadCompanyContext(companyId);
    systemPrompt = getOrchestrationSystemPrompt(companyContext);
  }

  const model = getLanguageModel();
  const modelMessages = await convertToModelMessages(uiMessages);

  const assistantMessageId = nanoid();
  const capturedConversationId = conversationId;

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: 4096,
    temperature: 0.7,
    onFinish: async ({ text, usage }) => {
      await db.insert(aiMessage).values({
        id: assistantMessageId,
        conversationId: capturedConversationId,
        role: "assistant",
        content: text,
        aiMetadata: {
          model: model.modelId,
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
        } as AIMessageMetadata,
      });
    },
  });

  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return { conversationId: capturedConversationId };
      }
    },
  });
});

app.get("/", (c) => {
  return c.text("OK");
});

import { serve } from "@hono/node-server";

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
