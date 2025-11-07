# monday.com Authentication & Initialization Guide

## Important: How monday.com Authentication Works

**The CLI does NOT have a login command.** Authentication is handled differently:

1. **Get API Token** from Developer Center (for server-side API calls)
2. **Use Tunnel** for local development (no authentication needed)
3. **Set Custom URL** in Developer Center to connect your app

## Step-by-Step Setup

### Step 1: Create App in Developer Center

1. **Go to Developer Center:**
   - Log in to [monday.com](https://monday.com)
   - Click your **profile picture** (top right)
   - Click **"Developers"**

2. **Create New App:**
   - Click **"Create App"** button
   - Fill in:
     ```
     App Name: My Test App
     Description: Testing monday.com app development
     Category: Choose any
     ```
   - Click **"Create"**

3. **Note Your App ID:**
   - Copy the **App ID** (visible at top of app page)

### Step 2: Add a Feature

1. **Go to Features Tab:**
   - Click **"Features"** tab
   - Click **"Add Feature"**

2. **Create Board View:**
   - Select **"Board View"**
   - Choose **"Custom View"**
   - Name it: `My Custom View`
   - Click **"Save"**

### Step 3: Configure OAuth Scopes

1. **Go to OAuth Tab:**
   - Click **"OAuth"** tab
   - Select scopes:
     - ✅ `boards:read`
     - ✅ `boards:write`
     - ✅ `items:read`
     - ✅ `items:write`
     - ✅ `users:read`
     - ✅ `workspaces:read`
   - Click **"Save"**

### Step 4: Get API Token (Optional - for API calls)

If you need to make server-side API calls:

1. **In Developer Center:**
   - Click **"API"** tab
   - Click **"Show"** next to API Token
   - Copy your token
   - Save it securely (you'll use this in your code)

### Step 5: Start Local Development

#### Option A: Using monday.com CLI Tunnel (Recommended)

**Terminal 1 - Start Dev Server:**
```bash
npm run dev
```
This starts Vite on `http://localhost:4040`

**Terminal 2 - Start Tunnel:**
```bash
npm run monday:tunnel
```
This creates a public tunnel URL (e.g., `https://abc123.loca.lt`)

**Or use both in one command:**
```bash
npm run monday:dev
```
(Note: This runs both in background - use Ctrl+C to stop)

#### Option B: Using ngrok Directly

If you prefer ngrok:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   ```

2. **Start dev server:**
   ```bash
   npm run dev
   ```

3. **In another terminal, start ngrok:**
   ```bash
   ngrok http 4040
   ```

4. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 6: Connect Tunnel to Your App

1. **Copy the tunnel URL** from terminal
   - Example: `https://abc123.loca.lt` or `https://abc123.ngrok.io`

2. **In Developer Center:**
   - Go to your app → **"Features"** tab
   - Click on your feature (e.g., "My Custom View")
   - Find **"Custom URL"** field
   - Paste the tunnel URL
   - Click **"Save"**

3. **Test It:**
   - Open any board in monday.com
   - Click **"Views"** dropdown
   - Select **"My Custom View"**
   - Your React app should load!

## Using API Token in Your Code

If you need to make API calls from your app:

```typescript
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
monday.setApiVersion('2023-10');

// For client-side apps, authentication is automatic
// For server-side, use: monday.setToken('YOUR_API_TOKEN');

// Make API call
monday.api(`query { me { id name } }`)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));
```

**Note:** When your app runs inside monday.com, authentication is handled automatically. You only need the API token for server-side API calls or testing outside monday.com.

## Troubleshooting

### Issue: Tunnel URL not working

**Solutions:**
- Make sure `npm run dev` is running on port 4040
- Verify tunnel is active (check terminal)
- Try restarting tunnel: Stop and run `npm run monday:tunnel` again
- Check firewall isn't blocking port 4040

### Issue: App not loading in monday.com

**Solutions:**
- Verify Custom URL is correctly set in Developer Center
- Check browser console for errors
- Ensure tunnel is still active
- Try refreshing the board view
- Make sure the tunnel URL starts with `https://`

### Issue: API calls failing

**Solutions:**
- Verify OAuth scopes are set correctly
- Check API version: `monday.setApiVersion('2023-10')`
- Ensure user has permissions on the board
- Review GraphQL query syntax

### Issue: Port 4040 already in use

**Solutions:**
- Change port in `vite.config.ts`:
  ```typescript
  server: {
    port: 4041, // or any available port
  }
  ```
- Update tunnel command: `npm run monday:tunnel` (uses port from config)

## Command Reference

```bash
# Start dev server only
npm run dev

# Start tunnel only (requires dev server running)
npm run monday:tunnel

# Start both (dev server + tunnel)
npm run monday:dev

# Build for production
npm run build
```

## Next Steps

Once set up:

1. ✅ **Edit your app**: Modify `src/App.tsx` or components
2. ✅ **See live updates**: Changes hot-reload automatically
3. ✅ **Use the SDK**: Import hooks from `src/hooks/`
4. ✅ **Build features**: Use utilities from `src/utils/`

## Need Help?

- Check `QUICKSTART.md` for quick reference
- See `DEVELOPER_SETUP.md` for detailed configuration
- Review `README.md` for usage examples
- Visit [monday.com Developer Docs](https://developer.monday.com/apps/docs)
