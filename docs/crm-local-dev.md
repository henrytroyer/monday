# CRM local development

Run the volunteer CRM on your Mac for UI work and demos **without changing live monday boards**.

## Two ways to run locally

| Project | Path | Port | Data |
|---------|------|------|------|
| **crm-prototype** | `~/crm-prototype` | 5173 | Always mock |
| **monday app** | `Documents/Monday/monday` | 4040 | Mock or live (env toggle) |

For daily UI iteration, **crm-prototype** is simplest. Use the **monday app** when testing Board View, column mapping, or monday API writes.

## Quick start (safe mock mode)

### crm-prototype

```bash
cd ~/crm-prototype
npm install   # first time only
npm run dev
```

Open **http://localhost:5173**

### monday app

```bash
cd Documents/Monday/monday
npm install   # first time only
```

In `.env` (local only, never commit):

```env
VITE_USE_MOCK_DATA=true
```

Then:

```bash
npm run dev
```

Open **http://localhost:4040**

With mock mode on, list and detail views use fixtures (`mockApplications.ts`, `mockContacts.ts`) — **no monday.com API calls**.

## View on another screen or device

Both Vite configs set `host: true`, so the terminal prints **Local** and **Network** URLs when you run `npm run dev`.

| Where you're viewing | URL |
|----------------------|-----|
| Second monitor, same Mac | `http://localhost:5173` or `:4040` |
| Phone, tablet, or PC on same Wi‑Fi | Network URL, e.g. `http://192.168.1.42:5173` |

**Bookmarking:** Save the URL in your browser. It works only while the dev server is running. Quitting the terminal or shutting down the Mac stops the server.

**IP changes:** After sleep or reconnecting to Wi‑Fi, the Network IP may change. Run `npm run dev` again and use the new Network URL.

**Firewall:** If another device cannot connect, allow Node/Vite when macOS prompts, or adjust **System Settings → Network → Firewall**.

## Resume after closing the laptop

1. Open the project folder on this Mac (code is in local git)
2. Run `npm run dev` again
3. Open the same localhost URL (or fresh Network URL on other devices)

No deploy or push is required to continue local work.

## What you should see (mock mode)

- **Applications** — 26 volunteers across five pipeline stages; filters by location and signup timeline
- **Contacts** — ~205 contacts with tag filters
- **Detail panel** — Quick Actions, onboarding progress, full application / pastor reference drill-down, send email modal, term notes

## Live monday boards (optional)

Only when you intentionally turn mock mode **off** and open the Board View or set real board IDs:

- See [crm-board-view-setup.md](./crm-board-view-setup.md) for tunnel + Board View install
- See [crm-column-mapping.md](./crm-column-mapping.md) for column title mapping

**Risk:** With `VITE_USE_MOCK_DATA=false`, write paths (tags, invoice links, term notes) can update real boards. Keep mock mode on for UI-only work, or set `VITE_MONDAY_READ_ONLY=true` to block Application-board mutations while reading live data.

## Live Contacts (read-only)

To show your real Contacts board instead of the ~205 mock contacts:

### Option A — monday API proxy (simplest for local dev)

No tunnel or Board View required. Your API token stays on the server.

1. In `.env` (local only):

```env
VITE_USE_MOCK_DATA=false
VITE_MONDAY_READ_ONLY=true
VITE_CONTACTS_BOARD_ID=<numeric id from board URL>
VITE_MONDAY_API_PROXY_URL=/api/monday
MONDAY_API_TOKEN=<your token from monday Developers → API>
```

2. Two terminals:

```bash
npm run dev          # port 4040
npm run monday:proxy # port 4042, forwards GraphQL to monday.com
```

3. Open **http://localhost:4040** → **Contacts** in the sidebar.

**Safety:** GraphQL **queries** cannot modify your board. `VITE_MONDAY_READ_ONLY=true` blocks Application-board mutations. Never put `MONDAY_API_TOKEN` in a `VITE_` variable.

## Live Contacts (editable)

To edit contact profile fields and tags on your live Contacts board while keeping Applications read-only:

```env
VITE_USE_MOCK_DATA=false
VITE_MONDAY_READ_ONLY=true
VITE_CONTACTS_WRITABLE=true
VITE_APPLICATION_NOTES_WRITABLE=true
VITE_CONTACTS_BOARD_ID=<numeric id from board URL>
VITE_MONDAY_API_PROXY_URL=/api/monday
MONDAY_API_TOKEN=<your token>
```

Restart `npm run dev` after changing env. The Contacts page shows a banner: *Live Contacts — edits save to board {id}. Applications remain read-only.*

Open a contact → **Edit details** → change name, email, phone, address, or tags → **Save profile**. Changes write to monday.com via `change_column_value` and `updateItemName`.

**Internal notes hub:** On contact detail, the **Internal notes** section aggregates notes from the Contacts board (new writes), approved harvested notes, and legacy Applications-board term notes. **Contact-page notes write only to the Contacts board** using `[CRM_CONTACT_NOTE …]` tags.

**Note review inbox:** Sidebar → **Note review** → **Sync notes from monday** harvests untagged updates from configured boards. Strict matching suggests a contact; you must **Approve** to link a note (no auto-guessing). Unmatched notes stay in the inbox.

**Board watcher (temporary):** `VITE_MONDAY_WATCH_ENABLED=true` polls for new updates and queues them for review. Remove when Applications and other pages get their own write paths.

```env
VITE_APPLICATIONS_BOARD_ID=<applications board id>
VITE_MONDAY_WATCH_ENABLED=true
VITE_MONDAY_WATCH_INTERVAL_MS=60000
```

If you deploy as Board View OAuth (not the local proxy), add **`boards:write`**, **`items:write`**, and **`updates:write`** scopes in Developer Center.

### Option B — Board View + tunnel (inside monday.com)

1. In monday **Developer Center** → OAuth scopes: **`boards:read`** and **`items:read`** only.
2. Run `npm run dev` and `npm run monday:tunnel` (or `npm run monday:tunnel:lt`).
3. Paste the tunnel HTTPS URL into Board View **Custom URL**.
4. Open the app on your **Contacts** board in monday.com.

If column titles differ from defaults, see [crm-contacts.md](./crm-contacts.md) and set `VITE_CONTACT_COL_*` overrides.

## QuickBooks proxy (monday app only)

Invoice linking in onboarding progress needs the proxy when not in mock mode:

```bash
npm run quickbooks:proxy   # separate terminal, port 4041
```

Not required for crm-prototype or mock-only monday dev.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank page on Network URL | Same Wi‑Fi? Firewall? Restart `npm run dev` |
| Wrong volunteer count | Confirm `VITE_USE_MOCK_DATA=true` in monday `.env` |
| Port in use | Stop other Vite process or change port in `vite.config.ts` |
| Board View blank | Use tunnel URL in Developer Center — see [crm-board-view-setup.md](./crm-board-view-setup.md) |
