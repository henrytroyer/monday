# monday.com App Development

A React + TypeScript application framework for building custom apps on monday.com, including dashboard widgets, forms, and integrations.

## Overview

This project provides a foundation for building customizable systems on monday.com, including:
- **Dashboard Widgets** - Custom visualizations for monday.com dashboards
- **Board Views** - Custom ways to visualize and interact with board data
- **Forms** - Custom data collection forms
- **Integrations** - Connect external services and automate workflows

## Prerequisites

- Node.js (v18 or higher) and npm
- A monday.com account with Developer access
- monday.com API access (get from Developer Center)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up monday.com Developer Account

1. Go to [monday.com Developer Center](https://developer.monday.com/apps/docs)
2. Click on your profile picture → Select "Developers"
3. Create a new app
4. Note your App ID and Version ID (you'll need these later)

### 3. Configure Your App

1. In the Developer Center, add features to your app:
   - **Dashboard Widget**: For dashboard visualizations
   - **Board View**: For custom board views
   - **Integration**: For external service connections

2. Configure OAuth scopes:
   - `boards:read`, `boards:write`
   - `items:read`, `items:write`
   - `users:read`
   - `workspaces:read`

### 4. Local Development Setup

#### Option A: Using monday.com CLI (Recommended)

1. **Login to monday.com CLI:**
   ```bash
   npm run monday:login
   ```

2. **Start local development server:**
   ```bash
   npm run monday:start
   ```
   This will start the development server and provide a tunnel URL (e.g., `https://abc123.loca.lt`)

3. **Configure Custom URL in Developer Center:**
   - Go to your app's feature settings in Developer Center
   - Paste the tunnel URL from step 2 into the "Custom URL" field
   - Save and refresh your monday.com board/dashboard

#### Option B: Using Standard Vite Dev Server

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Configure tunnel manually:**
   - Use a service like [ngrok](https://ngrok.com/) or [localtunnel](https://localtunnel.github.io/www/)
   - Point the tunnel to `http://localhost:4040`
   - Add the tunnel URL to your app's Custom URL in Developer Center

### 5. Build and Deploy

#### Deploy to monday.com Hosting (monday code)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy using CLI:**
   ```bash
   # Set your app version ID in environment variable first
   export VITE_MONDAY_APP_VERSION_ID=your_version_id
   npm run monday:deploy
   ```

   Or manually:
   ```bash
   mapps code:push --client-side -d . -i YOUR_APP_VERSION_ID
   ```

#### Deploy to Firebase Hosting

1. **Initialize Firebase (first time only):**
   ```bash
   npm run firebase:init
   ```
   Select "Hosting" and configure as needed.

2. **Deploy:**
   ```bash
   npm run firebase:deploy
   ```

3. **Update Custom URL in Developer Center:**
   - Go to your app's feature settings
   - Set the Custom URL to your Firebase hosting URL

## Project Structure

```
Monday/
├── src/
│   ├── components/
│   │   ├── dashboard-widgets/    # Dashboard widget components
│   │   ├── forms/                # Form components
│   │   ├── integrations/         # Integration components
│   │   └── HelloWorld.tsx         # Main Hello World component
│   ├── types/
│   │   └── monday.d.ts           # TypeScript definitions for monday.com SDK
│   ├── App.tsx                    # Main app component
│   └── main.tsx                  # Entry point
├── monday.config.json            # monday.com app configuration
├── firebase.json                 # Firebase hosting configuration
└── vite.config.ts               # Vite configuration
```

## Using the monday.com SDK

### Using Custom Hooks (Recommended)

This project includes custom React hooks that make working with monday.com easier:

```typescript
import { useMondayContext } from './hooks/useMondayContext';
import { useMondayApi } from './hooks/useMondayApi';
import { queries } from './utils/mondayQueries';

function MyComponent() {
  const { context, isLoading, error } = useMondayContext();
  const { data, loading, execute } = useMondayApi();

  useEffect(() => {
    if (context?.boardId) {
      execute(queries.getBoardWithItems, {
        boardId: [context.boardId.toString()]
      });
    }
  }, [context, execute]);

  // Use data, loading states, etc.
}
```

### Basic SDK Usage

```typescript
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
monday.setApiVersion('2023-10');

// Listen for context events
monday.listen('context', (res) => {
  console.log('Context:', res.data);
});

// Make GraphQL API calls
const query = `query {
  boards(limit: 5) {
    id
    name
  }
}`;

monday.api(query).then((res) => {
  console.log('Boards:', res.data);
});
```

### Available Utilities

- **`useMondayContext()`** - Hook for accessing monday.com context
- **`useMondayApi()`** - Hook for making API calls with loading/error states
- **`queries`** - Pre-built GraphQL queries (see `src/utils/mondayQueries.ts`)
- **`mutations`** - Pre-built GraphQL mutations
- **`mondayHelpers`** - Helper functions for common operations

### Common GraphQL Queries

#### Get Board Items

```typescript
const query = `query ($boardId: [ID!]) {
  boards(ids: $boardId) {
    id
    name
    items {
      id
      name
      column_values {
        id
        text
        value
      }
    }
  }
}`;

monday.api(query, {
  variables: { boardId: ['123456789'] }
});
```

#### Create Item

```typescript
const mutation = `mutation ($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) {
    id
  }
}`;

monday.api(mutation, {
  variables: {
    boardId: '123456789',
    itemName: 'New Item'
  }
});
```

#### Update Item Column Value

```typescript
const mutation = `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
  change_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: $columnId,
    value: $value
  ) {
    id
  }
}`;

monday.api(mutation, {
  variables: {
    boardId: '123456789',
    itemId: '987654321',
    columnId: 'status',
    value: JSON.stringify({ label: 'Done' })
  }
});
```

