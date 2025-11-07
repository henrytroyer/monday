/**
 * Examples Component
 * This file demonstrates various patterns and use cases for monday.com app development
 * Use these examples as starting points for your own features
 */

import { useState } from 'react';
import { useMondayContext } from '../hooks/useMondayContext';
import { useMondayApi } from '../hooks/useMondayApi';
import { queries, mutations, formatColumnValue } from '../utils/mondayQueries';
import { showSuccess, showError } from '../utils/mondayHelpers';

/**
 * Example 1: Creating an item from form data
 */
export const ExampleCreateItem = () => {
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
      itemName,
    });

    if (result) {
      showSuccess('Item created successfully!');
      setItemName('');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Create Item Example</h3>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Item name"
        style={{ padding: '8px', marginRight: '10px' }}
      />
      <button onClick={handleCreate} disabled={loading || !itemName}>
        {loading ? 'Creating...' : 'Create Item'}
      </button>
    </div>
  );
};

/**
 * Example 2: Fetching and displaying board items
 */
export const ExampleBoardItems = () => {
  const { context } = useMondayContext();
  const { data, loading, execute } = useMondayApi<{ boards: Array<{ items: Array<{ id: string; name: string }> }> }>();

  const loadItems = async () => {
    if (!context?.boardId) {
      showError('No board context available');
      return;
    }

    await execute(queries.getBoardWithItems, {
      boardId: [context.boardId.toString()],
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Board Items Example</h3>
      <button onClick={loadItems} disabled={loading}>
        {loading ? 'Loading...' : 'Load Items'}
      </button>
      {data?.boards[0]?.items && (
        <ul style={{ marginTop: '20px' }}>
          {data.boards[0].items.map((item) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * Example 3: Updating a column value
 */
export const ExampleUpdateColumn = () => {
  const { context } = useMondayContext();
  const { loading, execute } = useMondayApi();
  const [itemId, setItemId] = useState('');
  const [columnId, setColumnId] = useState('');
  const [columnValue, setColumnValue] = useState('');

  const handleUpdate = async () => {
    if (!context?.boardId || !itemId || !columnId) {
      showError('Missing required fields');
      return;
    }

    const formattedValue = formatColumnValue(columnValue, 'text');
    const result = await execute(mutations.updateColumnValue, {
      boardId: context.boardId.toString(),
      itemId,
      columnId,
      value: formattedValue,
    });

    if (result) {
      showSuccess('Column updated successfully!');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Update Column Example</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <input
          type="text"
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          placeholder="Item ID"
        />
        <input
          type="text"
          value={columnId}
          onChange={(e) => setColumnId(e.target.value)}
          placeholder="Column ID"
        />
        <input
          type="text"
          value={columnValue}
          onChange={(e) => setColumnValue(e.target.value)}
          placeholder="Value"
        />
        <button onClick={handleUpdate} disabled={loading}>
          {loading ? 'Updating...' : 'Update Column'}
        </button>
      </div>
    </div>
  );
};

/**
 * Example 4: Getting current user info
 */
export const ExampleUserInfo = () => {
  const { data, loading, execute } = useMondayApi<{ me: { id: string; name: string; email: string } }>();

  const loadUserInfo = () => {
    execute(queries.getMe);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>User Info Example</h3>
      <button onClick={loadUserInfo} disabled={loading}>
        {loading ? 'Loading...' : 'Load User Info'}
      </button>
      {data?.me && (
        <div style={{ marginTop: '20px' }}>
          <p><strong>Name:</strong> {data.me.name}</p>
          <p><strong>Email:</strong> {data.me.email}</p>
          <p><strong>ID:</strong> {data.me.id}</p>
        </div>
      )}
    </div>
  );
};

