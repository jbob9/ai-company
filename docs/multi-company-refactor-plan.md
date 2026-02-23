# Multi-Company Refactor Plan

## Current State

The app **already supports multiple companies** at the data and API level:

- **Database**: `company` and `companyMember` tables — a user can be a member of many companies (with roles: owner, admin, member).
- **API** ([`packages/api/src/routers/company.ts`](packages/api/src/routers/company.ts)): `list` (all companies for the user), `get`, `create`, `update`, `delete`, `addMember`, `removeMember`, `listMembers`.
- **Context** ([`apps/web/src/lib/company-context.tsx`](apps/web/src/lib/company-context.tsx)): `CompanyProvider` exposes `companies`, `company` (selected), `selectCompany(companyId)`, with selection persisted in `localStorage` under `selectedCompanyId`.
- **UI component**: `CompanySelector` ([`apps/web/src/components/dashboard/company-selector.tsx`](apps/web/src/components/dashboard/company-selector.tsx)) — dropdown listing companies, current selection, and "New Company" link — **exists but is not used anywhere** in the app.

**Gap**: Users have no way to see or switch companies in the UI, and the selected company is not kept in sync with the URL when navigating.

---

## Goals

1. **Visible company switching**: User can see the current company and switch to another from the dashboard.
2. **Create new company**: User can create a new company and be taken to its dashboard (already supported by `/dashboard/new-company` and API).
3. **URL ↔ context sync**: The dashboard URL (`/dashboard/:companyId/...`) and the context’s selected company always match, so bookmarks and back/forward work correctly.

---

## Implementation Plan

### 1. Sync context from URL (URL as source of truth when on a company path)

**Where**: Dashboard layout ([`apps/web/src/routes/dashboard.tsx`](apps/web/src/routes/dashboard.tsx)), inside `DashboardInner`.

**What**: When the pathname matches `/dashboard/:companyId` (and is not `/dashboard/new-company`), and that `companyId` is in the user’s `companies` list, set context to that company so it matches the URL.

- Extract `companyId` from path (e.g. first segment after `/dashboard/`), ignoring `new-company`.
- If `companies.some(c => c.id === companyId)` and `selectedCompanyId !== companyId`, call `selectCompany(companyId)`.
- Run in a `useEffect` that depends on `location.pathname` and `companies`.

**Result**: Opening `/dashboard/companyB/departments` or using back/forward will set the selected company to `companyB`.

### 2. Add CompanySelector to the sidebar

**Where**: [`apps/web/src/components/dashboard/app-sidebar.tsx`](apps/web/src/components/dashboard/app-sidebar.tsx).

**What**: Render the existing `CompanySelector` at the top of the sidebar (e.g. directly under the "Orchestrator" branding or in place of a single static title), so the current company is visible and users can open the dropdown to switch or create a company.

**Design**: Keep the selector compact (e.g. current 200px width, truncate long names). On mobile, the sidebar is already collapsible, so the selector will appear when the menu is open.

### 3. Navigate when switching company

**Where**: [`apps/web/src/components/dashboard/company-selector.tsx`](apps/web/src/components/dashboard/company-selector.tsx).

**What**: When the user selects a company from the dropdown (not "New Company"), after calling `selectCompany(c.id)`, navigate to that company’s dashboard so the URL reflects the switch.

- Use `useNavigate()` from React Router.
- In the dropdown item `onSelect` for a company: `selectCompany(c.id)` then `navigate('/dashboard/' + c.id)`.
- Leave "New Company" as a `Link` to `/dashboard/new-company` (no navigation on select for that item).

**Result**: Switching company updates both context and URL; sub-routes (e.g. departments, settings) will then load for the new company because they use `companyId` from the URL.

### 4. New company: select and navigate

**Where**: [`apps/web/src/routes/dashboard.new-company.tsx`](apps/web/src/routes/dashboard.new-company.tsx).

**What**: After a successful `company.create` mutation, set the new company as the selected one and then navigate to its dashboard.

- In `onSuccess`: call `selectCompany(company.id)` (from `useCompany()`) then `navigate('/dashboard/' + company.id)`.
- Invalidate company list query so the new company appears in the selector.

**Result**: After creating a company, the user lands on that company’s dashboard and the selector shows it as current.

### 5. Optional: Access control when URL company is not in list

**Where**: Dashboard layout.

**What**: If the pathname contains a `companyId` that is **not** in the user’s `companies` list (e.g. old link, or no longer a member), redirect to `/dashboard` so the app can show "Create your first company" or the selector with valid companies only.

- In the same place as step 1: if path has companyId and `companies` is loaded and `!companies.some(c => c.id === companyId)`, then `navigate('/dashboard', { replace: true })`.

---

## Files to Touch

| File | Change |
|------|--------|
| [`apps/web/src/routes/dashboard.tsx`](apps/web/src/routes/dashboard.tsx) | Sync context from URL (useEffect); optional redirect when companyId not in list. |
| [`apps/web/src/components/dashboard/app-sidebar.tsx`](apps/web/src/components/dashboard/app-sidebar.tsx) | Import and render `CompanySelector` at top of sidebar. |
| [`apps/web/src/components/dashboard/company-selector.tsx`](apps/web/src/components/dashboard/company-selector.tsx) | On company select, call `selectCompany(id)` and `navigate('/dashboard/' + id)`. |
| [`apps/web/src/routes/dashboard.new-company.tsx`](apps/web/src/routes/dashboard.new-company.tsx) | In create `onSuccess`, call `selectCompany(company.id)` then navigate. |

---

## Behaviour Summary

- **Sidebar**: Shows current company name; dropdown lists all companies and "New Company". Choosing a company switches context and navigates to `/dashboard/:id`. Choosing "New Company" goes to create flow.
- **URL**: Visiting `/dashboard/companyA/...` sets the selected company to `companyA` if the user is a member. Visiting `/dashboard` with no company or invalid company shows the "Create your first company" or company list.
- **Create company**: Submitting the form creates the company, selects it, and navigates to `/dashboard/newCompanyId`.

No backend or schema changes are required; the refactor is entirely frontend and wiring of existing APIs and context.
