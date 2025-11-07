/**
 * TypeScript definitions for monday.com SDK
 * These types help with TypeScript integration
 */

export interface MondayContext {
  boardId?: number;
  boardIds?: number[];
  groupId?: string;
  itemId?: number;
  userId?: number;
  accountId?: number;
  subscription?: {
    entityId: number;
    entityType: string;
  };
  instanceId?: string;
  mode?: 'main' | 'timeframe';
  timezone?: string;
  locale?: string;
}

export interface MondaySettings {
  [key: string]: any;
}

export interface MondayResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface MondaySDK {
  listen: (event: string, callback: (res: MondayResponse) => void) => void;
  api: (query: string, options?: { variables?: Record<string, any> }) => Promise<MondayResponse>;
  get: (token: string) => Promise<any>;
  set: (token: string, value: any) => Promise<void>;
  execute: (action: string, options?: Record<string, any>) => Promise<any>;
  setApiVersion: (version: string) => void;
  oauth: {
    token: () => Promise<string>;
  };
}

declare module 'monday-sdk-js' {
  function mondaySdk(): MondaySDK;
  export default mondaySdk;
}


