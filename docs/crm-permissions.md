# CRM permissions (planned)

Role-based access is **not implemented yet**. This doc captures the intended model for a later slice.

## Goals

- Some users can **view** volunteer profiles, notes, and files only.
- Others can **edit** (add term notes, change status, etc.) based on role or team.

## Suggested approach

1. **monday.com account roles** — Map monday user / team membership to CRM roles via Board View context (`monday.get('context')` + optional config board or env).
2. **UI gates** — Wrap edit actions (`TermNotesChat` composer, Quick Actions, future status changes) in a `canEdit` check; show read-only UI when `canView` only.
3. **API** — monday OAuth scopes already limit what the app token can do; per-user edit rights should align with monday item/board permissions where possible.

## Types (future)

```ts
export type CrmRole = 'viewer' | 'coordinator' | 'admin';

export interface CrmPermissions {
  canViewApplications: boolean;
  canEditApplications: boolean;
  canAddTermNotes: boolean;
}
```

Implement when you define who on your team gets view vs edit access.
