# AI Company Orchestrator — Project Context

**Use this document** to get a clean, consistent picture of what we're building, where we are, and what to do next. Share it when switching context or onboarding an AI assistant.

---

## 1. What We're Building (Vision)

**Product**: An AI-powered company management system. A central **Orchestration AI** and per-department **Department AI agents** monitor metrics, surface alerts, and give strategic recommendations. The system is **stage-aware** (Bootstrap → Early → Growth → Scale) and scales departments and intelligence as the company grows.

**Core concepts** (from `AI-Company-Orchestrator-Complete-Planning.md`):

- **Orchestration AI**: Company-wide view; synthesizes department insights; cross-department bottlenecks; strategic recommendations; when to add departments.
- **Department AI agents**: One per department (Product, Engineering, Sales, Marketing, Customer Success, Finance, Operations, HR, etc.); department KPIs, goals, documents; chat and analysis.
- **Data layer**: Company + department metrics (KPIs), alerts (threshold + AI), recommendations (tactical/strategic/resource), conversations with AI.
- **Growth stages**: Bootstrap (0–10 emp), Early (10–50), Growth (50–200), Scale (200+). Stage drives which departments exist and what the AI focuses on.

**Reference**: Full product spec, department deep dives, KPIs, alert levels, and phased roadmap are in **`AI-Company-Orchestrator-Complete-Planning.md`** at repo root.

---

## 2. Current Stage and Phase

- **Roadmap phase**: **Phase 1 (MVP)** with elements of Phase 2 started.
- **Stage**: Post–multi-company refactor. Multi-company support is **done** (selector in sidebar, URL ↔ company sync, create company → select & navigate). Current focus is **department agents, metrics, alerts, and AI chat** per company.

---

## 3. What's Implemented vs Not

### Implemented

| Area | Status | Where |
|------|--------|--------|
| **Multi-company** | Done | `CompanyProvider`, `CompanySelector` in sidebar; URL sync and redirect in `dashboard.tsx`; create company → select + navigate in `dashboard.new-company.tsx`. |
| **Auth** | Done | Auth schema + auth client; login/register; protected API. |
| **Companies** | Done | DB: `company`, `companyMember` (owner/admin/member). API: list, get, create, update, delete, members. |
| **Departments** | Done | DB: `department` (type enum: product, engineering, sales, …), `department_document` (markdown by category). API: list, getByType, create, availableTypes. Default docs seeded on department create. |
| **Department docs** | Done | Categories: role, kpis, monitoring, actions, improvements, general. CRUD API; department detail page with markdown editor/viewer (`dashboard.$companyId.departments.$type.tsx`). |
| **Metrics/KPIs** | Schema + API | DB: `kpi_definition`, `kpi_value`. API: definitions and values. **UI**: Metrics page exists; manual input / integrations not fully wired. |
| **Alerts** | Schema + API | DB: `alert` (severity, status, department, KPI, AI insight). API: list, getCounts, acknowledge, resolve. **UI**: Alerts page. Alert-checker / threshold evaluation may exist in `alert-checker` service. |
| **Recommendations** | Schema + API | DB: `recommendation` (type, priority, status, outcome for learning). API exists. **UI**: Not fully surfaced in dashboard. |
| **AI chat (streaming)** | Done | Orchestrator + per-department chat with **streaming** via AI SDK (`streamText` + `useChat`). `POST /api/chat` on Hono server; `AIHome` and chat route use `@ai-sdk/react` `useChat`. Conversations and messages stored in DB. Legacy non-streaming `ai.chat` tRPC mutation still available. |
| **AI provider keys (BYOK)** | Done | Per-user AI API keys table (`user_ai_key`) for Gemini, OpenAI, Anthropic. Encrypted at rest with `AI_KEY_ENCRYPTION_SECRET`. Resolver in `packages/api/src/services/ai-keys.ts` chooses **user key first**, then falls back to server env keys for interactive AI (chat, analysis, predictions). |
| **AI analysis** | Done | Department analysis and company-wide (orchestration) analysis endpoints; use department + company context and metrics. |
| **Integrations** | Schema only | `integration` table and enums (Stripe, HubSpot, Jira, etc.). No OAuth or sync implementation yet. |
| **Predictions** | API stub | `predictions` router present; predictive models not implemented. |

### Not implemented / Next

- **Data collection**: Manual metric input flows and **integrations** (Stripe, CRM, etc.) to populate KPI values.
- **Alert automation**: Scheduled or event-driven threshold checks that create/update alerts (beyond any existing checker).
- **Recommendations UI**: List, accept/reject, and track recommendations on dashboard.
- **Orchestration AI prominence**: Dedicated “company-wide” view and weekly digest (Phase 2).
- **Learning loop**: Recording recommendation outcomes and feeding back into models (Phase 3).
- **More Phase 2**: Full department set, scenario planning, richer analytics.

---

## 4. Repo and Tech Stack

