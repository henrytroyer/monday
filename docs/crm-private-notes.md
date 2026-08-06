# Private contact internal notes (E2E)

Contact **Internal notes** support **Public** and **Private** visibility.

| Visibility | Storage | Who can read the body |
|------------|---------|------------------------|
| **Public** | monday.com Contacts updates (`[CRM_CONTACT_NOTE …]`) | Operators with HR / internal-notes access (unchanged) |
| **Private** | Ciphertext only (never monday.com) | Only you, after unlocking with your passphrase (or recovery key → new passphrase) |

## Threat model

- **Other CRM users** never see your private notes in the list.
- **monday.com** never receives private note bodies.
- **Backend / Firebase admins** may see ciphertext envelopes (contact id, timestamps, owner uid, wrapped DEK blobs) but **cannot decrypt** without your passphrase or recovery key.
- **Someone with your unlocked browser** can read private notes until you hit **Lock private notes**.
- **Forgot passphrase** → use your **recovery key** in **User settings** to set a new passphrase (notes kept).
- **Lose passphrase and recovery key** → private notes are unrecoverable. There is no admin recovery.

## How encryption works

1. A random **DEK** (data encryption key) encrypts note bodies.
2. Your **passphrase** derives a wrapping key that encrypts the DEK (`wrappedDek`).
3. Your **recovery key** derives a second wrapping key that also encrypts the DEK (`recoveryWrappedDek`).
4. Changing or recovering the passphrase only re-wraps the DEK — note ciphertext stays valid.

## Passphrase + recovery key

1. First private note → set a passphrase (min 8 characters).
2. CRM shows a **recovery key once** (copy / download). Store it offline.
3. Unlock once per device (DEK cached in IndexedDB until **Lock private notes**).
4. **User settings → Private notes**:
   - **Change passphrase** (current + new)
   - **Recover with recovery key** (forgot passphrase)
   - **Create / rotate recovery key** (when unlocked; rotating invalidates the old key)

## Storage setup

### Device-only (default)

If `VITE_PRIVATE_NOTES_URL` is unset, ciphertext is kept in **localStorage**. No cross-device sync.

### Local multi-client / shared machine sync

```bash
npm run private-notes:proxy
```

In `.env`:

```bash
VITE_PRIVATE_NOTES_URL=/api/private-notes
```

Vite proxies `/api/private-notes` → `http://localhost:4043`. Data files live in `server/.private-notes/` (gitignored).

### Production (cross-device)

Deploy an i58finance Cloud Function (same Firebase auth as `mondayApiProxy`) that stores opaque blobs in Firestore:

- `crmPrivateNotes/{uid}/vault` (includes wraps + recovery fields)
- `crmPrivateNotes/{uid}/notes/{noteId}`

Rules / CF checks: `auth.uid` must match `{uid}`. Accept only ciphertext fields. Never log or decrypt bodies.

```bash
VITE_PRIVATE_NOTES_URL=https://<region>-<project>.cloudfunctions.net/crmPrivateNotes
```

Host may also call:

```ts
configurePrivateNotesStore({ baseUrl: 'https://…/crmPrivateNotes' });
configureCrmSessionUser({ id: firebaseUid, name, email });
```

Owner identity is the **session user id** (Firebase uid in Admin embed), not display name.

## Code map

| File | Role |
|------|------|
| `src/services/privateNotesCrypto.ts` | PBKDF2, AES-GCM, DEK wrap, recovery key format |
| `src/services/privateNotesVault.ts` | Setup / unlock / change / recover / rotate |
| `src/services/privateNotesApi.ts` | Ciphertext CRUD + vault record |
| `src/services/privateContactNotes.ts` | Encrypt payload + merge into hub list |
| `src/components/contacts/ContactInternalNotesSection.tsx` | Public/Private UI + recovery reveal |
| `src/components/settings/PrivateNotesSecurityCard.tsx` | User settings security |
| `src/components/settings/RecoveryKeyReveal.tsx` | One-time recovery key panel |
| `server/private-notes-proxy.mjs` | Local opaque store |

## Out of scope

- Term notes chat / recruitment notes panels
- Sharing a private note with another operator
- Server-side or admin-assisted recovery
- Emailing the recovery key
