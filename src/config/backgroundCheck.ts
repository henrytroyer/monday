/** Preset coordinator password for background check preview (prototype v1). */
export const BACKGROUND_CHECK_PASSWORD = 'Background';

export function verifyBackgroundCheckPassword(input: string): boolean {
  return input.trim() === BACKGROUND_CHECK_PASSWORD;
}
