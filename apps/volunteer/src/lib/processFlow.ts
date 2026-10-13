import type { VolunteerStep, VolunteerStepStatus } from '../contract/volunteerApi';

export type ProcessFlowTone = 'done' | 'current' | 'todo';

export function processFlowTone(
  step: Pick<VolunteerStep, 'id' | 'status'>,
  currentId?: VolunteerStep['id'] | null,
): ProcessFlowTone {
  if (step.status === 'complete') return 'done';
  if (step.id === currentId || isInProgressStatus(step.status)) return 'current';
  return 'todo';
}

function isInProgressStatus(status: VolunteerStepStatus): boolean {
  return status === 'waiting' || status === 'received';
}

export const PROCESS_FLOW_COLS = 3;

export type ProcessFlowConnector = 'right' | 'left' | 'down';

export function processFlowCell(
  index: number,
  cols = PROCESS_FLOW_COLS,
): { row: number; col: number } {
  const row = Math.floor(index / cols);
  const colInRow = index % cols;
  const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
  return { row, col };
}

export function processFlowConnector(
  index: number,
  total: number,
  cols = PROCESS_FLOW_COLS,
): ProcessFlowConnector | null {
  if (index >= total - 1) return null;
  const from = processFlowCell(index, cols);
  const to = processFlowCell(index + 1, cols);
  if (to.row !== from.row) return 'down';
  return to.col > from.col ? 'right' : 'left';
}
