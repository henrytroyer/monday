/**
 * Dashboard Widget Component
 * This is a starter template for building dashboard widgets on monday.com
 * Dashboard widgets appear on monday.com dashboards and can display custom visualizations
 */

import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { MondayContext, MondayResponse } from '../../types/monday';

const monday = mondaySdk();

const DashboardWidget: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    monday.setApiVersion('2023-10');

    monday.listen('context', (res: MondayResponse<MondayContext>) => {
      // Example: Fetch board data when context is available
      if (res.data?.boardIds && res.data.boardIds.length > 0) {
        fetchBoardData(res.data.boardIds[0]);
      }
    });
  }, []);

  const fetchBoardData = async (boardId: number) => {
    const query = `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        id
        name
        items {
          id
          name
        }
      }
    }`;

    try {
      const response = await monday.api(query, {
        variables: { boardId: [boardId.toString()] }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching board data:', error);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard Widget</h2>
      <p>Build your custom dashboard visualization here.</p>
      {data && (
        <div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DashboardWidget;

