import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import type { IdentityResult } from '../identity/identityClient';
import { previewStatusForNewAccount } from '../mock/fixtures';
import { fetchMe } from '../mock/volunteerClient';

export type MockPreviews = Record<string, VolunteerApplicationStatus>;

function previewKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Mock sign-in used until Google sign-in is configured. Null when unknown. */
export function mockSignIn(
  email: string,
  previews: MockPreviews,
): VolunteerApplicationStatus | null {
  const preview = previews[previewKey(email)];
  if (preview) return preview;
  const known = fetchMe(email);
  return known.status === 'ok' ? known.me : null;
}

/** Mock create account. Signs in instead when the email already exists. */
export function mockCreateAccount(
  input: { name: string; email: string },
  previews: MockPreviews,
): { me: VolunteerApplicationStatus; existed: boolean } {
  const existing = mockSignIn(input.email, previews);
  if (existing) return { me: existing, existed: true };
  return { me: previewStatusForNewAccount(input), existed: false };
}

/**
 * Portal record for a Google-signed-in volunteer once their contact is found or
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
