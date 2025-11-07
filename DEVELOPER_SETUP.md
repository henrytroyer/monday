# Developer Setup Guide

This guide provides detailed steps for setting up your monday.com app development environment.

## Initial Setup

### 1. Create App in monday.com Developer Center

1. Log in to your monday.com account
2. Click your profile picture (top right) → Select "Developers"
3. Click "Create App"
4. Fill in:
   - **App Name**: Your app name (e.g., "Volunteer Management")
   - **Description**: Brief description of your app
   - **Category**: Select appropriate category
5. Click "Create"

### 2. Configure App Features

After creating your app, you need to add features:

#### For Dashboard Widgets:
1. Go to "Features" tab
2. Click "Add Feature"
3. Select "Dashboard Widget"
4. Choose "Custom Widget"
5. Configure:
   - **Feature Name**: Your widget name
   - **Settings**: Add any settings you need
6. Save

#### For Board Views:
1. Go to "Features" tab
2. Click "Add Feature"
3. Select "Board View"
4. Choose "Custom View"
5. Configure settings
6. Save

#### For Forms/Integrations:
1. Go to "Features" tab
2. Click "Add Feature"
3. Select appropriate feature type
4. Configure settings
5. Save

### 3. Configure OAuth Scopes

1. Go to "OAuth" tab in Developer Center
2. Select required scopes:
   - `boards:read` - Read board data
   - `boards:write` - Create/update boards
   - `items:read` - Read items
   - `items:write` - Create/update items
   - `users:read` - Read user information
   - `workspaces:read` - Read workspace data
3. Save scopes

### 4. Get App Credentials

1. Note your **App ID** (visible in app settings)
2. Note your **Version ID** (visible when you create a version)
3. Get your **API Token** (if needed for server-side operations)

## Local Development

### Using monday.com CLI

1. **Login:**
   ```bash
   npm run monday:login
   ```
   Follow prompts to authenticate with monday.com

2. **Start Development Server:**
   ```bash
   npm run monday:start
   ```
   This will:
   - Start Vite dev server on port 4040
   - Create a tunnel URL (e.g., `https://abc123.loca.lt`)
   - Display the URL in terminal

3. **Update Custom URL:**
   - Copy the tunnel URL from terminal
   - Go to Developer Center → Your App → Feature Settings
   - Paste URL into "Custom URL" field
   - Save

4. **Test in monday.com:**
   - Open a board/dashboard in monday.com
   - Add your app feature (widget/view)
   - Your app should load from the tunnel URL

### Using Standard Development Server

1. **Start Dev Server:**
   ```bash
   npm run dev
   ```

2. **Set Up Tunnel:**
   - Install ngrok: `npm install -g ngrok`
   - Run: `ngrok http 4040`
   - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

3. **Update Custom URL in Developer Center** (same as above)

## Testing Your App

### Testing Dashboard Widgets

1. Go to a monday.com dashboard
2. Click "+" to add widget
3. Select your custom widget
4. Configure settings if needed
5. Widget should load and display your component

### Testing Board Views

1. Open a board in monday.com
2. Click "Views" dropdown
3. Select your custom view
4. View should load with your component

### Debugging

- **Browser Console**: Check for errors and SDK logs
- **Network Tab**: Monitor API calls and responses
- **React DevTools**: Inspect component state and props

## Building for Production

### Build Process

```bash
npm run build
```

This creates optimized production files in `dist/` directory.

### Deploy to monday.com Hosting

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   export VITE_MONDAY_APP_VERSION_ID=your_version_id
   npm run monday:deploy
   ```

3. **Verify:**
   - Go to Developer Center
   - Check app status
   - Test in monday.com

### Deploy to Firebase

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login:**
   ```bash
   firebase login
   ```

3. **Initialize (first time):**
   ```bash
   npm run firebase:init
   ```
   - Select "Hosting"
   - Choose/create Firebase project
   - Set public directory to `dist`
   - Configure as single-page app

4. **Deploy:**
   ```bash
   npm run firebase:deploy
   ```

5. **Update Custom URL:**
   - Copy Firebase hosting URL
   - Update in Developer Center

## Environment Variables

Create a `.env` file (use `.env.example` as template):

```env
VITE_MONDAY_API_TOKEN=your_api_token
VITE_MONDAY_APP_VERSION_ID=your_version_id
VITE_MONDAY_CUSTOM_URL=your_custom_url
```

Note: These are optional for client-side apps. The SDK handles authentication automatically when running in monday.com context.

## Common Issues

### Tunnel Not Working

- Check firewall settings
- Try different tunnel service (ngrok, localtunnel)
- Verify port 4040 is available

### App Not Loading

- Verify Custom URL is correct
- Check tunnel is active
- Review browser console for errors
- Ensure CORS headers are correct if hosting externally

### API Calls Failing

- Verify OAuth scopes are set
- Check API version (`monday.setApiVersion('2023-10')`)
- Ensure user has permissions on boards
- Review GraphQL query syntax

### Build Errors

- Run `npm install` to update dependencies
- Check TypeScript errors: `npm run lint`
- Clear `node_modules` and reinstall if needed

## Best Practices

1. **Version Control**: Use `.gitignore` to exclude `.env` and `node_modules`
2. **Code Organization**: Keep components modular and organized
3. **Error Handling**: Always handle API errors gracefully
4. **Type Safety**: Use TypeScript types for monday.com SDK
5. **Testing**: Test locally before deploying
6. **Documentation**: Document your components and API usage

## Next Steps

- Customize the HelloWorld component
- Build your first dashboard widget
- Create custom forms for data collection
- Integrate with external services
- Deploy and share your app


