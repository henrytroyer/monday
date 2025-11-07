# API Token Prompt - You Can Skip This!

## What's Happening

The `mapps init` command is asking for your monday.com API access token. **You don't need this for client-side development!**

## Two Options

### Option 1: Skip It (Recommended for Now)

**For client-side apps using Custom URL, you don't need the API token.**

1. **Press Ctrl+C** to cancel the prompt
2. **Use the Custom URL approach** we've been setting up:
   ```bash
   # Terminal 1
   npm run dev
   
   # Terminal 2
   npm run monday:tunnel
   ```
3. **Set Custom URL** in Developer Center (we already did this)

### Option 2: Provide API Token (If You Want)

If you want to use the mapps CLI features:

1. **Get your API token:**
   - Go to Developer Center: https://developer.monday.com/apps
   - Click your app
   - Go to **"API"** tab
   - Click **"Show"** next to API Token
   - Copy the token

2. **Paste it** when prompted (it's hidden, so you won't see it as you type)

3. **Press Enter**

## Why This Happened

You probably ran `npm run monday:dev` which tries to use the mapps CLI. The CLI wants an API token to authenticate.

**But for Custom URL development, you don't need it!**

## Recommended Approach

**Stick with the Custom URL method:**

```bash
# Terminal 1 - Just run dev server
npm run dev

# Terminal 2 - Just run tunnel  
npm run monday:tunnel
```

Then use the ngrok URL in Developer Center → Custom URL.

**No API token needed!**

## If You Want to Use mapps CLI

If you want to use mapps features later, you can:
1. Get API token from Developer Center → API tab
2. Run: `mapps init` separately
3. Provide token when asked

But for now, **cancel the prompt and use Custom URL approach**.


