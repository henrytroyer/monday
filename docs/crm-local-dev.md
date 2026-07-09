# CRM local development

Run the volunteer CRM on your Mac for UI work with mock data or live monday.com boards.

**New collaborator?** See **[COLLABORATOR_SETUP.md](../COLLABORATOR_SETUP.md)** first.

## Quick start

```bash
cd Documents/Monday/monday   # or wherever you cloned the repo
npm install
npm run setup
npm run verify
npm run dev:live             # live mode — or npm run dev for mock mode
```

Open **http://localhost:4040**

| Mode | `.env` | Command |
|------|--------|---------|
| **Mock** (default) | `VITE_USE_MOCK_DATA=true` | `npm run dev` |
| **Live** | LIVE block in `.env.example` + `MONDAY_API_TOKEN` | `npm run dev:live` |

## View on another screen or device

Vite sets `host: true`, so the terminal prints **Local** and **Network** URLs.

| Where you're viewing | URL |
|----------------------|-----|
| Second monitor, same Mac | `http://localhost:4040` |
| Phone, tablet, or PC on same Wi‑Fi | Network URL from terminal |

**Bookmarking:** Works only while the dev server is running.

**Firewall:** Allow Node/Vite when macOS prompts if other devices cannot connect.

## What you should see (mock mode)

- **Applications** — volunteers across pipeline stages; filters by location and timeline
- **Contacts** — contacts with tag filters
- **Detail panel** — Quick Actions, onboarding progress, email modal, term notes

## Live monday boards

Turn mock mode off in `.env` and configure board IDs. See [COLLABORATOR_SETUP.md](../COLLABORATOR_SETUP.md).

Additional docs:

- [crm-board-view-setup.md](./crm-board-view-setup.md) — tunnel + Board View inside monday.com
- [crm-column-mapping.md](./crm-column-mapping.md) — column title mapping

**Risk:** With `VITE_USE_MOCK_DATA=false`, write paths can update real boards. Use `VITE_MONDAY_READ_ONLY=true` to block Application-board mutations while reading live data.

## Live Contacts (read-only)

```env
VITE_USE_MOCK_DATA=false
VITE_MONDAY_READ_ONLY=true
VITE_CONTACTS_BOARD_ID=2463183745
VITE_MONDAY_API_PROXY_URL=/api/monday
MONDAY_API_TOKEN=<your token>
```

```bash
npm run dev:live
```

Open **http://localhost:4040** → **Contacts**.

Never put `MONDAY_API_TOKEN` in a `VITE_` variable.

## Live Contacts (editable)

```env
VITE_USE_MOCK_DATA=false
VITE_MONDAY_READ_ONLY=true
VITE_CONTACTS_WRITABLE=true
VITE_APPLICATION_NOTES_WRITABLE=true
VITE_CONTACTS_BOARD_ID=2463183745
VITE_APPLICATIONS_BOARD_ID=2473000031
VITE_MONDAY_API_PROXY_URL=/api/monday
MONDAY_API_TOKEN=<your token>
```

Restart after changing env. Contacts page shows a live board banner.

**Internal notes hub:** Contact detail aggregates notes from Contacts board, harvested notes, and legacy Applications term notes.

**Note review inbox:** Sidebar → **Note review** → **Sync notes from monday**.

**Board watcher:** `VITE_MONDAY_WATCH_ENABLED=true` polls for new updates.

### Board View + tunnel (inside monday.com)

1. OAuth scopes: `boards:read`, `items:read` (add write scopes if editing)
2. `npm run dev` + `npm run monday:tunnel`
3. Paste tunnel HTTPS URL into Board View Custom URL
4. Open app on Contacts or Applications board in monday.com

## QuickBooks proxy (optional)

Invoice linking needs the proxy when not in mock mode:

```bash
npm run quickbooks:proxy   # separate terminal, port 4041
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page on Network URL | Same Wi‑Fi? Firewall? Restart `npm run dev` |
| Wrong volunteer count | Confirm `VITE_USE_MOCK_DATA=true` for mock |
| Port in use | Stop other Node process or change port in `vite.config.ts` |
| Board View blank | Use tunnel URL in Developer Center — see [crm-board-view-setup.md](./crm-board-view-setup.md) |
| Live data not loading | Run `npm run verify` and `npm run dev:live` |