- **Monorepo** (pnpm workspaces).
- **Apps**: `apps/web` — React (Vite), React Router (file-based), TanStack Query, tRPC client, `@ai-sdk/react` (`useChat`). `apps/server` — Hono, tRPC, streaming `/api/chat` endpoint.
- **Packages**: `packages/api` (tRPC, Node), `packages/db` (Drizzle, PostgreSQL), `packages/ai` (AI service: department + orchestration agents), `packages/auth`, `packages/env`.
- **AI SDK** (Vercel `ai` package): `packages/ai` uses `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` for model access via a unified `LanguageModel` interface. `generateText` for non-streaming (analysis, recommendations, alerts). `streamText` for streaming chat. `getModel(provider, apiKey)` returns the right `LanguageModel`. System prompts (`getDepartmentSystemPrompt`, `getOrchestrationSystemPrompt`) build rich context from company stage, department docs, and metrics.
- **Chat streaming**: `apps/server` exposes `POST /api/chat` using `streamText` + `toUIMessageStreamResponse()`. Frontend uses `useChat` from `@ai-sdk/react` with `DefaultChatTransport` pointing to that endpoint. Messages are persisted to DB in the endpoint's `onFinish` callback.
- **Non-chat AI** (analyze department/company, recommendations, alerts, predictions): Served via tRPC mutations using `generateText` internally. These use the same key-resolution logic (user key → system key) as chat.

---

## 5. Key Files (Quick Map)

| Purpose | Path |
|--------|------|
| Product vision & roadmap | `AI-Company-Orchestrator-Complete-Planning.md` |
| Multi-company plan (done) | `docs/multi-company-refactor-plan.md` |
| Dashboard layout, URL sync, outlet | `apps/web/src/routes/dashboard.tsx` |
| Company context (selected company, list) | `apps/web/src/lib/company-context.tsx` |
| Sidebar + company selector | `apps/web/src/components/dashboard/app-sidebar.tsx`, `company-selector.tsx` |
| Create company | `apps/web/src/routes/dashboard.new-company.tsx` |
| AI chat home | `apps/web/src/components/dashboard/ai-home.tsx` |
| Conversations list | `apps/web/src/components/dashboard/conversation-panel.tsx` |
| Departments list | `apps/web/src/routes/dashboard.$companyId.departments._index.tsx` |
| Department detail (docs editor) | `apps/web/src/routes/dashboard.$companyId.departments.$type.tsx` |
| API routers | `packages/api/src/routers/` (company, department, departmentDocument, metrics, alerts, recommendations, ai, predictions) |
| DB schema | `packages/db/src/schema/` (auth, companies, departments, metrics, alerts, recommendations, conversations, integrations) |
| AI service & context builders | `packages/api/src/routers/ai.ts` (e.g. `getCompanyContext`, `getDepartmentContext`, `getDepartmentMetrics`); `packages/ai` |
| AI SDK model helper | `packages/ai/src/providers/model.ts` — `getModel(provider, apiKey)` returns `LanguageModel` |
| Streaming chat endpoint | `apps/server/src/index.ts` — `POST /api/chat` with `streamText` + `toUIMessageStreamResponse()` |
| AI key resolver | `packages/api/src/services/ai-keys.ts` — `getEffectiveAIConfigForUser` (user key first, then system), `getSystemAIConfig` |

---

## 6. Objectives (What to Optimize For)

1. **Single source of truth**: This doc + `AI-Company-Orchestrator-Complete-Planning.md`. Keep this file updated when we complete a major milestone or change direction.
2. **Multi-company**: Already done. Any new feature should work in the “current company” from URL + context.
3. **Next value**: Data in → alerts and recommendations out. Priorities: (a) metric input (manual or first integration), (b) alert generation from thresholds, (c) recommendations visible and actionable in the UI.
4. **AI context quality**: Department agents use company stage, department docs (role, KPIs, monitoring, etc.), and current metrics. Keep `getDepartmentContext` and `getCompanyContext` aligned with the planning doc’s department/KPI definitions.
5. **Clean context switching**: When resuming work, read this file first; then open the specific route or package you’re changing.

---

## 7. Conventions

- **Routes**: `/dashboard` → redirect to `/dashboard/:companyId` when a company is selected. `/dashboard/new-company` → create company. `/dashboard/:companyId/departments`, `.../metrics`, `.../alerts`, `.../settings`, `.../departments/:type`, `.../chat/:chatId`.
- **Company in API**: All company-scoped tRPC calls take `companyId`; enforce membership in `protectedProcedure` (e.g. `checkCompanyAccess` in `ai.ts`).
- **Department types**: Use the enum from `packages/db/src/schema/departments.ts` (product, engineering, sales, marketing, customer_success, finance, operations, hr, legal, data_analytics, corporate_development, security_compliance). Stage can limit which are “available” for create.

---

*Last updated to reflect: AI SDK migration (Vercel `ai` package) — streaming chat via `streamText`/`useChat`, model provider abstraction via `@ai-sdk/openai`/`anthropic`/`google`, non-streaming analysis via `generateText`; per-user BYOK AI keys with encrypted storage and resolver. Multi-company refactor complete; department docs and detail page; metrics/alerts/recommendations schema and API; Phase 1 MVP in progress.*
