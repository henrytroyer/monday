import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import type { IdentityResult } from '../identity/identityClient';
import { previewStatusForNewAccount } from '../mock/fixtures';
import { fetchMe } from '../mock/volunteerClient';

/**
 * Portal record for a signed-in volunteer once their contact is found or
 * created. Application data is still mock: known fixture emails get their
 * fixture, anyone else starts a fresh preview application.
 * Returns null while the contact still needs confirmation or a staff person.
 */
export function portalStatusForIdentity(
  result: IdentityResult,
): VolunteerApplicationStatus | null {
  if (result.status !== 'found' && result.status !== 'created') return null;
  const known = fetchMe(result.email);
  if (known.status === 'ok') return known.me;
  return previewStatusForNewAccount({ name: result.name, email: result.email });
}
