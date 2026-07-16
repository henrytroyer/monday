# Volunteer CRM (monday.com)

React + TypeScript volunteer operations dashboard connected to live monday.com boards (Contacts, Applications, Donations).

**Production (i58 finance Admin):** open **Admin → Monday Project** at
`https://i58-finance.web.app/admin?tab=monday-project`. Live API calls use Cloud Function
`mondayApiProxy` (admin Firebase Auth + Secret Manager `MONDAY_API_TOKEN`). CRM source is
mounted from this repo into `i58-receipts-v2` via the Vite `@monday` alias.

**New collaborator (local)?** Start here: **[COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md)**

## Quick start

```bash
git clone https://github.com/henrytroyer/monday.git
cd monday
npm install
npm run setup
# Edit .env — enable LIVE block and add your MONDAY_API_TOKEN
npm run verify
npm run dev:live
```

Open **http://localhost:4040**

| Command | Purpose |
|---------|---------|
| `npm run setup` | Create `.env` from `.env.example` |
| `npm run verify` | Check configuration before running |
| `npm run dev:live` | Start Monday proxy + dev server |
| `npm run dev` | Dev server only (mock mode or if proxy already running) |

**Requirements:** Node 20+ (see `.nvmrc`), monday.com workspace access, your own API token.

## What this app does

- **Contacts** — master list with tags, donations, email threads, internal notes
- **Short-term applications** — pipeline, filters, volunteer detail, onboarding progress
- **Long-term applications** — pipeline and references (mock data until board wired)
- **Recruitment** — prospect tracking with notes
- **Email templates** — read-only catalog

Mock mode (`VITE_USE_MOCK_DATA=true`) uses fixture data with no API calls. See [docs/crm-local-dev.md](./docs/crm-local-dev.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md) | **Start here** — clone, token, live setup |
| [docs/crm-local-dev.md](./docs/crm-local-dev.md) | Mock vs live, safety flags, network URLs |
| [docs/crm-contacts.md](./docs/crm-contacts.md) | Contacts board schema |
| [docs/crm-column-mapping.md](./docs/crm-column-mapping.md) | Applications column mapping |
| [docs/crm-board-view-setup.md](./docs/crm-board-view-setup.md) | Board View + tunnel inside monday.com |
| [DEVELOPER_SETUP.md](./DEVELOPER_SETUP.md) | monday.com Developer Center setup |

## Mailchimp contact sync

This repo also includes a script to sync monday.com contacts to Mailchimp.

```bash
npm run sync:contacts
```

See [SETUP_OTHER_MACHINE.md](./SETUP_OTHER_MACHINE.md#mailchimp-contact-sync) for Mailchimp env vars and GitHub Actions setup.

## Board View development

To run inside monday.com as a custom Board View:

```bash
npm run dev              # terminal 1
npm run monday:tunnel    # terminal 2 — paste tunnel URL into Developer Center
```

## Project structure

```
monday/
├── src/
│   ├── components/     # UI (applications, contacts, recruitment, layout)
│   ├── hooks/          # Data hooks (pipeline, contacts, Monday context)
│   ├── services/       # Monday GraphQL, storage, QuickBooks
│   ├── config/         # Board IDs, column maps
│   └── pages/          # Dashboard pages
├── server/             # monday-api-proxy, quickbooks-proxy
├── scripts/            # setup, verify, sync
└── docs/               # CRM documentation
```

## License

Private project for i58 volunteer operations development.
