# CRM ↔ monday.com bidirectional sync

Monday boards are the **only source of truth** for product data. The CRM (Admin → Monday Project) and monday.com are two views of the same items.

## Contract

1. **CRM → Monday** — Every product edit uses GraphQL (`change_column_value`, `create_update`, `create_item`, file upload) against the real board. Prefer [`src/services/mondayColumnWrite.ts`](../src/services/mondayColumnWrite.ts) `changeColumnByTitle`.
2. **Monday → CRM** — After CRM save, invalidate [`sessionDetailCache`](../src/services/sessionDetailCache.ts) and refetch. While idle, board watcher harvests notes; detail hooks use [`useRefetchOnWindowFocus`](../src/hooks/useRefetchOnWindowFocus.ts) so native Monday edits appear without a full reload.
3. **Conflicts** — Last successful Monday write wins. Optimistic UI is allowed, then reconcile from GraphQL.
4. **No local-only product state** — Onboarding checklist completions that map to Monday columns, LT reference sent/review, contacts, donations must write Monday. `localStorage` is only for caches, watermarks, and ephemeral note-review queues.
5. **Acceptance** — Edit in CRM → see in monday.com; edit in monday.com → refocus CRM → value matches.

## Write flags

See [`.env.example`](../.env.example): `VITE_CONTACTS_WRITABLE`, `VITE_APPLICATIONS_WRITABLE`, `VITE_APPLICATION_NOTES_WRITABLE`, `VITE_LONGTERM_REFERENCES_WRITABLE`, `VITE_DONATIONS_WRITABLE`, `VITE_SAFEGUARDING_WRITABLE`, `VITE_EMAIL_TEMPLATES_WRITABLE`, plus soft `VITE_CRM_ROLE` (`viewer` | `coordinator` | `admin`).

Production values are baked in i58finance `deploy-monday-crm.yml` / `deploy-prod.yml`.

## Column renames

Writes resolve columns by **title**. Renaming a Monday column requires updating `columnMap` / `contactMap` / `VITE_*_COL_*` in the same change.
