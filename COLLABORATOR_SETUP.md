# Collaborator setup — Volunteer CRM

This repo is the **only** project for the volunteer operations CRM. It connects to live monday.com boards (Contacts, Applications, Donations) via a local API proxy.

**Repo:** https://github.com/henrytroyer/monday

---

## Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **Git**
- **monday.com workspace access** to the i58 boards (ask the team lead for an invite)
- Your own **Personal API token** from monday.com (see step 3)

---

## Quick start (live Monday data)

```bash
git clone https://github.com/henrytroyer/monday.git
cd monday
npm install
npm run setup
```

Edit `.env`: switch from mock mode to the **LIVE** block (see `.env.example`), then add your token:

```env
VITE_USE_MOCK_DATA=false
VITE_MONDAY_READ_ONLY=true
VITE_CONTACTS_WRITABLE=true
VITE_APPLICATION_NOTES_WRITABLE=true
VITE_CONTACTS_BOARD_ID=2463183745
VITE_APPLICATIONS_BOARD_ID=2473000031
VITE_LONGTERM_APPLICATIONS_BOARD_ID=2927925742
VITE_DONATIONS_BOARD_ID=2473175689
VITE_MONDAY_API_PROXY_URL=/api/monday
MONDAY_API_TOKEN=your_token_here
```

Verify and run:

```bash
npm run verify
npm run dev:live
```

Open **http://localhost:4040**

---

## Create your monday API token

1. Log in to [monday.com](https://monday.com)
2. Click your avatar → **Developers** → **My access tokens** (or **API**)
3. Generate a **Personal API token**
4. Paste it in `.env` as `MONDAY_API_TOKEN=` (never commit this file)

Each developer should use **their own token**. Do not share tokens in GitHub, Slack, or email.

---

## What you should see

| Sidebar page | Data source |
|--------------|-------------|
| **Contacts** | Live Contacts board (`2463183745`) |
| **Short-term applications** | Live Applications board (`2473000031`) |
| **Long-term applications** | Live Volunteer Service - Long Term board (`2927925742`) |
| **Recruitment** | Local storage + demo seed |
| **Email templates** | Read-only catalog |

Contacts page banner should indicate live board mode, not “Mock data mode”.

---

## Mock mode (no token required)

For UI-only work without touching monday.com:

```env
VITE_USE_MOCK_DATA=true
```

Then:

```bash
npm run dev
```

Open **http://localhost:4040** — uses fixture data from `src/data/mock*.ts`.

---

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run setup` | Copy `.env.example` → `.env` if missing |
| `npm run verify` | Check `.env` and proxy readiness |
| `npm run dev` | Vite dev server (port 4040) |
| `npm run monday:proxy` | Monday GraphQL proxy (port 4042) |
| `npm run dev:live` | Start proxy + dev together |
| `npm run monday:tunnel` | Ngrok tunnel for Board View inside monday.com |

---

## Optional features

- **QuickBooks invoices:** `npm run quickbooks:proxy` (port 4041) — see [docs/crm-local-dev.md](./docs/crm-local-dev.md)
- **Board View in monday.com:** `npm run dev` + `npm run monday:tunnel` — see [docs/crm-board-view-setup.md](./docs/crm-board-view-setup.md)
- **Column title mapping:** [docs/crm-column-mapping.md](./docs/crm-column-mapping.md)
- **Email correspondence:** [docs/crm-send-email.md](./docs/crm-send-email.md) — live threads from monday **Emails & Activities** on Applications items (requires E&A enabled on the board; proxy uses API version `2025-01`)
- **Mailchimp sync:** [SETUP_OTHER_MACHINE.md](./SETUP_OTHER_MACHINE.md#mailchimp-contact-sync)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Could not load contacts” | Set `MONDAY_API_TOKEN`, board IDs, and run `npm run dev:live` |
| Email correspondence empty | Enable **Emails & Activities** on the Applications board and log emails on items in monday.com |
| Blank or loading forever | Is `npm run monday:proxy` running? Run `npm run verify` |
| Wrong column data | Check `VITE_COL_*` overrides in `.env.example` |
| Port in use | Stop other Node processes or change port in `vite.config.ts` |
| 401 / permission errors | Token expired or missing workspace access — regenerate token |

---

## Git workflow

```bash
git pull origin main    # always pull before starting work
# ... make changes ...
git add -A
git commit -m "feat: your change"
git push origin main
```

Never commit `.env` — it is gitignored.

---

## More documentation

- [docs/crm-local-dev.md](./docs/crm-local-dev.md) — mock vs live, safety flags, network URLs
- [docs/crm-contacts.md](./docs/crm-contacts.md) — Contacts board schema
- [docs/crm-column-mapping.md](./docs/crm-column-mapping.md) — Applications column titles
