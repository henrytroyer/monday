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

Templates live on a **monday.com Email Templates board** and are managed in the CRM under **Email** in the sidebar (Templates tab).

The **Email** admin console also includes:

| Tab | Purpose |
|-----|---------|
| Overview | Template count, linked accounts, recent outbound mail |
| Templates | Create, edit, and import templates (same as before) |
| Accounts | Link Gmail, Outlook, monday E&A, and other senders (OAuth coming soon) |
| Master log | Aggregated inbound/outbound mail from monday timelines and CRM compose actions |

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

## Phase 1 behavior

- **Send email** calls `sendApplicationEmail` in `crmApi.ts`, which is **not configured** yet and shows an error message.
- **Open in email app** opens your default mail client with To, subject, and body pre-filled (`mailto:`). The application detail view refreshes the **Email correspondence** panel shortly after to pick up new threads logged in monday Emails & Activities.

## Email correspondence (live)

When **Emails & Activities** is enabled on your Applications board, sent and received emails logged on an item appear in the CRM **Email correspondence** panel:

- **Application detail** — threads for that application item only (E&A timeline + SuperMail item updates).
- **Contact profile** — all threads from linked application items plus the contact hub item, each tagged by service record (timeline label) or source.
- **Contact → service record** — scoped to that application’s monday item.

**SuperMail** emails are parsed from item updates (`Outgoing SuperMail`, `Outgoing Email`) and merged with E&A timeline messages. Duplicates between the two sources are collapsed automatically.

Inbound and outbound messages must be logged through monday **Emails & Activities** (Gmail/Outlook connected in monday settings) or sent via **SuperMail**. Emails sent only from an external mail client without logging will not appear until logged manually in monday.

## Phase 2 (planned)

- Gmail API or monday automation from `sendApplicationEmail`
- Optional audit log as item update when an email is sent
