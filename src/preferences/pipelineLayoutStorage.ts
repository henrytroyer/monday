/**
 * pipelineLayoutStorage.ts — Persist list / card / gantt pipeline layout preference.
 */

export type PipelineLayout = 'list' | 'card' | 'gantt';

const STORAGE_KEY = 'crm-pipeline-layout-v1';

export function isPipelineLayout(value: unknown): value is PipelineLayout {
  return value === 'list' || value === 'card' || value === 'gantt';
}

export function readPipelineLayout(): PipelineLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isPipelineLayout(raw) ? raw : 'list';
  } catch {
    return 'list';
  }
}

export function writePipelineLayout(layout: PipelineLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // ignore quota / private mode
  }
}
