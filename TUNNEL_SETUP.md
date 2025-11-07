# Tunnel Setup Guide - Fixing NgrokClientError

If you're seeing `NgrokClientError: failed to start tunnel`, it means ngrok needs authentication. Here are solutions:

## Solution 1: Get Free Ngrok Token (Recommended)

1. **Sign up for free ngrok account:**
   - Go to https://dashboard.ngrok.com/signup
   - Sign up (free account works fine)
   - Verify your email

2. **Get your auth token:**
   - Log in to https://dashboard.ngrok.com
   - Go to **"Your Authtoken"** section
   - Copy your token (looks like: `2abc123def456ghi789jkl012mno345pqr678stu901vwx`)

3. **Authenticate the CLI:**
   ```bash
   npx @mondaydotcomorg/monday-cli tunnel auth YOUR_NGROK_TOKEN
   ```

4. **Now start tunnel:**
   ```bash
   npm run monday:tunnel
   ```

## Solution 2: Use Ngrok Directly (Alternative)

If the CLI tunnel doesn't work, use ngrok directly:

1. **Install ngrok:**
   ```bash
   brew install ngrok/ngrok/ngrok
   ```
   Or download from: https://ngrok.com/download

2. **Authenticate ngrok:**
   ```bash
   ngrok config add-authtoken YOUR_NGROK_TOKEN
   ```
   (Get token from https://dashboard.ngrok.com/get-started/your-authtoken)

3. **Update package.json script:**
   Replace the `monday:tunnel` script with:
   ```json
   "monday:tunnel": "ngrok http 4040"
   ```

4. **Start tunnel:**
   ```bash
   npm run monday:tunnel
   ```

## Solution 3: Use Localtunnel (No Auth Required)

Localtunnel doesn't require authentication:

1. **Install localtunnel:**
   ```bash
   npm install -g localtunnel
   ```

2. **Update package.json:**
   ```json
   "monday:tunnel": "lt --port 4040"
   ```

3. **Start tunnel:**
   ```bash
   npm run monday:tunnel
   ```

## Solution 4: Use Cloudflare Tunnel (Advanced)

For more control:

1. **Install cloudflared:**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Update package.json:**
   ```json
   "monday:tunnel": "cloudflared tunnel --url http://localhost:4040"
   ```

## Quick Fix: Update Scripts

After getting your ngrok token, you can also pass it directly:

Update `package.json`:
```json
"monday:tunnel": "npx @mondaydotcomorg/monday-cli tunnel start 4040 -t YOUR_NGROK_TOKEN"
```

Or set as environment variable:
```bash
export NGROK_AUTHTOKEN=your_token_here
npm run monday:tunnel
```

## Recommended Workflow

**Easiest approach:**

1. Get free ngrok token (takes 2 minutes)
2. Authenticate once: `npx @mondaydotcomorg/monday-cli tunnel auth YOUR_TOKEN`
3. Use normally: `npm run monday:tunnel`

The token is saved, so you only need to do this once!

## Troubleshooting

### Still getting errors?

1. **Make sure dev server is running first:**
   ```bash
   npm run dev
   ```
   Then in another terminal:
   ```bash
   npm run monday:tunnel
   ```

2. **Check if port 4040 is available:**
   ```bash
   lsof -i :4040
   ```

3. **Try different port:**
   - Change port in `vite.config.ts` to 4041
   - Update tunnel command to use 4041

4. **Use ngrok directly for better error messages:**
   ```bash
   ngrok http 4040
   ```


