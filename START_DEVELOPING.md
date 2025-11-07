# You're Ready! Start Developing Now

✅ **Ngrok is installed and authenticated!** You're all set to start developing locally.

## Quick Start (3 Steps)

### Step 1: Start Dev Server

**Terminal 1:**
```bash
npm run dev
```

Wait until you see:
```
➜  Local:   http://localhost:4040/
```

### Step 2: Start Tunnel

**Terminal 2 (new terminal window):**
```bash
npm run monday:tunnel
```

You'll see ngrok output like:
```
Session Status                online
Account                       Your Name (Plan: Free)
Forwarding                    https://abc123.ngrok.io -> http://localhost:4040
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 3: Connect to monday.com

1. Go to [monday.com Developer Center](https://developer.monday.com)
2. Open your app → **Features** tab
3. Click on your feature (e.g., "My Custom View")
4. Paste the ngrok URL into **"Custom URL"** field
5. Click **"Save"**

### Step 4: Test!

1. Open any board in monday.com
2. Click **"Views"** dropdown
3. Select your custom view
4. **Your app should load!** 🎉

## Development Workflow

Now you can:

1. **Edit code** in `src/components/HelloWorld.tsx` or any file
2. **Save** - Vite will hot-reload automatically
3. **See changes** in monday.com immediately!

## Quick Commands

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Tunnel (new terminal)
npm run monday:tunnel
```

## Notes

- **Keep both terminals open** while developing
- **Ngrok URL changes** each time you restart (unless you have a paid plan)
- **Update Custom URL** in Developer Center if you restart ngrok
- **Port 4040** is already configured in `vite.config.ts`

## Troubleshooting

### Dev server won't start?
- Check if port 4040 is in use: `lsof -i :4040`
- Change port in `vite.config.ts` if needed

### Tunnel not working?
- Make sure dev server is running first
- Check ngrok is authenticated: `ngrok config check`

### App not loading in monday.com?
- Verify Custom URL is set correctly
- Check browser console (F12) for errors
- Make sure tunnel is still active

## Next Steps

1. ✅ Customize `src/components/HelloWorld.tsx`
2. ✅ Use hooks: `useMondayContext()`, `useMondayApi()`
3. ✅ Build features using utilities in `src/utils/`
4. ✅ Check `README.md` for API examples

Happy coding! 🚀


