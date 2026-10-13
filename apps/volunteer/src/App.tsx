import { useState } from 'react';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
} from './contract/volunteerApi';
import { previewStatusForNewAccount } from './mock/fixtures';
import { PortalShell } from './components/PortalShell';
import { fetchMe } from './mock/volunteerClient';
import type { PortalDestination, PortalTab, ShortTermView } from './lib/nav';
import { LandingScreen } from './screens/LandingScreen';
import { SignInScreen } from './screens/SignInScreen';
import { CreateAccountScreen } from './screens/CreateAccountScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { DocumentsScreen } from './screens/DocumentsScreen';
import { LongTermScreen } from './screens/LongTermScreen';
import { VolunteerInfoScreen } from './screens/VolunteerInfoScreen';

type GuestView = 'landing' | 'sign_in' | 'create_account' | 'not_found';

export default function App() {
  const [previewByEmail, setPreviewByEmail] = useState<
    Record<string, VolunteerApplicationStatus>
  >({});
  const [me, setMe] = useState<VolunteerApplicationStatus | null>(null);
  const [guestView, setGuestView] = useState<GuestView>('landing');
  const [unknownEmail, setUnknownEmail] = useState('');
  const [tab, setTab] = useState<PortalTab>('home');
  const [shortTermView, setShortTermView] = useState<ShortTermView>('progress');
  const [processFocus, setProcessFocus] = useState<ShortTermStepId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function resolve(email: string): VolunteerApplicationStatus | null {
    const key = email.trim().toLowerCase();
    if (previewByEmail[key]) return previewByEmail[key]!;
    const result = fetchMe(email);
    return result.status === 'ok' ? result.me : null;
  }

  function enterSession(found: VolunteerApplicationStatus) {
    setMe(found);
    setTab('home');
    setShortTermView('progress');
    setProcessFocus(null);
    setGuestView('landing');
    setToast(null);
  }

  function handleSignIn(email: string) {
    const found = resolve(email);
    if (found) {
      enterSession(found);
      return;
    }
    setUnknownEmail(email.trim());
    setGuestView('not_found');
  }

  function handleCreateAccount(input: { name: string; email: string }) {
    const existing = resolve(input.email);
    if (existing) {
      enterSession(existing);
      setToast('An account with that email already exists. Signed you in.');
      return;
    }
    const created = previewStatusForNewAccount(input);
    const key = created.email.trim().toLowerCase();
    setPreviewByEmail((current) => ({ ...current, [key]: created }));
    enterSession(created);
  }

  function signOut() {
    setMe(null);
    setTab('home');
    setShortTermView('progress');
    setProcessFocus(null);
    setGuestView('landing');
    setToast(null);
    setUnknownEmail('');
  }

  function handleUpdateMe(next: VolunteerApplicationStatus) {
    const key = next.email.trim().toLowerCase();
    setPreviewByEmail((current) => ({ ...current, [key]: next }));
    setMe(next);
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

  function handleTabChange(next: PortalTab) {
    handleGoTo({ tab: next });
  }

  if (!me && guestView === 'landing') {
    return (
      <LandingScreen
        onSignIn={() => setGuestView('sign_in')}
        onCreateAccount={() => setGuestView('create_account')}
      />
    );
  }

  if (!me && guestView === 'sign_in') {
    return (
      <SignInScreen
        onSignIn={handleSignIn}
        onBack={() => setGuestView('landing')}
      />
    );
  }

  if (!me && guestView === 'create_account') {
    return (
      <CreateAccountScreen
        initialEmail={unknownEmail}
        onCreate={handleCreateAccount}
        onBack={() => setGuestView(unknownEmail ? 'not_found' : 'landing')}
      />
    );
  }

  if (!me && guestView === 'not_found') {
    return (
      <NotFoundScreen
        email={unknownEmail}
        onCreateAccount={() => setGuestView('create_account')}
        onBack={() => setGuestView('sign_in')}
      />
    );
  }

  if (!me) return null;

  return (
    <PortalShell
      tab={tab}
      onTabChange={handleTabChange}
      onSignOut={signOut}
      toast={toast}
    >
      {tab === 'home' ? (
        <HomeScreen me={me} onGoTo={handleGoTo} />
      ) : null}
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
          onUpdateMe={handleUpdateMe}
        />
      ) : null}
      {tab === 'short-term' && shortTermView === 'documents' ? (
        <DocumentsScreen me={me} onBack={() => setTab('home')} />
      ) : null}
    </PortalShell>
  );
}
