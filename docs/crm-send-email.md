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

Templates live in [`src/data/emailTemplates.ts`](../src/data/emailTemplates.ts). Each has `id`, `name`, `subject`, and `body`.

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
- Optional Templates board in monday instead of `emailTemplates.ts`
