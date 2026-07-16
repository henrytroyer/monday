/** monday.com Safeguarding Certificates board (child safeguarding certificate files). */
export const safeguardingBoardMap = {
  boardId:
    import.meta.env.VITE_SAFEGUARDING_BOARD_ID || '6616292638',
  email: import.meta.env.VITE_SAFEGUARDING_COL_EMAIL || 'Email',
  certificate:
    import.meta.env.VITE_SAFEGUARDING_COL_CERTIFICATE ||
    'Upload Certificate Here',
  date: import.meta.env.VITE_SAFEGUARDING_COL_DATE || 'Date',
} as const;

export function safeguardingBoardId(): string | null {
  const id = safeguardingBoardMap.boardId?.trim();
  return id || null;
}
