# CRM permissions (Portal Things RBAC)

Monday Project uses its own role-based access control stored on the **Portal Things** board. This is separate from i58finance Admin / Firestore roles and finance budgets.

## Who can open Monday Project

Still controlled by the existing email allowlist (Admin shell + `mondayApiProxy`). Unchanged.

## What they can do inside CRM

Resolved from Portal Things:

| Group / item | Purpose |
|--------------|---------|
| **Operators** | One item per CRM operator (`Kind=operator`) with Email + Payload `{ roles, status, displayName }` |
| **Config → Role Permissions** | Singleton JSON matrix: roles, permission catalog, `rolePermissions` |
| **Audit** | Append-only audit events |

### System roles

`BASIC` · `HR` · `FINANCE` · `COMMUNICATIONS` · `ADMIN` · `DEV`

Operators may have multiple roles; effective permissions are the **union**. Empty/missing roles → `BASIC`.

### Bootstrap DEV

Seeded as `BASIC` + `DEV`:

- `henry@i58global.org`
- `lesvos@i58global.org`

Optional fallback: `INITIAL_DEV_EMAIL` when seeding. Other allowlisted emails auto-provision as `BASIC` on first CRM load.

```bash
npm run seed:crm-rbac
# npm run seed:crm-rbac -- --dry-run
```

## Defaults

| Role | Access |
|------|--------|
| **BASIC** | `contacts.view`, self profile update; no HR/Finance/Users/Settings |
| **HR** | BASIC + applications / recruitment / long-term / references / confidential notes / HR docs |
| **FINANCE** | BASIC + donations / invoices / finance reports / export (not HR-confidential) |
| **COMMUNICATIONS** | BASIC + email view/send/templates/campaigns |
| **ADMIN** | Users management + normal CRM admin ops; **no** `settings.*` |
| **DEV** | Every permission, including Settings (roles matrix, audit, forms/automations placeholders) |

DEV protections: only DEV can assign/revoke DEV; cannot strip or deactivate the last active DEV; ADMIN cannot edit DEV accounts.

## UI enforcement

- Sidebar / pages filtered by permission keys (`src/constants/navItems.ts`)
- `<PermissionGate>` / `<Can>` / `usePermissions().requirePermission`
- Denied toast: **“Permission denied. Reach out to the developer.”**
- Access Denied page (no flash of protected content)
- Contact detail field filtering strips donations / pastor refs / files for unauthorized roles

### Nav layout

- **Communications** (Email control) — not under Settings
- **History** — top-level
- **Users** — ADMIN/DEV (`users.view`)
- **Settings** — DEV only (`settings.view`): Roles & permissions, Audit log, Forms, Automations

## Write-path enforcement

1. CRM services / `canEdit*` helpers consult Portal Things effective permissions via `crmPermissionsRuntime`
2. Local proxy (`server/monday-api-proxy.mjs`) — trusted `X-Crm-Operator-Email` + Operators roles for mutations/uploads
3. Production `mondayApiProxy` (i58finance) — after allowlist, Firebase email + Portal Things Operators role check for mutations (**not** Firestore Admin roles)

Set `PORTAL_THINGS_BOARD_ID` on Cloud Functions for the production thin ACL.

## Soft env flags (still apply)

Board write flags and legacy `VITE_CRM_ROLE` remain as a second layer (read-only deploys, board-level writable toggles). See [crm-bidirectional-sync.md](./crm-bidirectional-sync.md).

## Local DEV user picker

`crmLocalUserOverride.ts` (localhost only) switches operator email; roles load from Portal Things Operators so you can test BASIC vs HR locally. Production uses Firebase session email only.

## Code map

| Area | Path |
|------|------|
| Roles / keys / defaults | `src/permissions/` |
| Runtime + React context | `src/permissions/crmPermissionsRuntime.ts`, `src/context/PermissionsContext.tsx` |
| Portal Things IO | `src/services/crmRbacBoard.ts` |
| Users / matrix / audit UI | `src/pages/CrmUsersPage.tsx`, `RolesPermissionsPage.tsx`, `AuditLogPage.tsx` |
| Seed | `scripts/seed-crm-rbac.ts` |
