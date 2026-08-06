# CRM permissions (Portal Things RBAC)

> **Disabled in the CRM UI.** `CRM_PERMISSIONS_DISABLED` in
> [`src/permissions/crmPermissionsDisabled.ts`](../src/permissions/crmPermissionsDisabled.ts)
> is `true`: every signed-in operator sees the full Volunteer Portal. The
> **Users** and **Roles & permissions** menus are removed. Who can open Monday
> Project is still controlled by the i58finance Admin allowlist + `mondayApiProxy`.

The rest of this doc describes the Portal Things RBAC model if it is re-enabled.

## Who can open Monday Project

Still controlled by the existing email allowlist (Admin shell + `mondayApiProxy`). Unchanged.

## What they can do inside CRM

Resolved from Portal Things:

| Group / item | Purpose |
|--------------|---------|
| **Operators** | One item per CRM operator (`Kind=operator`) with Email + Payload `{ roles, status, displayName }` |
| **Config → Role Permissions** | Singleton JSON matrix: roles, permission catalog, `rolePermissions`, optional `sectionVisibilityOverrides` |
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

## Section visibility (CRM-wide)

Operators get **role tags** → union of **permission keys**. UI/API surfaces are **sections** tagged with a simple **domain** (not per-Monday-column tags, and not view/edit/upload/delete picks).

| Layer | Answers | Edited by |
|-------|---------|-----------|
| Users / roles | Who is HR / Finance / … | ADMIN/DEV |
| Role → permissions | What each role can do | DEV (Role matrix tab) |
| Section → domain | Which surface belongs to HR / Finance / … | Code defaults + DEV **Section visibility** tab |

**Domains:** Contacts · HR · Finance · Communications · History · Users · Settings

**View = full access:** holding a domain’s view key (`hr.view`, `finance.view`, …) grants every permission in that domain (edit/upload/delete included). Exception: `contacts.view` stays identity-only so BASIC cannot delete/merge contacts.

- Catalog: `src/permissions/sectionCatalog.ts`
- Runtime: `<SectionGate>`, `canViewSection()`, `permissionForPage()`
- API strip respects the same domain map + overrides
- Overrides store domain tags only on Portal Things (`sectionVisibilityOverrides`)
- Multi-role = **union**

Examples:

| Operator roles | Sees | Hidden |
|----------------|------|--------|
| HR only | Applications, terms, files, notes, references | Donations |
| FINANCE only | Profile + donations / invoices | HR notes, files, full application Q&A |
| HR + FINANCE | Both sets | — |

DEV UI: **Settings → Roles & permissions → Section visibility** — dropdown is just domain names (HR, Finance, …).

## Work focus (role-shaped layout)

Section visibility controls **what** an operator can see. **Work focus** controls **order** so each job opens to the work they do.

| Focus | Derived from roles (priority) | Detail layout emphasis | Default landing (if unset) |
|-------|-------------------------------|------------------------|----------------------------|
| Finance | `FINANCE` first | Donations → Billing & invoices | Contacts |
| HR | else `HR` | Current application → Terms / onboarding | Short-term applications |
| Communications | else `COMMUNICATIONS` | Email first | Email templates |
| General | otherwise | Legacy default order | Contacts |

- Code: `src/permissions/workFocus.ts`, `useWorkFocus()`, local override in **User settings**
- Access still gated by `<SectionGate>` / domain strip — focus never reveals hidden domains
- **Finance billing path:** `contact.billing` (finance domain) lists service terms with QuickBooks links. Finance-only operators get a **slim** `serviceTerms` projection (invoice ids / dates; no notes, files, or pastor fields) so invoices are reachable without HR
- Multi-role uses the priority table; operators can override focus for this browser in User settings

## UI enforcement

- Sidebar / pages filtered via section catalog (`nav.*`) + `permissionForPage`
- `<PermissionGate>` / `<Can>` / `<SectionGate>` / `usePermissions().requirePermission`
- Denied toast: **“Permission denied. Reach out to the developer.”**
- Access Denied page (no flash of protected content)
- Contact/application payloads strip unauthorized section data at the API layer

### Nav layout

- **Communications** (Email control) — not under Settings
- **History** — top-level
- **Users** — ADMIN/DEV (`users.view`)
- **Settings** — DEV only (`settings.view`): Roles & permissions (matrix + visibility), Audit log, Forms, Automations

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
| Section catalog + domains | `src/permissions/sectionCatalog.ts`, `resolveSectionPermission.ts`, `SectionGate.tsx` |
| Work focus (layout order) | `src/permissions/workFocus.ts`, `workFocusStorage.ts`, `src/hooks/useWorkFocus.ts` |
| Runtime + React context | `src/permissions/crmPermissionsRuntime.ts`, `src/context/PermissionsContext.tsx` |
| Portal Things IO | `src/services/crmRbacBoard.ts` |
| Users / matrix / visibility / audit UI | `src/pages/CrmUsersPage.tsx`, `RolesPermissionsPage.tsx`, `AuditLogPage.tsx` |
| Field strip + slim billing terms | `src/utils/filterContactForPermissions.ts`, `slimBillingTerms.ts` |
| Seed | `scripts/seed-crm-rbac.ts` |
