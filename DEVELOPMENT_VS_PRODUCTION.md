# Development vs Production - Quick Guide

## Current Setup: Development Mode ✅

**What you have:**
- App created in Developer Center (not published)
- Custom URL pointing to ngrok (your local server)
- Running on your computer
- Only accessible to you

**This is PERFECT for development!**

## How to Use Your Development App

Even though it's "not live", you can use it right now:

### Step 1: Make Sure Everything is Running

```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run monday:tunnel
```

### Step 2: Verify Custom URL is Set

1. Developer Center → Your App → Features
2. Your Feature → Custom URL
3. Should be: `https://e828ca063544.ngrok-free.app` (or your ngrok URL)

### Step 3: Use It in monday.com

**For Board View:**
- Go to any board
- Click "Views" dropdown
- Select your custom view

**For Dashboard Widget:**
- Go to any dashboard
- Click "+" → Add Widget
- Find your widget

## If It's Not Working

**Common issues:**

1. **"App not found" or "Not available"**
   - This might mean the feature isn't enabled
   - Check Developer Center → Features → Is it enabled?

2. **"Can't load" or blank page**
   - Check Custom URL matches ngrok URL exactly
   - Make sure both terminals are running
   - Try accessing ngrok URL directly in browser

3. **"App not installed"**
   - In development, you don't "install" it
   - It should just work via Custom URL
   - Make sure you're logged into the same account

## Making It "Live" (For Later)

When you're ready to share:

1. **Deploy to monday.com hosting:**
   ```bash
   npm run build
   # Then deploy using Developer Center or CLI
   ```

2. **Submit for review** (if making public)

3. **Others can install** from marketplace

**But you don't need this for development!**

## Quick Check

**Answer these:**

1. Is your dev server running? (`npm run dev`)
2. Is ngrok running? (`npm run monday:tunnel`)
3. Is Custom URL set in Developer Center?
4. Are you trying to use it in YOUR monday.com account?

**If all yes, it should work even though it's "not live"!**


