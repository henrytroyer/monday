# Quick Start: Initialize and Authenticate with monday.com

## Step 1: Create App in Developer Center

**Important:** The CLI doesn't have a `login` command. Authentication happens automatically when your app runs inside monday.com.

1. Go to [monday.com](https://monday.com) → Profile → **"Developers"**
2. Click **"Create App"**
3. Add a **"Board View"** feature
4. Configure **OAuth scopes** (boards:read, items:read, etc.)

## Step 2: Start Development Server

Start the development server and tunnel:

**Option 1: Run separately (recommended for debugging)**

Terminal 1 - Dev server:
```bash
npm run dev
```

Terminal 2 - Tunnel:
```bash
npm run monday:tunnel
```

**Option 2: Run together**
```bash
npm run monday:dev
```

This will:
- Start Vite dev server on port 4040
- Create a tunnel URL (e.g., `https://abc123.loca.lt`)
- Display the tunnel URL in the terminal

**Note:** Keep both terminals open while developing.

## Step 3: Connect Your App to the Tunnel

1. **Copy the tunnel URL** from the terminal (e.g., `https://abc123.loca.lt`)

2. **In Developer Center:**
   - Go to your app → **"Features"** tab
   - Click on your feature (e.g., "My Custom View")
   - Find **"Custom URL"** field
   - Paste the tunnel URL
   - Click **"Save"**

3. **Test in monday.com:**
   - Open any board in your monday.com account
   - Click **"Views"** dropdown
   - Select your custom view
   - Your app should load!

## Troubleshooting

### Authentication

**Note:** There's no login command. Authentication is automatic when your app runs in monday.com. For API tokens, get them from Developer Center → API tab.

### Tunnel Not Working

If the tunnel URL doesn't work:
- Make sure `npm run dev` is running first (on port 4040)
- Make sure `npm run monday:tunnel` is running
- Try stopping and restarting both
- Check firewall isn't blocking port 4040
- Verify tunnel URL starts with `https://`

### App Not Loading

- Verify the Custom URL is correctly set in Developer Center
- Check browser console for errors
- Ensure the tunnel is still active (keep terminal open)
- Try refreshing the board view in monday.com

## Next Steps

Once authenticated and connected:

1. **Make changes** to `src/App.tsx` or `src/components/HelloWorld.tsx`
2. **See live updates** in monday.com (hot reload should work)
3. **Build features** using the hooks and utilities in `src/hooks/` and `src/utils/`

## Quick Commands Reference

```bash
# Start dev server only
npm run dev

# Start tunnel only (needs dev server running)
npm run monday:tunnel

# Start both together
npm run monday:dev

# Build for production
npm run build
```

