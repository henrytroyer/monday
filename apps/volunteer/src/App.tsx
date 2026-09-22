/**
 * App.tsx — Volunteer landing: Google sign-in, profile, then find-or-create a contact.
 */

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { submitVolunteerProfile } from './identity/identityClient.ts';
import type { IdentityResult } from './identity/identityClient.ts';
import {
  signOutVolunteer,
  watchVolunteerUser,
} from './identity/firebaseClient.ts';
import type { VolunteerProfile } from './identity/profile.ts';
import { GoogleSignInScreen } from './screens/GoogleSignInScreen.tsx';
import { IdentityResultScreen } from './screens/IdentityResultScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityResult | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);

  useEffect(() => {
    return watchVolunteerUser((next) => {
      setUser(next);
      setAuthReady(true);
      if (!next) {
        setResult(null);
        setProfile(null);
        setError(null);
      }
    });
  }, []);

  async function handleSignOut() {
    setResult(null);
    setProfile(null);
    setError(null);
    await signOutVolunteer();
  }

  async function handleProfile(nextProfile: VolunteerProfile, confirmMatch = false) {
    if (!user) return;
    setProfile(nextProfile);
    setPending(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const next = await submitVolunteerProfile(token, nextProfile, { confirmMatch });
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'We could not save your contact. Try again.');
    } finally {
      setPending(false);
    }
  }

  function handleDecline() {
    setError(null);
    setResult((current) =>
      current
        ? {
            status: 'needs_staff',
            name: current.name,
            email: current.email,
            reason: 'phone_name_match',
          }
        : current,
    );
  }

  if (!authReady) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-5 text-sm text-crm-slate">
        Loading…
      </div>
    );
  }

  if (!user?.email) {
    return <GoogleSignInScreen />;
  }

  if (result) {
    return (
      <IdentityResultScreen
        result={result}
        pending={pending}
        error={error}
        onConfirm={() => {
          if (profile) void handleProfile(profile, true);
        }}
        onDecline={handleDecline}
        onSignOut={() => void handleSignOut()}
      />
    );
  }

  return (
    <ProfileScreen
      email={user.email}
      suggestedName={user.displayName?.trim() || ''}
      pending={pending}
      error={error}
      onSubmit={(profile) => void handleProfile(profile)}
      onSignOut={() => void handleSignOut()}
    />
  );
}
