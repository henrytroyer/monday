# Utilities and Helpers Guide

This document describes the utilities, hooks, and helper functions available in this project.

## React Hooks

### `useMondayContext()`

Hook for accessing monday.com context data.

```typescript
import { useMondayContext } from './hooks/useMondayContext';

function MyComponent() {
  const { context, isLoading, error } = useMondayContext();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>Board ID: {context?.boardId}</div>;
}
```

**Returns:**
- `context`: MondayContext object containing board/item/user info
- `isLoading`: Boolean indicating if context is being loaded
- `error`: String error message if context loading failed

### `useMondayApi<T>()`

Hook for making monday.com API calls with built-in loading and error states.

```typescript
import { useMondayApi } from './hooks/useMondayApi';
import { queries } from './utils/mondayQueries';

function MyComponent() {
  const { data, loading, error, execute, reset } = useMondayApi();

  const loadBoards = async () => {
    await execute(queries.getBoard, { boardId: ['123'] });
  };

  return (
    <div>
      <button onClick={loadBoards} disabled={loading}>
        Load Boards
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

**Returns:**
- `data`: Response data from the API call
- `loading`: Boolean indicating if API call is in progress
- `error`: String error message if API call failed
- `execute(query, variables?)`: Function to execute a GraphQL query/mutation
- `reset()`: Function to clear data, error, and loading states

## GraphQL Queries and Mutations

### Pre-built Queries

Located in `src/utils/mondayQueries.ts`:

- `queries.getBoard` - Get basic board information
- `queries.getBoardWithItems` - Get board with all items
- `queries.getBoardColumns` - Get board column definitions
- `queries.getItem` - Get item details
- `queries.getMe` - Get current user information
- `queries.getWorkspaceBoards` - Get boards in a workspace
- `queries.searchItems` - Search for items

### Pre-built Mutations

Located in `src/utils/mondayQueries.ts`:

- `mutations.createItem` - Create a new item
- `mutations.updateItemName` - Update item name
- `mutations.updateColumnValue` - Update column value
- `mutations.createBoard` - Create a new board
- `mutations.addColumn` - Add column to board
- `mutations.createUpdate` - Create update (comment) on item
- `mutations.archiveItem` - Archive an item
- `mutations.deleteItem` - Delete an item

### Using Queries and Mutations

```typescript
import { queries, mutations } from './utils/mondayQueries';
import { useMondayApi } from './hooks/useMondayApi';

function MyComponent() {
  const { execute } = useMondayApi();

  const createItem = async () => {
    await execute(mutations.createItem, {
      boardId: '123',
      itemName: 'New Item'
    });
  };

  const loadBoard = async () => {
    await execute(queries.getBoardWithItems, {
      boardId: ['123']
    });
  };
}
```

### Column Value Formatting

The `formatColumnValue()` helper formats values for different column types:

```typescript
import { formatColumnValue } from './utils/mondayQueries';

// For status column
const statusValue = formatColumnValue('Done', 'status');

// For date column
const dateValue = formatColumnValue('2024-01-01', 'date');

// For checkbox
const checkboxValue = formatColumnValue(true, 'checkbox');
```

## Helper Functions

Located in `src/utils/mondayHelpers.ts`:

### `initMondaySDK()`

Initialize the monday.com SDK with default settings.

```typescript
import { initMondaySDK } from './utils/mondayHelpers';

const monday = initMondaySDK();
```

### `getBoardIdFromContext()`

Get the current board ID from context.

```typescript
import { getBoardIdFromContext } from './utils/mondayHelpers';

const boardId = await getBoardIdFromContext();
```

### `getItemIdFromContext()`

Get the current item ID from context.

```typescript
import { getItemIdFromContext } from './utils/mondayHelpers';

const itemId = await getItemIdFromContext();
```

### `getSettings()` / `saveSettings()`

Get and save app settings.

```typescript
import { getSettings, saveSettings } from './utils/mondayHelpers';

// Get settings
const settings = await getSettings();

// Save settings
await saveSettings({ theme: 'dark', language: 'en' });
```

### `showSuccess()` / `showError()`

Display success or error notifications.

```typescript
import { showSuccess, showError } from './utils/mondayHelpers';

showSuccess('Item created successfully!');
showError('Failed to create item');
```

### `openItem()`

Open an item card in monday.com.

```typescript
import { openItem } from './utils/mondayHelpers';

openItem('item123', 'board456');
```

### `refreshBoard()`

Refresh the current board data.

```typescript
import { refreshBoard } from './utils/mondayHelpers';

refreshBoard();
```

## Example Components

See `src/examples/Examples.tsx` for complete examples:

- `ExampleCreateItem` - Creating items from form data
- `ExampleBoardItems` - Fetching and displaying board items
- `ExampleUpdateColumn` - Updating column values
- `ExampleUserInfo` - Getting current user information

## Complete Example

Here's a complete example combining multiple utilities:

```typescript
import { useMondayContext } from './hooks/useMondayContext';
import { useMondayApi } from './hooks/useMondayApi';
import { queries, mutations } from './utils/mondayQueries';
import { showSuccess, showError } from './utils/mondayHelpers';

function ItemCreator() {
  const { context } = useMondayContext();
  const { loading, execute } = useMondayApi();
  const [itemName, setItemName] = useState('');

  const handleCreate = async () => {
    if (!context?.boardId) {
      showError('No board context available');
      return;
    }

    const result = await execute(mutations.createItem, {
      boardId: context.boardId.toString(),
      itemName
    });

    if (result) {
      showSuccess('Item created!');
      setItemName('');
    } else {
      showError('Failed to create item');
    }
  };

  return (
    <div>
      <input
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Item name"
      />
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating...' : 'Create Item'}
      </button>
    </div>
  );
}
```


