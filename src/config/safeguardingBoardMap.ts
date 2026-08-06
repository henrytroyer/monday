/**
 * monday.com Safeguarding Certificates board (child safeguarding certificate files).
 */

import { readViteEnv } from '../utils/readViteEnv';

/** monday.com Safeguarding Certificates board (child safeguarding certificate files). */
export const safeguardingBoardMap = {
  boardId: readViteEnv('VITE_SAFEGUARDING_BOARD_ID') || '6616292638',
  email: readViteEnv('VITE_SAFEGUARDING_COL_EMAIL') || 'Email',
  certificate:
    readViteEnv('VITE_SAFEGUARDING_COL_CERTIFICATE') ||
    'Upload Certificate Here',
  date: readViteEnv('VITE_SAFEGUARDING_COL_DATE') || 'Date',
} as const;

export function safeguardingBoardId(): string | null {
  const id = safeguardingBoardMap.boardId?.trim();
  return id || null;
}
