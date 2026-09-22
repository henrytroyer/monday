import type { FetchMeResult } from '../contract/volunteerApi';
import { JANE_MILLER, JANE_MILLER_EMAIL, NOT_FOUND } from './fixtures';

/**
 * Mock volunteer client. Reads local fixtures only — never calls Monday,
 * `mondayApiProxy`, or `fetch`.
 */
export function fetchMe(email: string): FetchMeResult {
  const normalized = email.trim().toLowerCase();
  if (normalized === JANE_MILLER_EMAIL) {
    return { status: 'ok', me: JANE_MILLER };
  }
  return NOT_FOUND;
}
