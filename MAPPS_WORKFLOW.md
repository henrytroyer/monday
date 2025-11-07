# Using mapps CLI - Complete Workflow

## Initial Setup (One Time)

### 1. Get API Token
- Developer Center → Your App → API tab → Show token
- Copy it

### 2. Initialize mapps
When prompted, paste your API token and press Enter.

Or run manually:
```bash
npx @mondaydotcomorg/monday-cli init
```

### 3. Follow Prompts
- App ID: `10499615`
- Feature type: (whatever you created)
- Port: `4040`

## Daily Development Workflow

### Option A: Automatic (Recommended)

```bash
npm run monday:dev
```

This starts:
- Dev server on port 4040
- mapps tunnel automatically
- Sets Custom URL in Developer Center automatically

### Option B: Manual (More Control)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
npm run monday:tunnel
```

## What mapps Does

1. **Creates tunnel** (like ngrok, but monday.com's own)
2. **Shows you URL** (e.g., `https://abc123.monday.apps.dev`)
3. **Automatically sets Custom URL** in Developer Center
4. **Handles authentication** automatically

## Benefits Over Ngrok

✅ **No separate account needed**
✅ **No manual URL copying**
✅ **Automatic Custom URL setup**
✅ **Better integration**
✅ **No 403 errors**

## Using Your App

Once mapps tunnel is running:

1. **Check terminal** - It will show the tunnel URL
2. **mapps automatically updates** Developer Center Custom URL
3. **Open monday.com** → Your board → Views → Your custom view
4. **Your app loads!**

## Troubleshooting

### "Access token is missing"
- Run: `npx @mondaydotcomorg/monday-cli init`
- Provide your API token

### Tunnel doesn't start
- Make sure dev server is running first
- Check port 4040 is available
- Verify API token is correct

### App not loading
- Check mapps terminal for tunnel URL
- Verify Custom URL in Developer Center matches
- Make sure both terminals are running

## Commands Reference

```bash
# Initialize mapps (one time)
npx @mondaydotcomorg/monday-cli init

# Create tunnel
npm run monday:tunnel

# Start everything
npm run monday:dev

# Check status
npx @mondaydotcomorg/monday-cli --help
```


