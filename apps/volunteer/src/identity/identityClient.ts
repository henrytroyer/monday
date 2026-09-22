/**
 * identityClient.ts — Send the Firebase ID token and profile to the identity service.
 * The browser never talks to Monday.
 */

import type { VolunteerProfile } from './profile.ts';

export type IdentityStatus = 'found' | 'created' | 'needs_staff' | 'confirm_match';

export interface IdentityResult {
  status: IdentityStatus;
  name: string;
  email: string;
  reason?: 'duplicate_email' | 'phone_name_match';
  matchedName?: string;
  matchedEmail?: string;
}

export async function submitVolunteerProfile(
  idToken: string,
  profile: VolunteerProfile,
  options?: { confirmMatch?: boolean },
): Promise<IdentityResult> {
  const configured = import.meta.env.VITE_VOLUNTEER_IDENTITY_URL?.trim();
  const url = configured || '/api/volunteer-identity';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      profile,
      confirmMatch: options?.confirmMatch === true,
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | (IdentityResult & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(payload?.error || 'We could not save your contact. Try again.');
  }
  if (
    !payload ||
    (payload.status !== 'found' &&
      payload.status !== 'created' &&
      payload.status !== 'needs_staff' &&
      payload.status !== 'confirm_match')
  ) {
    throw new Error('The identity service returned an unexpected response.');
  }
  return {
    status: payload.status,
    name: payload.name,
    email: payload.email,
    reason: payload.reason,
    matchedName: payload.matchedName,
    matchedEmail: payload.matchedEmail,
  };
}
