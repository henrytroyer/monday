# Send email (applications detail)

Coordinators can send templated emails from **Quick Actions → Send email** on the volunteer detail view.

## Recipients

Addresses are read from the Applications board item:

| Column (default title) | Recipient label |
|------------------------|-----------------|
| Email | Volunteer |
| Parent Email | Parent |
| Pastor Email | Pastor |
| Other Reference Emails | Reference 1, Reference 2, … |

**Other Reference Emails** can list multiple addresses separated by commas, semicolons, or new lines.

Override column titles in `.env` — see `.env.example` (`VITE_COL_PARENT_EMAIL`, etc.).

## Templates

Templates live on a **monday.com Email Templates board** and are managed in the CRM under **Email** in the sidebar.

| Setting | Purpose |
|---------|---------|
| `VITE_EMAIL_TEMPLATES_BOARD_ID` | Board ID (set automatically by seed script) |
| `VITE_EMAIL_TEMPLATES_WRITABLE=true` | Allow create/edit/delete from the CRM |
| `VITE_EMAIL_TEMPLATE_COL_*` | Override column titles (Subject, Body, Template ID) |

### Setup

```bash
# Import from the Volunteer Communications Templates docs folder
npm run import:communications-docs
```

This reads each doc in the **Communications** folder on monday.com, converts it to plain text with merge-field placeholders, and creates items on the Email Templates board. Re-run to add any new docs (existing Template IDs are skipped).

If your folder has a different name, set `VITE_COMMUNICATIONS_DOCS_FOLDER_NAME` in `.env`.

Each board item is one template:

| Column | Field |
|--------|-------|
| Item name | Display name |
| Subject | Email subject line |
| Body | Email body (supports `{{merge}}` fields) |
| Template ID | Slug used by send flows (e.g. `longterm-reference-request`) |

### Merge fields

Use `{{fieldName}}` in subject or body:

| Field | Description |
|-------|-------------|
| `name` | Volunteer full name |
| `firstName` | First word of name |
| `email` | Selected recipient address |
| `recipientLabel` | e.g. Parent, Pastor |
| `locationPreference` | Location preference |
| `location` | Assigned location |
| `timelineLabel` | Signup timeline label |
| `status` | Pipeline status |
| `coordinator` | Coordinator name |
| `housing` | Housing field |
| `phone` | Phone |

## Import SuperMail templates (mining)

SuperMail does **not** expose a public template API. To bring sent SuperMail emails into the CRM template picker, run the mining script against your Applications board:

```bash
# Preview without writing files
npm run mine:supermail-templates -- --dry-run

# Write src/data/supermailTemplates.mined.ts
npm run mine:supermail-templates
```

**Requirements:**

- `MONDAY_API_TOKEN` in `.env`
- `VITE_APPLICATIONS_BOARD_ID` (defaults to `2473000031` in `.env.example`)

**What the script does:**

1. Paginates all items on the Applications board
2. Reads item updates with HTML bodies (same logs used for Email correspondence)
3. Parses **outgoing** SuperMail / Outgoing Email entries via [`parseSuperMailUpdate.ts`](../src/services/parseSuperMailUpdate.ts)
4. Generalizes known volunteer values (name, first name, email) into `{{merge}}` fields where detected
5. Deduplicates by subject (keeps the most recent body)
6. Writes [`supermailTemplates.mined.ts`](../src/data/supermailTemplates.mined.ts)

Run `npm run import:communications-docs` to copy mined templates onto your Email Templates board (or edit them in the CRM after import).

### Mining limitations

| Limitation | Impact |
|------------|--------|
| No SuperMail template API | Only **sent** emails are captured, not the SuperMail template gallery |
| `updates(limit: 100)` per item | Very old sends on busy items may be missed |
| HTML layouts flattened to plain text in mined `body` | Rich buttons/status blocks from SuperMail are not preserved in the template body |
| SuperMail column placeholders | `{Column Name}` syntax is not auto-mapped to CRM `{{fieldName}}` |
| Rate limits | Script batches requests with small delays |

## Send / reply (CRM proxy)

Direct **Send** and mailbox **Reply / Reply all / Forward** go through the monday API proxy:

`POST /email/send` → Resend **or** SMTP → optional monday `create_update` (Outgoing Email log)

Configure **one** provider in `.env` (server-side only — never `VITE_`):

```bash
EMAIL_FROM_ADDRESS=info@i58global.org
EMAIL_FROM_NAME=i58 Global

# Option A — Resend (verify i58global.org in Resend)
RESEND_API_KEY=re_...

# Option B — Google Workspace SMTP (app password for the mailbox)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@i58global.org
SMTP_PASS=your-app-password
```

Restart `npm run monday:proxy` (or `npm run dev:live`) after changing env. Check `GET /email/status` on the proxy for `{ configured: true, provider, from }`.

**Open in email app** remains available as a mailto fallback.

CRM sends are logged on the monday item as an **Outgoing Email** update so they appear in Email correspondence after refresh.

### Production note

Local/dev uses `server/monday-api-proxy.mjs`. Production Firebase Admin embed uses the i58finance Cloud Function proxy — that function needs the same `/email/send` route and secrets before Send works in production.

## Email correspondence (live)

When **Emails & Activities** is enabled on your Applications board, sent and received emails logged on an item appear in the CRM mailbox UI (`EmailMailbox`):

- **Application detail** — conversations for that application / term only (E&A + SuperMail).
- **Contact profile** — full history across applications + general mail; search; Reply / Compose.
- Conversations group by normalized subject + participants; newest message expands by default.

**SuperMail** emails are parsed from item updates (`Outgoing SuperMail`, `Outgoing Email`) and merged with E&A timeline messages.

Inbound/outbound mail that never hits monday (or CRM send) will not appear until logged.
