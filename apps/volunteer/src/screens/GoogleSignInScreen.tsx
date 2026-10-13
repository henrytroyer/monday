/**
 * GoogleSignInScreen.tsx — Landing sign-in. Offers the mock email sign-in
 * until the Firebase web config is set.
 */

import { useState } from 'react';
import { readFirebaseWebConfig, signInWithGoogle } from '../identity/firebaseClient.ts';
import { LandingScreen } from './LandingScreen';

export function GoogleSignInScreen({
  onMockSignIn,
  onMockCreateAccount,
}: {
  onMockSignIn: () => void;
  onMockCreateAccount: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const configured = readFirebaseWebConfig() != null;

  async function handleSignIn() {
    setPending(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
      setPending(false);
    }
  }

  return (
    <LandingScreen
      onContinueWithGoogle={() => void handleSignIn()}
      onMockSignIn={onMockSignIn}
      onMockCreateAccount={onMockCreateAccount}
      pending={pending}
      error={error}
      configured={configured}
    />
  );
}
