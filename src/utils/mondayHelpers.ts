/**
 * Helper functions for working with monday.com data
 */

import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

/**
 * Initialize monday.com SDK with default settings
 */
export const initMondaySDK = () => {
  monday.setApiVersion('2023-10');
  return monday;
};

/**
 * Get current board ID from context
 */
export const getBoardIdFromContext = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    monday.listen('context', (res) => {
      const data = res.data as any;
      if (data?.boardId) {
        resolve(data.boardId.toString());
      } else if (data?.boardIds && Array.isArray(data.boardIds) && data.boardIds.length > 0) {
        resolve(data.boardIds[0].toString());
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Get current item ID from context
 */
export const getItemIdFromContext = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    monday.listen('context', (res) => {
      const data = res.data as any;
      if (data?.itemId) {
        resolve(data.itemId.toString());
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Get app settings
 */
export const getSettings = async (): Promise<Record<string, any>> => {
  try {
    const settings = await monday.get('settings');
    return settings || {};
  } catch (error) {
    console.error('Error getting settings:', error);
    return {};
  }
};

/**
 * Save app settings
 */
export const saveSettings = async (settings: Record<string, any>): Promise<void> => {
  try {
    await monday.set('settings', settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

/**
 * Show success notification
 */
export const showSuccess = (message: string): void => {
  monday.execute('notice', {
    message,
    type: 'success',
    timeout: 3000,
  });
};

/**
 * Show error notification
 */
export const showError = (message: string): void => {
  monday.execute('notice', {
    message,
    type: 'error',
    timeout: 5000,
  });
};

/**
 * Open item in monday.com
 */
export const openItem = (itemId: string, boardId: string): void => {
  monday.execute('openItemCard', {
    itemId,
    boardId,
  });
};

/**
 * Refresh board data
 */
export const refreshBoard = (): void => {
  monday.execute('refresh');
};

