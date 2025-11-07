# Local Development Guide - Step by Step

This guide walks you through setting up local development for your monday.com app.

## Prerequisites Check

Before starting, make sure you have:
- ✅ Node.js installed (`node --version`)
- ✅ npm installed (`npm --version`)
- ✅ A monday.com account with Developer access
- ✅ Client ID and Client Secret (you mentioned you have these)

## Step-by-Step Local Development Setup

### Step 1: Verify Your Project Setup

First, let's make sure everything is installed:

```bash
cd /Users/henrytroyer/Monday
npm install
```

This ensures all dependencies (including `monday-sdk-js`) are installed.

### Step 2: Configure Environment Variables (Optional)

If you want to store your client credentials for reference (they're not needed for client-side apps, but good to have):

Create a `.env` file in the project root:
```bash
# Optional - for reference only
# Client-side apps authenticate automatically when running in monday.com
MONDAY_CLIENT_ID=your_client_id_here
MONDAY_CLIENT_SECRET=your_client_secret_here
```

**Note:** For client-side apps, you don't actually need these in code - authentication happens automatically when your app runs inside monday.com.

### Step 3: Create/Verify Your App in Developer Center

1. **Go to Developer Center:**
   - Open [monday.com](https://monday.com) and log in
   - Click your **profile picture** (top right)
   - Click **"Developers"**

2. **Create App (if you haven't already):**
   - Click **"Create App"**
   - Fill in:
     - **App Name**: Your app name
     - **Description**: Brief description
     - **Category**: Choose appropriate category
   - Click **"Create"**
   - **Note your App ID** (visible at top of page)

3. **Add a Feature:**
   - Go to **"Features"** tab
   - Click **"Add Feature"**
   - Select **"Board View"** → **"Custom View"**
   - Name it: `My Custom View` (or any name)
   - Click **"Save"**

4. **Configure OAuth Scopes:**
   - Go to **"OAuth"** tab
   - Select these scopes:
     - ✅ `boards:read`
     - ✅ `boards:write`
     - ✅ `items:read`
     - ✅ `items:write`
     - ✅ `users:read`
     - ✅ `workspaces:read`
   - Click **"Save"**

### Step 4: Start Local Development Server

**Open Terminal 1:**

```bash
cd /Users/henrytroyer/Monday
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:4040/
  ➜  Network: http://192.168.x.x:4040/
```

**Keep this terminal open!** The dev server needs to keep running.

### Step 5: Create Public Tunnel

You need a tunnel so monday.com can access your local server.

**Open Terminal 2 (new terminal window):**

```bash
cd /Users/henrytroyer/Monday
npm run monday:tunnel
```

You should see output like:
```
Tunnel created: https://abc123def456.loca.lt
Forwarding: https://abc123def456.loca.lt -> http://localhost:4040
```

**Copy the tunnel URL** (e.g., `https://abc123def456.loca.lt`)

**Keep this terminal open too!** The tunnel needs to stay active.

### Step 6: Connect Tunnel to Your App

1. **In Developer Center:**
   - Go to your app → **"Features"** tab
   - Click on your feature (e.g., "My Custom View")
   - Scroll to **"Custom URL"** field
   - Paste your tunnel URL: `https://abc123def456.loca.lt`
   - Click **"Save"**

### Step 7: Test Your App

1. **Open monday.com** in your browser
2. **Open any board** (or create a test board)
3. **Click "Views"** dropdown (top of board)
4. **Select your custom view** (e.g., "My Custom View")
5. **Your React app should load!** 🎉

You should see the Hello World component we created.

### Step 8: Make Changes and See Live Updates

Now you can develop locally with hot reload:

1. **Edit a file**, for example `src/components/HelloWorld.tsx`
2. **Save the file**
3. **Watch monday.com** - it should automatically reload with your changes!

## Development Workflow

### Normal Development Session

1. **Start Terminal 1:**
   ```bash
   npm run dev
   ```

2. **Start Terminal 2:**
   ```bash
   npm run monday:tunnel
   ```

3. **Edit your code** in your IDE
4. **See changes live** in monday.com
5. **Check browser console** (F12) for any errors

### Stopping Development

- Press `Ctrl+C` in both terminals to stop
- Or close the terminal windows

### Restarting Development

If you restart:
1. Tunnel URL might change - check Terminal 2 for new URL
2. Update Custom URL in Developer Center if it changed
3. Your app will reconnect automatically

## Understanding Authentication

### How It Works

When your app runs **inside monday.com** (accessed via the tunnel):
- ✅ Authentication is **automatic**
- ✅ The SDK handles OAuth automatically
- ✅ User context is provided automatically
- ✅ No API tokens needed in your code

When testing **outside monday.com** (e.g., `http://localhost:4040`):
- ⚠️ Authentication won't work
- ⚠️ SDK context won't be available
- ⚠️ Use this only for UI development/testing

### Your Client ID & Secret

Your **Client ID** and **Client Secret** are used for:
- OAuth app configuration in Developer Center
- Server-side API calls (if you build a backend)
- Webhook verification (if you use webhooks)

For **client-side apps** running in monday.com, you don't need to use them in your code - monday.com handles authentication automatically.

## Troubleshooting

### Issue: "Cannot GET /" or blank page

**Solution:**
- Make sure `npm run dev` is running in Terminal 1
- Check that port 4040 is accessible: `http://localhost:4040`

### Issue: Tunnel not connecting

**Solution:**
- Make sure dev server is running first (`npm run dev`)
- Wait a few seconds after starting tunnel
- Check firewall isn't blocking port 4040
- Try restarting tunnel: Stop (Ctrl+C) and run `npm run monday:tunnel` again

### Issue: App loads but shows errors

**Solution:**
- Open browser console (F12) to see errors
- Check that OAuth scopes are configured correctly
- Verify API version is set: `monday.setApiVersion('2023-10')`
- Check Network tab for failed API calls

### Issue: Changes not updating

**Solution:**
- Make sure you saved the file
- Check Terminal 1 for Vite compilation errors
- Hard refresh in browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Verify tunnel is still active (check Terminal 2)

### Issue: Port 4040 already in use

**Solution:**
1. Find what's using the port:
   ```bash
   lsof -i :4040
   ```
2. Kill the process, or change port in `vite.config.ts`:
   ```typescript
   server: {
     port: 4041, // Change to available port
   }
   ```
3. Update tunnel command to match:
   ```bash
   npm run monday:tunnel  # Will use port from config
   ```

## Quick Reference Commands

```bash
# Start dev server
npm run dev

# Start tunnel (in separate terminal)
npm run monday:tunnel

# Build for production
npm run build

# Check for linting errors
npm run lint
```

## Next Steps

Once you're developing locally:

1. ✅ **Customize HelloWorld** - Edit `src/components/HelloWorld.tsx`
2. ✅ **Use the hooks** - Import `useMondayContext` and `useMondayApi`
3. ✅ **Build features** - Create components in `src/components/`
4. ✅ **Use utilities** - Check `src/utils/mondayQueries.ts` for ready-made queries

## Testing Your App Standalone

To test your app outside monday.com (for UI development):

```bash
npm run dev
```

Then open `http://localhost:4040` in your browser.

**Note:** SDK features won't work standalone - use this only for UI testing. For full functionality, test through monday.com with the tunnel.

## Need Help?

- Check `AUTHENTICATION.md` for detailed auth info
- See `README.md` for API usage examples
- Review `UTILITIES.md` for available hooks and utilities
- Visit [monday.com Developer Docs](https://developer.monday.com/apps/docs)


