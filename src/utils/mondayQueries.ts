/**
 * Common monday.com GraphQL queries and mutations
 * Reusable query strings for common operations
 */

/** File column fragment — FileValue.files is a union; asset fields need inline types. */
export const fileValueFieldsFragment = `
  ... on FileValue {
    files {
      ... on FileAssetValue {
        asset_id
        name
        is_image
      }
      ... on FileLinkValue {
        name
        url
      }
      ... on FileDocValue {
        url
      }
    }
  }`;

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
   * Get board items (paginated — monday API no longer supports boards.items)
   */
  getBoardItemsPage: `query ($boardId: [ID!], $limit: Int, $cursor: String) {
    boards(ids: $boardId) {
      id
      name
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            type
            column {
              title
            }
            ... on BoardRelationValue {
              linked_item_ids
            }
          }
          group {
            id
            title
          }
          created_at
          updated_at
        }
      }
    }
  }`,

  /**
   * Paginated board items with list-only columns (smaller payload for Contacts list)
   */
  getBoardItemsPageList: `query ($boardId: [ID!], $limit: Int, $cursor: String, $columnIds: [String!]) {
    boards(ids: $boardId) {
      id
      name
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          created_at
          column_values(ids: $columnIds) {
            id
            text
            value
            type
            column {
              title
            }
            ... on BoardRelationValue {
              linked_item_ids
            }
          }
        }
      }
    }
  }`,

  /**
   * Get board with items (legacy — prefer getBoardItemsPage + pagination)
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
          column {
            title
          }
          ... on BoardRelationValue {
            linked_item_ids
          }
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
   * Board pipeline: groups order + items with column values
   */
  getBoardPipeline: `query ($boardId: [ID!]) {
    boards(ids: $boardId) {
      id
      name
      groups {
        id
        title
      }
      items {
        id
        name
        group {
          id
          title
        }
        column_values {
          id
          text
          value
          type
          column {
            title
          }
          ... on BoardRelationValue {
            linked_item_ids
          }
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
        column {
          title
        }
        ... on BoardRelationValue {
          linked_item_ids
        }
        ${fileValueFieldsFragment}
      }
      created_at
      updated_at
      creator {
        id
        name
        email
      }
      updates(limit: 100) {
        id
        text_body
        created_at
        creator {
          name
        }
      }
    }
  }`,

  getItemsWithUpdates: `query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      name
      updates(limit: 100) {
        id
        text_body
        created_at
        creator {
          name
        }
      }
    }
  }`,

  /** Item updates with HTML body — used for SuperMail email logs. */
  getItemEmailUpdates: `query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      updates(limit: 100) {
        id
        body
        text_body
        created_at
        creator {
          name
          email
        }
      }
    }
  }`,

  getItemSummaries: `query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      name
    }
  }`,

  getDonationItemsByIds: `query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      name
      column_values {
        id
        text
        value
        type
        column {
          title
        }
      }
    }
  }`,

  getDonationItemsByEmail: `query ($boardId: [ID!], $rules: [ItemsQueryRule!]!, $limit: Int, $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: $limit, cursor: $cursor, query_params: { rules: $rules }) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            type
            column {
              title
            }
          }
        }
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
   * Emails & Activities timeline for an item (API 2025-01+)
   */
  getItemTimeline: `query ($itemId: ID!, $limit: Int, $cursor: String) {
    timeline(id: $itemId) {
      timeline_items_page(limit: $limit, cursor: $cursor) {
        cursor
        timeline_items {
          id
          title
          content
          created_at
          custom_activity_id
          user {
            id
            name
            email
          }
        }
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
   * Update item name (via the name column — change_item_name was removed from current API versions)
   */
  updateItemName: `mutation ($boardId: ID!, $itemId: ID!, $itemName: String!) {
    change_simple_column_value(
      board_id: $boardId,
      item_id: $itemId,
      column_id: "name",
      value: $itemName
    ) {
      id
      name
    }
  }`,

  /**
   * Update column value
   */
  updateColumnValue: `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!, $createLabelsIfMissing: Boolean) {
    change_column_value(
      board_id: $boardId,
      item_id: $itemId,
      column_id: $columnId,
      value: $value,
      create_labels_if_missing: $createLabelsIfMissing
    ) {
      id
    }
  }`,

  /**
   * Update column with a simple string value (text columns, item name, etc.)
   */
  updateSimpleColumnValue: `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!, $createLabelsIfMissing: Boolean) {
    change_simple_column_value(
      board_id: $boardId,
      item_id: $itemId,
      column_id: $columnId,
      value: $value,
      create_labels_if_missing: $createLabelsIfMissing
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
    case 'email':
      return JSON.stringify({ email: value, text: value });
    case 'phone':
      if (value && typeof value === 'object' && 'phone' in value) {
        return JSON.stringify(value);
      }
      return JSON.stringify({
        phone: String(value ?? ''),
        countryShortName: '',
      });
    case 'text':
    case 'long_text':
      return JSON.stringify({ text: value });
    default:
      return JSON.stringify({ text: value });
  }
};


