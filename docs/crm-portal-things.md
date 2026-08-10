# Portal Things board

Dedicated monday.com board for CRM-only infrastructure that does not belong on Contacts / Applications rows.

**Board name:** Portal Things  
**Create locally:** `npm run seed:portal-things` (requires `MONDAY_API_TOKEN`)  
**Env:** `VITE_PORTAL_THINGS_BOARD_ID`, `VITE_PORTAL_THINGS_WRITABLE=true`

## Groups

| Group | Contents |
|-------|----------|
| Onboarding | One item per application — pipeline JSON in Payload JSON |
| Recruitment | One item per prospect |
| Field Ops | One item per on-field long-term volunteer — practical info JSON (housing, visa, vehicle, budget) |
| Config | Singletons: Note Review Registry, Email Signatures, Portal Settings (includes custom housing labels) |
| Audit | Append-only CRM admin / merge audit events |

**Kinds:** `onboarding`, `prospect`, `practical_info`, `note_review_registry`, `email_signatures`, `settings`, `audit_event`.

Who can open Monday Project is controlled by the i58finance Admin email allowlist + `mondayApiProxy`. Inside the CRM, allowlisted operators have full open access (no role matrix).

## Local workflow

1. Ensure live monday mode in `.env` (`VITE_USE_MOCK_DATA=false`, proxy + token).
2. Run `npm run seed:portal-things` — creates board, groups, columns, Config items; patches local `.env`.
3. Restart `npm run dev:live` → http://localhost:4040.
4. Confirm board in monday.com; onboarding/recruitment saves write to Portal Things.

See also [crm-bidirectional-sync.md](./crm-bidirectional-sync.md).
