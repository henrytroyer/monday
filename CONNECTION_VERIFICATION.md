# How to Verify Your monday.com Connection

Let's verify step-by-step that everything is connected correctly.

## Quick Verification Checklist

### ✅ Step 1: Check Both Processes Are Running

**Terminal 1 should show:**
```bash
npm run dev
# Should see: VITE ready, Local: http://localhost:4040
```

**Terminal 2 should show:**
```bash
npm run monday:tunnel
# Should show: Forwarding https://xxx.ngrok.io -> http://localhost:4040
```

**Or run:**
```bash
./verify-connection.sh
```

### ✅ Step 2: Test Local App

Open in your browser:
```
http://localhost:4040
```

**Expected:** You should see "Hello monday.com!" page

**If this doesn't work:** Your dev server isn't running correctly

### ✅ Step 3: Get Your Ngrok URL

Look at the terminal where you ran `npm run monday:tunnel`. You should see something like:

```
Forwarding  https://e828ca063544.ngrok-free.app -> http://localhost:4040
```

**Copy that HTTPS URL** - that's what you need!

### ✅ Step 4: Test Ngrok URL Directly

Open in your browser:
```
https://e828ca063544.ngrok-free.app
```

**Expected:** 
- May show ngrok warning page first (free tier)
- Click "Visit Site" button
- Should see same "Hello monday.com!" page

**If this doesn't work:** Ngrok tunnel isn't forwarding correctly

### ✅ Step 5: Verify Developer Center Configuration

1. Go to: https://developer.monday.com/apps
2. Click on your app (ID: 10499615)
3. Go to **"Features"** tab
4. Click on your feature (probably "Board View" or "Dashboard Widget")
5. Scroll to **"Custom URL"** field
6. **Verify it matches your ngrok URL exactly**
   - Should be: `https://e828ca063544.ngrok-free.app` (or whatever ngrok shows)
   - Must start with `https://`
   - No trailing slash
   - Must match EXACTLY what ngrok shows

### ✅ Step 6: Test in monday.com

1. Open monday.com in your browser
2. Go to **any board** (or create a test board)
3. Click **"Views"** dropdown (top of board)
4. Select **your custom view**
5. **What should happen:**
   - Your app loads (may show "Loading..." briefly)
   - You see "Hello monday.com!" page
   - Context data appears (if available)

## Troubleshooting

### Issue: "App not loading" in monday.com

**Check:**
1. Is dev server running? (`http://localhost:4040` works?)
2. Is ngrok running? (Check terminal)
3. Does ngrok URL work in browser directly?
4. Does Custom URL in Developer Center match ngrok URL exactly?
5. Try refreshing the board view
6. Check browser console (F12) for errors

### Issue: Ngrok URL changed

**If you restarted ngrok, the URL changes!**

1. Check new URL in ngrok terminal
2. Update Custom URL in Developer Center
3. Save and refresh monday.com

### Issue: "Loading..." stuck forever

This might mean:
- Context isn't arriving (but app should still show after 3 seconds now)
- Check browser console for errors
- Try refreshing

### Issue: Can't see the view option

**Make sure:**
- You created a "Board View" feature (not just Dashboard Widget)
- Feature is enabled in Developer Center
- You're on a board (not dashboard) to see board views

## How to Know You're Connected

**You're connected when:**

1. ✅ You can access `http://localhost:4040` → See your app
2. ✅ You can access `https://your-ngrok-url.ngrok.io` → See your app
3. ✅ In monday.com board → Views → Your view → See your app
4. ✅ Changes to your code appear in monday.com (hot reload)

**If all 4 work, you're fully connected!**

## Quick Test

Run this command to verify everything:
```bash
./verify-connection.sh
```

This will check all the pieces and tell you what's working and what needs fixing.


