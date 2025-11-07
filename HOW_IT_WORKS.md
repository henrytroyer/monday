# How the Tunnel Works - Complete Flow

Let me walk you through exactly how your Hello World app gets from your computer to monday.com:

## The Complete Flow

```
Your Computer          Internet          monday.com
     │                     │                  │
     │ 1. Dev Server       │                  │
     │    (localhost:4040)  │                  │
     │         │            │                  │
     │         │ 2. Ngrok   │                  │
     │         │ Tunnel     │                  │
     │         │───────>─────│                  │
     │         │             │                  │
     │         │             │ 3. Developer    │
     │         │             │    Center       │
     │         │             │    (Custom URL)  │
     │         │             │         │        │
     │         │             │         │ 4.    │
     │         │             │         │ Board │
     │         │             │         │ View  │
     │         │             │         │───────│
     │         │             │                  │
     │         │ 5. Request  │                  │
     │         │<────────────│                  │
     │         │             │                  │
     │ 6. Serves App         │                  │
     │<────────│              │                  │
     │         │              │                  │
     │         │ 7. Response │                  │
     │         │─────────────>│                  │
     │         │              │                  │
     │         │              │ 8. Shows in      │
     │         │              │    monday.com    │
```

## Step-by-Step Breakdown

### Step 1: Your Dev Server Runs Locally
```bash
npm run dev
```
- Starts Vite dev server on `http://localhost:4040`
- Serves your React app (HelloWorld component)
- Only accessible on your computer

### Step 2: Ngrok Creates Public Tunnel
```bash
npm run monday:tunnel
```
- Creates a public HTTPS URL (e.g., `https://abc123.ngrok.io`)
- Forwards all traffic from that URL → `localhost:4040`
- Makes your local server accessible from the internet

### Step 3: You Paste URL in Developer Center
- You paste the ngrok URL into the "Custom URL" field
- monday.com now knows: "When user opens this view, load content from this URL"

### Step 4: User Opens Board View in monday.com
- User clicks "Views" → Selects your custom view
- monday.com reads the Custom URL you configured

### Step 5: monday.com Requests Your App
- monday.com makes an HTTP request to your ngrok URL
- Request goes: monday.com → Internet → ngrok → your localhost:4040

### Step 6: Your Dev Server Responds
- Vite serves your React app
- Your `App.tsx` → `HelloWorld.tsx` gets loaded
- HTML/JS/CSS sent back through the tunnel

### Step 7: Response Goes Back
- Response goes: localhost:4040 → ngrok → Internet → monday.com

### Step 8: monday.com Displays Your App
- monday.com loads your React app in an iframe
- Your HelloWorld component renders inside monday.com
- SDK automatically connects and provides context

## Why This Works

1. **Ngrok bridges the gap**: Your local server can't be reached from the internet directly, but ngrok can
2. **HTTPS required**: monday.com requires HTTPS (ngrok provides this)
3. **SDK auto-connects**: When your app loads in monday.com, the SDK automatically:
   - Authenticates (using OAuth scopes you configured)
   - Provides context (board ID, user info, etc.)
   - Enables API calls

## Testing the Connection

You can test each part:

1. **Test local server:**
   ```bash
   curl http://localhost:4040
   ```
   Should return HTML

2. **Test through ngrok:**
   ```bash
   curl https://YOUR_NGROK_URL.ngrok.io
   ```
   Should return same HTML

3. **Test in monday.com:**
   - Open board → Views → Your custom view
   - Should see HelloWorld component

## Troubleshooting

### If app doesn't load in monday.com:

1. **Check dev server is running:**
   ```bash
   curl http://localhost:4040
   ```

2. **Check ngrok is running:**
   - Look at terminal where you ran `npm run monday:tunnel`
   - Should show "Forwarding" status

3. **Check URL in Developer Center:**
   - Make sure it matches your ngrok URL exactly
   - Should start with `https://`
   - No trailing slash

4. **Check browser console:**
   - Open monday.com
   - Press F12 → Console tab
   - Look for errors

5. **Check ngrok web interface:**
   - Visit `http://localhost:4040` (ngrok web UI)
   - See requests coming through

## The Magic Moment

When everything connects:
- ✅ Your local code changes
- ✅ Vite hot-reloads
- ✅ Changes appear in monday.com instantly
- ✅ SDK provides monday.com context
- ✅ You can make API calls
- ✅ Full development experience!


