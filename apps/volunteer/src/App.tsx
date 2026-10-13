/**
 * App.tsx — Google sign-in, profile, find-or-create a contact, then the
 * volunteer portal once the contact is found or created.
 */

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
} from './contract/volunteerApi';
import { submitVolunteerProfile } from './identity/identityClient.ts';
import type { IdentityResult } from './identity/identityClient.ts';
import {
  signOutVolunteer,
  watchVolunteerUser,
} from './identity/firebaseClient.ts';
import type { VolunteerProfile } from './identity/profile.ts';
import { PortalShell } from './components/PortalShell';
import type { PortalDestination, PortalTab, ShortTermView } from './lib/nav';
import { portalStatusForIdentity } from './lib/portalSession';
import { GoogleSignInScreen } from './screens/GoogleSignInScreen.tsx';
import { IdentityResultScreen } from './screens/IdentityResultScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { HomeScreen } from './screens/HomeScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { LongTermScreen } from './screens/LongTermScreen';
import { VolunteerInfoScreen } from './screens/VolunteerInfoScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityResult | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [me, setMe] = useState<VolunteerApplicationStatus | null>(null);
  const [tab, setTab] = useState<PortalTab>('home');
  const [shortTermView, setShortTermView] = useState<ShortTermView>('progress');
  const [processFocus, setProcessFocus] = useState<ShortTermStepId | null>(null);

  function resetPortal() {
    setMe(null);
    setTab('home');
    setShortTermView('progress');
    setProcessFocus(null);
  }

  useEffect(() => {
    return watchVolunteerUser((next) => {
      setUser(next);
      setAuthReady(true);
      if (!next) {
        setResult(null);
        setProfile(null);
        setError(null);
        resetPortal();
      }
    });
  }, []);

  async function handleSignOut() {
    setResult(null);
    setProfile(null);
    setError(null);
    resetPortal();
    await signOutVolunteer();
  }

  function applyResult(next: IdentityResult) {
    setResult(next);
    const portal = portalStatusForIdentity(next);
    if (portal) {
      setMe(portal);
      setTab('home');
      setShortTermView('progress');
      setProcessFocus(null);
    }
  }

  async function handleProfile(nextProfile: VolunteerProfile, confirmMatch = false) {
    if (!user) return;
    setProfile(nextProfile);
    setPending(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const next = await submitVolunteerProfile(token, nextProfile, { confirmMatch });
      applyResult(next);
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

  function handleGoTo(destination: PortalDestination) {
    setTab(destination.tab);
    if (destination.tab === 'short-term') {
      setShortTermView(destination.view ?? 'progress');
      if (!destination.view) {
        setProcessFocus(null);
      }
    }
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

  if (me) {
    return (
      <PortalShell
        tab={tab}
        onTabChange={(next) => handleGoTo({ tab: next })}
        onSignOut={() => void handleSignOut()}
        toast={null}
      >
        {tab === 'home' ? <HomeScreen me={me} onGoTo={handleGoTo} /> : null}
        {tab === 'volunteer' ? (
          <VolunteerInfoScreen me={me} onBack={() => setTab('home')} />
        ) : null}
        {tab === 'long-term' ? (
          <LongTermScreen me={me} onBack={() => setTab('home')} />
        ) : null}
        {tab === 'short-term' && shortTermView === 'progress' ? (
          <ProgressScreen
            key={processFocus ?? 'list'}
            me={me}
            initialStepId={processFocus}
            onBack={() => {
              setProcessFocus(null);
              setTab('home');
            }}
            onUpdateMe={setMe}
          />
        ) : null}
        {tab === 'short-term' && shortTermView === 'documents' ? (
          <DocumentsScreen me={me} onBack={() => setTab('home')} />
        ) : null}
      </PortalShell>
    );
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
