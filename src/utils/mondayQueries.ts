/**
 * Common monday.com GraphQL queries and mutations
 * Reusable query strings for common operations
 */

export const queries = {
  /**
   * Get basic board information
   */
  getBoard: `query ($boardId: [ID!]) {
    boards(ids: $boardId) {
      id
      name
      description
      state
      workspace {
        id
        name
      }
      groups {
        id
        title
      }
    }
  }`,

  /**
   * Get board with items
   */
  getBoardWithItems: `query ($boardId: [ID!]) {
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
          type
        }
        group {
          id
          title
        }
        created_at
        updated_at
      }
    }
  }`,

  /**
   * Get board columns
   */
  getBoardColumns: `query ($boardId: [ID!]) {
    boards(ids: $boardId) {
      id
      name
      columns {
        id
        title
        type
        settings_str
      }
    }
  }`,

  /**
   * Get item details
   */
  getItem: `query ($itemId: [ID!]) {
    items(ids: $itemId) {
      id
      name
      board {
        id
        name
      }
      column_values {
        id
        text
        value
        type
      }
      created_at
      updated_at
      creator {
        id
        name
        email
      }
    }
  }`,

  /**
   * Get user information
   */
  getMe: `query {
    me {
      id
      name
      email
      title
      photo_original
      location
      time_zone_identifier
    }
  }`,

  /**
   * Get workspace boards
   */
  getWorkspaceBoards: `query ($workspaceId: [ID!]) {
    workspaces(ids: $workspaceId) {
      id
      name
      kind
      boards {
        id
        name
        state
      }
    }
  }`,

  /**
   * Search items
   */
  searchItems: `query ($query: String!, $limit: Int) {
    items_by_column_values(board_ids: [], column_id: "", column_value: $query, limit: $limit) {
      id
      name
      board {
        id
        name
      }
    }
  }`,
};

export const mutations = {
  /**
   * Create a new item on a board
   */
  createItem: `mutation ($boardId: ID!, $itemName: String!, $groupId: String) {
    create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) {
      id
      name
    }
  }`,

  /**
   * Update item name
   */
  updateItemName: `mutation ($itemId: ID!, $itemName: String!) {
    change_item_name(item_id: $itemId, new_value: $itemName) {
      id
      name
    }
  }`,

  /**
   * Update column value
   */
  updateColumnValue: `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
    change_column_value(
      board_id: $boardId,
      item_id: $itemId,
      column_id: $columnId,
      value: $value
    ) {
      id
    }
  }`,

  /**
   * Create a board
   */
  createBoard: `mutation ($boardName: String!, $boardKind: BoardKind!, $workspaceId: ID) {
    create_board(board_name: $boardName, board_kind: $boardKind, workspace_id: $workspaceId) {
      id
      name
    }
  }`,

  /**
   * Add column to board
   */
  addColumn: `mutation ($boardId: ID!, $columnTitle: String!, $columnType: ColumnType!) {
    create_column(board_id: $boardId, title: $columnTitle, type: $columnType) {
      id
      title
      type
    }
  }`,

  /**
   * Create update (comment) on item
   */
  createUpdate: `mutation ($itemId: ID!, $body: String!) {
    create_update(item_id: $itemId, body: $body) {
      id
      body
      created_at
    }
  }`,

  /**
   * Archive item
   */
  archiveItem: `mutation ($itemId: ID!) {
    archive_item(item_id: $itemId) {
      id
      state
    }
  }`,

  /**
   * Delete item
   */
  deleteItem: `mutation ($itemId: ID!) {
    delete_item(item_id: $itemId) {
      id
    }
  }`,
};

/**
 * Helper function to format column value for update mutations
 */
export const formatColumnValue = (value: any, columnType: string): string => {
  switch (columnType) {
    case 'status':
      return JSON.stringify({ label: value });
    case 'date':
      return JSON.stringify({ date: value });
    case 'people':
      return JSON.stringify({ personsAndTeams: value.map((id: number) => ({ id, kind: 'person' })) });
    case 'checkbox':
      return JSON.stringify({ checked: value ? 'true' : 'false' });
    case 'numbers':
      return JSON.stringify({ number: value.toString() });
    case 'text':
    case 'long_text':
      return JSON.stringify({ text: value });
    default:
      return JSON.stringify({ text: value });
  }
};


