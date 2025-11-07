# OAuth Redirect URI Setup

## What You Need

For monday.com OAuth, you need to provide a **Redirect URI** (also called Callback URL) in Developer Center.

## Format

### For Development (Using mapps CLI)

When mapps creates a tunnel, it will give you a URL like:
```
https://abc123.monday.apps.dev
```

Your redirect URI should be:
```
https://abc123.monday.apps.dev/oauth/callback
```

### For Development (Using Ngrok)

If using ngrok:
```
https://e828ca063544.ngrok-free.app/oauth/callback
```

### For Production

When deployed:
```
https://yourdomain.com/oauth/callback
```

Or if using Firebase:
```
https://your-app.firebaseapp.com/oauth/callback
```

## Step-by-Step Setup

### 1. Get Your Tunnel URL

**If using mapps:**
- Check the terminal where `npm run monday:tunnel` is running
- Copy the URL it shows (e.g., `https://abc123.monday.apps.dev`)

**If using ngrok:**
- Check ngrok terminal
- Copy the HTTPS URL (e.g., `https://e828ca063544.ngrok-free.app`)

### 2. Add `/oauth/callback` to the URL

Your redirect URI = `YOUR_TUNNEL_URL/oauth/callback`

Example:
- Tunnel URL: `https://abc123.monday.apps.dev`
- Redirect URI: `https://abc123.monday.apps.dev/oauth/callback`

### 3. Add to Developer Center

1. Go to: https://developer.monday.com/apps
2. Click your app
3. Go to **"OAuth"** tab
4. Find **"Redirect URIs"** or **"Callback URLs"** section
5. Click **"Add"** or **"+"**
6. Paste your redirect URI: `https://YOUR_TUNNEL_URL/oauth/callback`
7. Click **"Save"**

### 4. Handle the Callback (Already Set Up!)

I've created `src/pages/OAuthCallback.tsx` that handles the OAuth callback.

To make it accessible, you'll need to add routing. For now, you can test it by:

1. **Adding it to your main app** (see below)
2. **Or create a simple HTML file** at `public/oauth/callback.html`

## Quick Setup Options

### Option A: Simple Route (Recommended)

Add to your `App.tsx`:

```typescript
import { useState, useEffect } from 'react';
import OAuthCallback from './pages/OAuthCallback';

function App() {
  // Check if we're on the callback route
  const isCallback = window.location.pathname === '/oauth/callback';
  
  if (isCallback) {
    return <OAuthCallback />;
  }
  
  return (
    <div className="app">
      <HelloWorld />
    </div>
  );
}
```

### Option B: Use React Router (If you want full routing)

Install React Router:
```bash
npm install react-router-dom
```

Then set up routes in your app.

## Current Redirect URI

**For mapps CLI:**
```
https://YOUR_MAPPS_URL.monday.apps.dev/oauth/callback
```

**For ngrok:**
```
https://e828ca063544.ngrok-free.app/oauth/callback
```

**Replace with your actual tunnel URL!**

## Important Notes

1. **Must match exactly** - The redirect URI in Developer Center must match exactly what you use in OAuth requests
2. **Must use HTTPS** - monday.com requires HTTPS for redirect URIs
3. **Can have multiple** - You can add multiple redirect URIs (dev, staging, production)
4. **Must be registered** - The redirect URI must be added in Developer Center before use

## Testing

After setting up:

1. **Trigger OAuth flow** (if you're implementing it)
2. **User authorizes** → monday.com redirects to your callback URL
3. **Your callback page handles it** → Shows success/error

## For Client-Side Apps

**Note:** If you're building a client-side app (like we've been doing), the monday.com SDK handles OAuth automatically. You might not need a redirect URI unless:

- You're implementing custom OAuth flow
- You're integrating with external services
- You're building server-side authentication

For most client-side apps, the SDK handles everything automatically!


