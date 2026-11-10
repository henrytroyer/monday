export const CONNECTOR = {
  blue: { from: '#2a6e9c', to: '#3482b0' },
  green: { from: '#1c8f4e', to: '#249d5c' },
  orange: { from: '#c15f30', to: '#ce6d3e' },
  muted: { from: '#cbbdad', to: '#d6cbb8' },
} as const;

export type StepConnectorTone = keyof typeof CONNECTOR;

/**
 * Color the line between two steps. Finished steps keep their color.
 * The line into the step being worked on, or the next one still empty, is colored too.
 */
export function progressConnectorTone<T extends { id: string; fill: number }>(
  steps: readonly T[],
  previous: T,
  step: T,
  colored: StepConnectorTone,
): StepConnectorTone {
  if (previous.fill > 0 && step.fill > 0) return colored;
  const active = steps.find((item) => item.fill < 100);
  if (active?.id === step.id && previous.fill > 0) return colored;
  return 'muted';
}
