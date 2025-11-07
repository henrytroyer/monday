/**
 * Board Viewer Component
 * Example component demonstrating how to fetch and display board data
 * using the custom hooks and utility functions
 */

import { useEffect } from 'react';
import { useMondayContext } from '../hooks/useMondayContext';
import { useMondayApi } from '../hooks/useMondayApi';
import { queries } from '../utils/mondayQueries';
import { showError } from '../utils/mondayHelpers';

interface Board {
  id: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    column_values: Array<{
      id: string;
      text: string;
      type: string;
    }>;
  }>;
}

const BoardViewer: React.FC = () => {
  const { context, isLoading: contextLoading, error: contextError } = useMondayContext();
  const { data, loading, error, execute } = useMondayApi<{ boards: Board[] }>();

  useEffect(() => {
    if (context?.boardIds && context.boardIds.length > 0 && !loading && !data) {
      const boardId = context.boardIds[0].toString();
      execute(queries.getBoardWithItems, { boardId: [boardId] });
    }
  }, [context, loading, data, execute]);

  useEffect(() => {
    if (error) {
      showError(`Error loading board: ${error}`);
    }
  }, [error]);

  if (contextLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading board context...</p>
      </div>
    );
  }

  if (contextError) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <p>Error: {contextError}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading board data...</p>
      </div>
    );
  }

  if (!data?.boards || data.boards.length === 0) {
    return (
      <div style={{ padding: '20px' }}>
        <p>No board data available. Make sure you're viewing this from a board context.</p>
      </div>
    );
  }

  const board = data.boards[0];

  return (
    <div style={{ padding: '20px' }}>
      <h2>{board.name}</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Board ID: {board.id} | Items: {board.items.length}
      </p>

      {board.items.length === 0 ? (
        <p>No items in this board.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {board.items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fff',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{item.name}</h3>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {item.column_values.slice(0, 3).map((col) => (
                  <div key={col.id} style={{ marginBottom: '5px' }}>
                    <strong>{col.type}:</strong> {col.text || 'N/A'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BoardViewer;


