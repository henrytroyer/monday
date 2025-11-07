# OAuth Callback URL for monday.com

## Important: Client-Side Apps Don't Need Callback URLs

**For the app we've been building (client-side React app):**
- ✅ **You DON'T need a callback URL**
- ✅ Authentication is automatic when app runs in monday.com
- ✅ SDK handles OAuth automatically

**Callback URLs are only needed for:**
- Server-side OAuth flows
- External integrations
- Custom OAuth implementations

## If You Need OAuth Callback URL

### For Development (Local)

If you're implementing server-side OAuth, use your ngrok URL:

```
https://e828ca063544.ngrok-free.app/oauth/callback
```

Or create a specific callback route:
```
https://YOUR_NGROK_URL.ngrok.io/oauth/callback
```

### For Production

Use your production domain:

```
https://yourdomain.com/oauth/callback
```

Or if using Firebase:
```
https://your-app.firebaseapp.com/oauth/callback
```

## Setting Callback URL in Developer Center

1. **Go to Developer Center:**
   - https://developer.monday.com/apps
   - Click your app

2. **OAuth Tab:**
   - Go to **"OAuth"** tab
   - Look for **"Redirect URIs"** or **"Callback URLs"** section
   - Add your callback URL

3. **For Development:**
   - Add: `https://e828ca063544.ngrok-free.app/oauth/callback`
   - (Use your actual ngrok URL)

4. **For Production:**
   - Add your production callback URL
   - Must use HTTPS

## Example: Implementing OAuth Callback

If you're building a server-side integration, here's how to handle the callback:

```typescript
// Server-side example (Node.js/Express)
import express from 'express';
import axios from 'axios';

const app = express();

app.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    // Exchange authorization code for access token
    const response = await axios.post('https://auth.monday.com/oauth2/token', {
      client_id: process.env.MONDAY_CLIENT_ID,
      client_secret: process.env.MONDAY_CLIENT_SECRET,
      code: code,
    });

    const { access_token } = response.data;
    
    // Store access token securely
    // Redirect user or return success
    
    res.redirect('/app?token=' + access_token);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});
```

## OAuth Flow Overview

1. **User clicks "Connect"** in your app
2. **Redirect to monday.com:**
   ```
   https://auth.monday.com/oauth2/authorize?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=https://your-app.com/oauth/callback&
     scope=boards:read,items:read
   ```

3. **User authorizes** → monday.com redirects to your callback URL:
   ```
   https://your-app.com/oauth/callback?code=AUTHORIZATION_CODE
   ```

4. **Your server exchanges code for token:**
   ```
   POST https://auth.monday.com/oauth2/token
   {
     client_id: YOUR_CLIENT_ID,
     client_secret: YOUR_CLIENT_SECRET,
     code: AUTHORIZATION_CODE
   }
   ```

5. **You receive access_token** → Use it for API calls

## Your Current Setup

**Since you're building a client-side app:**
- ❌ **Don't need callback URL** (SDK handles it)
- ✅ **Just use Custom URL** (your ngrok URL)
- ✅ **SDK authenticates automatically**

**If you see a callback URL field in Developer Center:**
- You can leave it empty for client-side apps
- Or use your ngrok URL if required: `https://e828ca063544.ngrok-free.app/oauth/callback`

## Quick Reference

**For Client-Side Apps (Your Current Setup):**
- Custom URL: `https://e828ca063544.ngrok-free.app` ✅
- Callback URL: Not needed ✅

**For Server-Side OAuth:**
- Callback URL: `https://YOUR_DOMAIN/oauth/callback`
- Must match exactly what's in Developer Center
- Must use HTTPS

## Need Help?

If you're implementing OAuth and need the callback URL:
1. Use your ngrok URL for development
2. Add `/oauth/callback` (or your chosen path)
3. Register it in Developer Center → OAuth → Redirect URIs
4. Handle the callback route in your server code


