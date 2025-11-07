# Setting Up mapps CLI (Alternative to Ngrok)

Since ngrok isn't working for you, let's use monday.com's built-in CLI tunneling instead.

## Step 1: Get Your API Token

1. **Go to Developer Center:**
   - https://developer.monday.com/apps
   - Click your app (ID: 10499615)

2. **Get API Token:**
   - Click **"API"** tab
   - Click **"Show"** next to API Token
   - **Copy the token** (it's long, copy it all)

## Step 2: Initialize mapps CLI

When you see the prompt asking for API token:

```
? Please enter your monday.com api access token [input is hidden]
```

1. **Paste your API token** (you won't see it as you type - that's normal)
2. **Press Enter**

## Step 3: Configure mapps

After providing the token, mapps will ask for more info:

1. **App ID:** `10499615` (from your monday.config.json)
2. **Feature type:** Choose what you created (Board View, Dashboard Widget, etc.)
3. **Port:** `4040` (or whatever port your dev server uses)

## Step 4: Start Development with mapps

Once initialized, you can use:

```bash
# This will start dev server AND create tunnel automatically
npm run monday:dev
```

Or manually:

```bash
# Terminal 1
npm run dev

# Terminal 2 - Use mapps tunnel instead of ngrok
npx @mondaydotcomorg/monday-cli tunnel:create -p 4040
```

## What mapps Does Differently

**mapps CLI:**
- ✅ Uses monday.com's built-in tunneling
- ✅ No ngrok needed
- ✅ Automatically configures Custom URL
- ✅ Handles authentication

**vs Ngrok:**
- ❌ Requires separate ngrok account
- ❌ Manual URL copying
- ❌ More setup steps

## Troubleshooting mapps

### If mapps asks for token again:
- Check if token was saved correctly
- Try running: `mapps init` manually
- Re-enter your API token

### If tunnel doesn't work:
- Make sure dev server is running first
- Check port matches (4040)
- Verify API token is correct

### If you get errors:
- Make sure you're in the project directory
- Check API token is valid
- Try: `mapps --version` to verify CLI is installed

## Using mapps Tunnel

Once mapps is initialized:

```bash
# Create tunnel (if not using monday:dev)
npx @mondaydotcomorg/monday-cli tunnel:create -p 4040

# It will show you a URL like:
# https://abc123.monday.apps.dev
# This is automatically set in Developer Center!
```

## Benefits of mapps CLI

1. **No ngrok setup needed**
2. **Automatic Custom URL configuration**
3. **Better integration with monday.com**
4. **Simpler workflow**

## Current Status

You're currently at the API token prompt. Just:
1. Paste your API token
2. Press Enter
3. Follow any additional prompts
4. Let mapps set everything up!


