# Quick Fix: Tunnel Error

## The Problem
`NgrokClientError: failed to start tunnel` means ngrok needs authentication.

## Fastest Solution (2 minutes)

### Option A: Authenticate Ngrok (Recommended)

1. **Get free ngrok token:**
   - Visit: https://dashboard.ngrok.com/get-started/your-authtoken
   - Sign up if needed (free)
   - Copy your authtoken

2. **Authenticate once:**
   ```bash
   npx @mondaydotcomorg/monday-cli tunnel auth YOUR_TOKEN_HERE
   ```

3. **Use normally:**
   ```bash
   npm run monday:tunnel
   ```

**Done!** Token is saved, you won't need to do this again.

### Option B: Use Localtunnel (No Auth)

If you don't want to sign up for ngrok:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **In another terminal, use localtunnel:**
   ```bash
   npm run monday:tunnel:lt
   ```

3. **Copy the URL** it gives you (e.g., `https://abc123.loca.lt`)

4. **Use that URL** in Developer Center → Custom URL

## Which Should You Use?

- **Ngrok** - More reliable, better for production, requires free signup
- **Localtunnel** - No signup needed, good for quick testing, URLs change each time

For development, either works fine!


