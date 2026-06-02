# CRM Board View setup

Run the volunteer CRM inside monday.com on your Applications board.

## 1. Developer Center

1. Go to [monday.com Developer Center](https://developer.monday.com/apps/docs).
2. Open your app (or create one, e.g. "Volunteer CRM").
3. **Features** → Add **Board View** → Custom view.
4. **OAuth** scopes: `boards:read`, `items:read`, `updates:read`, `updates:write` (required for term-scoped internal notes).
5. Set **Custom URL** to your tunnel URL (step 2).

## 2. Local dev + tunnel

```bash
cd Documents/Monday/monday
npm install
npm run dev
```

In another terminal:

```bash
npm run monday:tunnel
# or: npm run monday:tunnel:ngrok
```

Copy the HTTPS URL from the tunnel output and paste it into the Board View **Custom URL** in Developer Center. Save the app version.

## 3. Install on your Applications board

1. Open your **Applications** board in monday.com.
2. Click the **+** next to view tabs (or "Add view").
3. Choose your app’s Board View.
4. The CRM loads with that board’s groups as pipeline stages and items as volunteers.

## 4. Environment (optional)

Copy `.env.example` to `.env`:

- `VITE_USE_MOCK_DATA=true` — mock data only (no API), for UI work at http://localhost:4040
- `VITE_APPLICATIONS_BOARD_ID` — test live API without opening Board View (advanced)

For daily use, leave mock mode **off** and open the app from the board.

## 5. Refresh

Use **Refresh** on the Applications page after changing items in monday.com.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank / loading forever | Confirm Custom URL matches tunnel; check browser console |
| "No board context" | Open as Board View on Applications board, or set `VITE_APPLICATIONS_BOARD_ID` |
| Wrong / empty columns | Edit `src/config/columnMap.ts` — see [crm-column-mapping.md](./crm-column-mapping.md) |
| Timeline filter missing people | Add label mapping in `src/config/timelineMap.ts` |
