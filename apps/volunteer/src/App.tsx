/**
 * App.tsx — Google sign-in, profile, find-or-create a contact, then the
 * volunteer portal once the contact is found or created. Until the Firebase
 * web config is set, the landing offers the mock email sign-in instead.
 */

import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import type {
  PreparationDocumentId,
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from './contract/volunteerApi';
import { submitVolunteerProfile } from './identity/identityClient.ts';
import type { IdentityResult } from './identity/identityClient.ts';
import {
  signOutVolunteer,
  watchVolunteerUser,
} from './identity/firebaseClient.ts';
import type { VolunteerProfile } from './identity/profile.ts';
import { PortalShell } from './components/PortalShell';
import { arriveInEurope } from './lib/finalChecklist';
import { arrivalWaitMs, fieldLandingAt } from './lib/fieldArrival';
import type { GeneralInfoSectionId, PortalDestination, PortalTab } from './lib/nav';
import {
  PREVIEW_HOME_STEPPER,
  homeIndexFor,
  previewHomeStatus,
  type PreviewHomeIndex,
} from './lib/previewHomeStepper';
import type { ChatGroupStage, StaffUploadStage } from './lib/preparationDocuments';
import {
  mockCreateAccount,
  mockSignIn,
  portalStatusForIdentity,
  showWelcomeHome,
  type MockPreviews,
} from './lib/portalSession';
import { GoogleSignInScreen } from './screens/GoogleSignInScreen.tsx';
import { SignInScreen } from './screens/SignInScreen';
import { CreateAccountScreen } from './screens/CreateAccountScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { IdentityResultScreen } from './screens/IdentityResultScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { HomeScreen } from './screens/HomeScreen';
import { canOpenProcessStep } from './process/previewAccess';
import { ProgressScreen } from './screens/ProgressScreen';
import { VolunteerInfoScreen } from './screens/VolunteerInfoScreen';
import { GeneralInfoScreen } from './screens/GeneralInfoScreen';
import { GuidelinesFaithScreen } from './screens/GuidelinesFaithScreen';
import { VisionValuesScreen } from './screens/VisionValuesScreen';
import { PreparationDocumentScreen } from './screens/PreparationDocumentScreen';
import { FlightItineraryScreen } from './screens/FlightItineraryScreen';
import { TeamTrainingScreen } from './screens/TeamTrainingScreen';

type PortalScreen = PortalTab | 'application' | 'document' | 'training';

type MockGuestView = 'landing' | 'sign_in' | 'create_account' | 'not_found';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IdentityResult | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [me, setMe] = useState<VolunteerApplicationStatus | null>(null);
  const meRef = useRef(me);
  meRef.current = me;
  const [tab, setTab] = useState<PortalScreen>('home');
  const [generalInfoSection, setGeneralInfoSection] = useState<GeneralInfoSectionId | null>(null);
  const [processFocus, setProcessFocus] = useState<ShortTermStepId | null>(null);
  const [documentFocus, setDocumentFocus] = useState<PreparationDocumentId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [guestView, setGuestView] = useState<MockGuestView>('landing');
  const [unknownEmail, setUnknownEmail] = useState('');
  const [mockPreviews, setMockPreviews] = useState<MockPreviews>({});
  const [notificationsOpen, setNotificationsOpen] = useState(true);
  const [previewHome, setPreviewHome] = useState<PreviewHomeIndex>(0);
  const [previewForEmail, setPreviewForEmail] = useState<string | null>(null);
  const [flightsUpload, setFlightsUpload] = useState<StaffUploadStage>('waiting');
  const [trainingUpload, setTrainingUpload] = useState<StaffUploadStage>('waiting');
  const [chatGroup, setChatGroup] = useState<ChatGroupStage>('waiting');
  if (PREVIEW_HOME_STEPPER) {
    if (!me && previewForEmail !== null) {
      setPreviewForEmail(null);
    } else if (me && me.email !== previewForEmail) {
      setPreviewForEmail(me.email);
      setPreviewHome(homeIndexFor(me));
    }
  }

  function resetPortal() {
    setMe(null);
    setTab('home');
    setGeneralInfoSection(null);
    setProcessFocus(null);
    setDocumentFocus(null);
    setToast(null);
    setGuestView('landing');
    setUnknownEmail('');
    setNotificationsOpen(true);
    setFlightsUpload('waiting');
    setTrainingUpload('waiting');
    setChatGroup('waiting');
  }

  function enterPortal(next: VolunteerApplicationStatus, message: string | null = null) {
    setMe(next);
    setTab('home');
    setGeneralInfoSection(null);
    setProcessFocus(null);
    setDocumentFocus(null);
    setToast(message);
    setNotificationsOpen(true);
  }

  function rememberPreview(next: VolunteerApplicationStatus) {
    const key = next.email.trim().toLowerCase();
    setMockPreviews((current) => ({ ...current, [key]: next }));
  }

  function handleMockSignIn(email: string) {
    const found = mockSignIn(email, mockPreviews);
    if (found) {
      enterPortal(found);
      return;
    }
    setUnknownEmail(email.trim());
    setGuestView('not_found');
  }

  function handleMockCreateAccount(input: { name: string; email: string }) {
    const { me: created, existed } = mockCreateAccount(input, mockPreviews);
    if (!existed) rememberPreview(created);
    enterPortal(
      created,
      existed ? 'An account with that email already exists. Signed you in.' : null,
    );
  }

  function handleUpdateMe(update: VolunteerApplicationUpdate) {
    const current = meRef.current;
    if (!current) return;
    const next = typeof update === 'function' ? update(current) : update;
    meRef.current = next;
    if (!user) rememberPreview(next);
    setMe(next);
    if (PREVIEW_HOME_STEPPER && next.applicationStarted && !current.applicationStarted) {
      setPreviewHome(homeIndexFor(next));
    }
  }

  const updateMeRef = useRef(handleUpdateMe);
  updateMeRef.current = handleUpdateMe;

  useEffect(() => {
    if (!me || me.arrivedInEurope) return;
    const landing = fieldLandingAt(me);
    if (!landing) return;

    let timer = 0;
    const arriveIfDue = () => {
      if (Date.now() < landing.getTime()) return;
      updateMeRef.current(arriveInEurope);
      if (PREVIEW_HOME_STEPPER) setPreviewHome(4);
    };
    const schedule = () => {
      const wait = arrivalWaitMs(landing);
      if (wait === 0) {
        arriveIfDue();
        return;
      }
      timer = window.setTimeout(() => {
        if (Date.now() >= landing.getTime()) arriveIfDue();
        else schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [me, me?.email, me?.name, me?.term, me?.arrivedInEurope]);

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
    if (portal) enterPortal(portal);
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
    if (destination.tab === 'application') {
      if (!me || !canOpenProcessStep(destination.step, me.steps)) return;
      setTab('application');
      setProcessFocus(destination.step);
      setDocumentFocus(null);
      setGeneralInfoSection(null);
      return;
    }
    if (destination.tab === 'document') {
      setTab('document');
      setDocumentFocus(destination.document);
      setProcessFocus(null);
      setGeneralInfoSection(null);
      return;
    }
    if (destination.tab === 'generalInfo') {
      setTab('generalInfo');
      setGeneralInfoSection(destination.section);
      setProcessFocus(null);
      setDocumentFocus(null);
      return;
    }
    setProcessFocus(null);
    setDocumentFocus(null);
    setGeneralInfoSection(null);
    setTab(destination.tab);
  }

  if (!authReady) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-5 text-sm text-crm-slate">
        Loading…
      </div>
    );
  }

  if (me) {
    return (
      <PortalShell
        tab={tab === 'application' || tab === 'document' || tab === 'training' ? 'home' : tab}
        generalInfoSection={generalInfoSection}
        onTabChange={(next) => handleGoTo({ tab: next })}
        onGeneralInfoSection={(section) => handleGoTo({ tab: 'generalInfo', section })}
        onSignOut={() => void handleSignOut()}
        portalName={
          tab === 'home' &&
          (PREVIEW_HOME_STEPPER ? previewHomeStatus(me, previewHome) : me).arrivedInEurope
            ? me.firstName?.trim() || me.name
            : null
        }
        toast={toast}
        footerTone={
          tab === 'home' && (PREVIEW_HOME_STEPPER ? previewHome === 0 : showWelcomeHome(me))
            ? 'white'
            : 'soft'
        }
      >
        {tab === 'home' ? (
          <HomeScreen
            me={me}
            previewHome={PREVIEW_HOME_STEPPER ? previewHome : null}
            onPreviewHomeChange={PREVIEW_HOME_STEPPER ? setPreviewHome : undefined}
            flightsUpload={flightsUpload}
            trainingUpload={trainingUpload}
            chatGroup={chatGroup}
            onFlightsUpload={setFlightsUpload}
            onTrainingUpload={setTrainingUpload}
            onChatGroup={setChatGroup}
            notificationsOpen={notificationsOpen}
            onNotificationsOpenChange={setNotificationsOpen}
            onGoTo={handleGoTo}
            onUpdateMe={handleUpdateMe}
          />
        ) : null}
        {tab === 'volunteer' ? (
          <VolunteerInfoScreen me={me} />
        ) : null}
        {tab === 'generalInfo' && generalInfoSection ? (
          <GeneralInfoScreen section={generalInfoSection} />
        ) : null}
        {tab === 'guidelinesFaith' ? <GuidelinesFaithScreen /> : null}
        {tab === 'visionValues' ? <VisionValuesScreen /> : null}
        {tab === 'training' ? (
          <TeamTrainingScreen
            uploaded={trainingUpload === 'uploaded'}
            onBack={() => handleGoTo({ tab: 'home' })}
          />
        ) : null}
        {tab === 'document' && documentFocus === 'flights' ? (
          <FlightItineraryScreen
            me={me}
            uploaded={flightsUpload === 'uploaded'}
            onBack={() => handleGoTo({ tab: 'home' })}
          />
        ) : null}
        {tab === 'document' && documentFocus && documentFocus !== 'flights' ? (
          <PreparationDocumentScreen
            key={documentFocus}
            me={me}
            documentId={documentFocus}
            onBack={() => handleGoTo({ tab: 'home' })}
            onUpdateMe={handleUpdateMe}
          />
        ) : null}
        {tab === 'application' && processFocus ? (
          <ProgressScreen
            key={processFocus}
            me={me}
            initialStepId={processFocus}
            onBack={() => handleGoTo({ tab: 'home' })}
            onGuidelinesFinished={() => {
              const current = meRef.current;
              if (PREVIEW_HOME_STEPPER && current) setPreviewHome(homeIndexFor(current));
              handleGoTo({ tab: 'home' });
            }}
            onUpdateMe={handleUpdateMe}
          />
        ) : null}
      </PortalShell>
    );
  }

  if (!user?.email) {
    if (guestView === 'sign_in') {
      return (
        <SignInScreen
          onSignIn={handleMockSignIn}
          onBack={() => setGuestView('landing')}
        />
      );
    }
    if (guestView === 'create_account') {
      return (
        <CreateAccountScreen
          initialEmail={unknownEmail}
          onCreate={handleMockCreateAccount}
          onBack={() => setGuestView(unknownEmail ? 'not_found' : 'landing')}
        />
      );
    }
    if (guestView === 'not_found') {
      return (
        <NotFoundScreen
          email={unknownEmail}
          onCreateAccount={() => setGuestView('create_account')}
          onBack={() => setGuestView('sign_in')}
        />
      );
    }
    return (
      <GoogleSignInScreen
        onMockSignIn={() => setGuestView('sign_in')}
        onMockCreateAccount={() => setGuestView('create_account')}
      />
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
