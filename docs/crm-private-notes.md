# Private contact internal notes (org-confidential)

Contact **Internal notes** support **Public** and **Private** visibility.

| Visibility | Storage | Who can read the body |
|------------|---------|------------------------|
| **Public** | monday.com Contacts updates (`[CRM_CONTACT_NOTE …]`) | Any allowlisted CRM operator |
| **Private** | Org store (Cloud Function / local proxy / localStorage) | Author, plus anyone with a **strictly higher** i58finance Admin role (read-only) |

## Threat model

- **Peers / lower roles** never see others’ private notes in the list.
- **Higher roles** see the full body, tagged `Private · {author}`. They cannot edit or delete.
- **monday.com** never receives private note bodies.
- **Backend** encrypts org notes with `CRM_PRIVATE_NOTES_ORG_KEY`. Operators with Cloud Function / secret access could decrypt — this is intentional “a little secure within the org,” not personal E2E.
- **Role source:** Admin → User Settings → `users/{email}.role`, ranked by `ROLE_HIERARCHY` (ceo 9 … user 1).

## How hierarchy works

1. Author’s role/rank is snapshotted when the note is created.
2. On list, the server loads the **requester’s** role from Firestore (not the browser) and returns notes where `requester.uid === authorUid` **or** `rank(requester) > rank(author)`.
3. CRM session receives `role` via `configureCrmSessionUser` for UI labels only.

## UI

- Same Internal notes timeline as public notes.
- Private tag: `Private` for your own; `Private · {authorName}` for others you can read.
- No passphrase unlock for new private notes.

## Legacy personal E2E vault

Older builds used per-user passphrase vaults. Those notes remain owner-only until migrated via `migrateLegacyPrivateNotesToOrg` (owner unlocks the old vault once, then posts into the org store). Until migrated, superiors cannot see legacy notes. There is no private-notes panel in User settings — visibility follows Admin role hierarchy automatically.

## Storage setup

### Device-only (default)

If `VITE_PRIVATE_NOTES_URL` is unset, org notes are kept in **localStorage** (`crm-org-private-notes`). Dev ACL uses the session role from `configureCrmSessionUser`.

### Local multi-client

```bash
VITE_PRIVATE_NOTES_URL=/api/private-notes
# optional: CRM_PRIVATE_NOTES_ORG_KEY=... for the proxy
npm run private-notes:proxy   # or npm run dev:live
```

### Production

i58finance Cloud Function `crmPrivateNotes` (europe-west3):

- Org notes: `crmOrgPrivateNotes/{noteId}` (AES-GCM with secret `CRM_PRIVATE_NOTES_ORG_KEY`)
- Legacy vault: `crmPrivateNotes/{uid}` + `…/notes/{noteId}`

Set the org key once (Firebase secret; not a `VITE_*` client var):

```bash
firebase functions:secrets:set CRM_PRIVATE_NOTES_ORG_KEY
# then redeploy crmPrivateNotes
```

```bash
VITE_PRIVATE_NOTES_URL=https://europe-west3-i58-finance.cloudfunctions.net/crmPrivateNotes
```

Host:

```ts
configureCrmSessionUser({ id, name, email, role });
configurePrivateNotesStore({ baseUrl: 'https://…/crmPrivateNotes' });
```

## API (Cloud Function / proxy)

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/health` | `{ ok: true }` |
| GET | `/notes?contactId=` | Org notes visible to caller (decrypted) |
| POST | `/notes` | Create org note as caller |
| DELETE | `/notes/:id` | Author only |
| GET/PUT | `/vault` | Legacy vault |
| GET/POST/DELETE | `/legacy/notes…` | Legacy envelopes for migration |

Firestore rules deny all client access; Admin SDK only.