## Building Custom Features

### Dashboard Widgets

Dashboard widgets appear on monday.com dashboards. See `src/components/dashboard-widgets/index.tsx` for a starter template.

**Key Features:**
- Access to dashboard context (board IDs, user info)
- Can query boards and items
- Perfect for visualizations and analytics

### Forms

Custom forms for data collection. See `src/components/forms/index.tsx` for a starter template.

**Key Features:**
- Collect user input
- Create items on boards
- Update existing items
- Validate and process form data

### Integrations

Connect external services. See `src/components/integrations/index.tsx` for a starter template.

**Key Features:**
- OAuth authentication
- Webhook handling
- External API integration
- Automated workflows

## API Access Patterns

### Forms Use Cases

- **Volunteer Registration**: Collect volunteer information and create items
- **Event Sign-ups**: Manage event registrations
- **Feedback Collection**: Gather user feedback and store in boards

### Dashboard Use Cases

- **Analytics Dashboards**: Visualize board data with charts
- **KPI Tracking**: Display key metrics
- **Custom Reports**: Generate custom reports from board data

### Integration Use Cases

- **Email Integration**: Send emails when items are created/updated
- **Calendar Sync**: Sync items with external calendars
- **Slack/Teams**: Post notifications to team channels
- **Data Import/Export**: Sync data with external systems

## Development Tips

1. **Use TypeScript**: Leverage the type definitions in `src/types/monday.d.ts`
2. **Test Locally**: Always test your app locally before deploying
3. **Monitor Console**: Check browser console for SDK errors and API responses
4. **API Version**: Always set API version using `monday.setApiVersion('2023-10')`
5. **Error Handling**: Implement proper error handling for API calls
6. **Context Data**: Use context data to understand user's current view/board

## Troubleshooting

### App Not Loading in monday.com

- Check that Custom URL is correctly set in Developer Center
- Verify tunnel is running (if using local development)
- Check browser console for errors
- Ensure CORS is properly configured if hosting externally

### API Calls Failing

- Verify OAuth scopes are correctly configured
- Check API version is set correctly
- Ensure you have proper permissions on the board/workspace
- Review GraphQL query syntax

### Build Errors

- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors: `npm run lint`
- Verify Node.js version compatibility

## Resources

- [monday.com Developer Documentation](https://developer.monday.com/apps/docs)
- [monday.com GraphQL API Reference](https://developer.monday.com/api-reference/docs)
- [monday.com SDK Documentation](https://developer.monday.com/apps/docs/introduction-to-the-sdk)
- [monday.com Developer Community](https://community.monday.com/c/developers/13)

## Next Steps

1. **Customize HelloWorld Component**: Modify `src/components/HelloWorld.tsx` to build your first feature
2. **Build Dashboard Widget**: Start with `src/components/dashboard-widgets/index.tsx`
3. **Create Forms**: Use `src/components/forms/index.tsx` as a starting point
4. **Add Integrations**: Build on `src/components/integrations/index.tsx`
5. **Deploy**: Test locally, then deploy to monday.com hosting or Firebase

## License

This project is set up for development and testing purposes.
