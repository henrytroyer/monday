# CRM permissions

Soft role-based access is available via `VITE_CRM_ROLE` (`viewer` | `coordinator` | `admin`). Default is `admin`.

| Role | Behavior |
|------|----------|
| `viewer` | All `canEdit*` helpers return false (read-only CRM UI) |
| `coordinator` / `admin` | Same as today — gated by `VITE_*_WRITABLE` and `VITE_MONDAY_READ_ONLY` |

Board-level write flags (see [`.env.example`](../.env.example) and [crm-bidirectional-sync.md](./crm-bidirectional-sync.md)):

- `VITE_CONTACTS_WRITABLE`
- `VITE_APPLICATIONS_WRITABLE`
- `VITE_APPLICATION_NOTES_WRITABLE`
- `VITE_LONGTERM_REFERENCES_WRITABLE`
- `VITE_DONATIONS_WRITABLE`
- `VITE_SAFEGUARDING_WRITABLE`
- `VITE_EMAIL_TEMPLATES_WRITABLE`

History undo uses the same board write gates as the entity being undone.

## Future (not implemented)

Map monday.com account / team membership to CRM roles via Board View context (`monday.get('context')`) so per-user rights align with monday item permissions without env-only roles.
