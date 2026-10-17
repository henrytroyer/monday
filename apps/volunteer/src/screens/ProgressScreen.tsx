import { useState } from 'react';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerFamilyStatus,
  VolunteerGeneralInformation,
  VolunteerGuidelines,
  VolunteerHistorySkillsLanguages,
  VolunteerOtherContacts,
  VolunteerPassportDetails,
  VolunteerProfilePhoto,
  VolunteerSpouseApplication,
  VolunteerTermOfService,
} from '../contract/volunteerApi';
import { BackButton } from '../components/BackButton';
import { LookingFor } from '../components/LookingFor';
import { ProcessFlow, ProcessStepControl } from '../components/ProcessFlow';
import { APPLICATION_PROCESS_HERO, APPLICATION_PROCESS_TITLE } from '../lib/nav';
import { nextVolunteerAction } from '../lib/nextAction';
import type { GettingStartedDraft } from '../process/gettingStarted';
import {
  canOpenProcessStep,
  previewViewForStep,
} from '../process/previewAccess';
import { InformationNeededScreen } from './InformationNeededScreen';
import { GettingStartedScreen } from './GettingStartedScreen';
import { GeneralInformationScreen } from './GeneralInformationScreen';
import { PassportDetailsScreen } from './PassportDetailsScreen';
import { ProfilePhotoScreen } from './ProfilePhotoScreen';
import { HistorySkillsLanguagesScreen } from './HistorySkillsLanguagesScreen';
import { FamilyStatusScreen } from './FamilyStatusScreen';
import { SpouseApplicationScreen } from './SpouseApplicationScreen';
import { TermOfServiceScreen } from './TermOfServiceScreen';
import { OtherContactsScreen } from './OtherContactsScreen';
import { GuidelinesScreen } from './GuidelinesScreen';

type ProcessView =
  | 'list'
  | 'advice'
  | 'getting-started'
  | 'general-information'
  | 'passport-details'
  | 'profile-photo'
  | 'history-skills-languages'
  | 'family-status'
  | 'spouse-application'
  | 'term-of-service'
  | 'other-contacts'
  | 'guidelines';

export function ProgressScreen({
  me,
  onBack,
  onUpdateMe,
  initialStepId = null,
}: {
  me: VolunteerApplicationStatus;
  onBack: () => void;
  onUpdateMe: (next: VolunteerApplicationStatus) => void;
  initialStepId?: ShortTermStepId | null;
}) {
  const [view, setView] = useState<ProcessView>(() => {
    if (!initialStepId) return 'list';
    return previewViewForStep(initialStepId) ?? 'list';
  });
  const [openedFromList, setOpenedFromList] = useState(Boolean(initialStepId));
  const next = nextVolunteerAction(me);

  function openFromList(nextView: ProcessView) {
    setOpenedFromList(true);
    setView(nextView);
  }

  function goTo(nextView: ProcessView) {
    setOpenedFromList(false);
    setView(nextView);
  }

  if (view === 'advice') {
    return (
      <InformationNeededScreen
        onBack={() => setView('list')}
        onContinue={() => setView('getting-started')}
      />
    );
  }

  if (view === 'getting-started') {
    return (
      <GettingStartedScreen
        me={me}
        onBack={() => setView('advice')}
        onNext={(draft) => {
          onUpdateMe(applyGettingStarted(me, draft));
          goTo('general-information');
        }}
      />
    );
  }

  if (view === 'general-information') {
    return (
      <GeneralInformationScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'getting-started')
        }
        onNext={(draft) => {
          onUpdateMe(applyGeneralInformation(me, draft));
          goTo('passport-details');
        }}
      />
    );
  }

  if (view === 'passport-details') {
    return (
      <PassportDetailsScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'general-information')
        }
        onNext={(draft) => {
          onUpdateMe(applyPassportDetails(me, draft));
          goTo('profile-photo');
        }}
      />
    );
  }

  if (view === 'profile-photo') {
    return (
      <ProfilePhotoScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'passport-details')
        }
        onNext={(draft) => {
          onUpdateMe(applyProfilePhoto(me, draft));
          goTo('history-skills-languages');
        }}
      />
    );
  }

  if (view === 'history-skills-languages') {
    return (
      <HistorySkillsLanguagesScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'profile-photo')
        }
        onNext={(draft) => {
          onUpdateMe(applyHistorySkillsLanguages(me, draft));
          goTo('family-status');
        }}
      />
    );
  }

  if (view === 'family-status') {
    return (
      <FamilyStatusScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'history-skills-languages')
        }
        onNext={(draft) => {
          onUpdateMe(applyFamilyStatus(me, draft));
          goTo('spouse-application');
        }}
      />
    );
  }

  if (view === 'spouse-application') {
    return (
      <SpouseApplicationScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'family-status')
        }
        onNext={(draft) => {
          onUpdateMe(applySpouseApplication(me, draft));
          goTo('term-of-service');
        }}
      />
    );
  }

  if (view === 'term-of-service') {
    return (
      <TermOfServiceScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'spouse-application')
        }
        onNext={(draft) => {
          onUpdateMe(applyTermOfService(me, draft));
          goTo('other-contacts');
        }}
      />
    );
  }

  if (view === 'other-contacts') {
    return (
      <OtherContactsScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'term-of-service')
        }
        onNext={(draft) => {
          onUpdateMe(applyOtherContacts(me, draft));
          goTo('guidelines');
        }}
      />
    );
  }

  if (view === 'guidelines') {
    return (
      <GuidelinesScreen
        me={me}
        onBack={() =>
          setView(openedFromList ? 'list' : 'other-contacts')
        }
        onSubmit={(draft) => {
          onUpdateMe(applyGuidelines(me, draft));
        }}
        onFinished={() => setView('list')}
      />
    );
  }

  const featured =
    me.steps.find((step) => step.id === 'application_received') ?? null;
  const gridSteps = featured
    ? me.steps.filter((step) => step.id !== featured.id)
    : me.steps;

  function openStep(id: ShortTermStepId) {
    const nextView = previewViewForStep(id);
    if (nextView && canOpenProcessStep(id)) openFromList(nextView);
  }

  return (
    <div>
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-[#d5dde3]">
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-[length:125%_auto] bg-[right_bottom] bg-no-repeat md:block"
          style={{ backgroundImage: `url(${APPLICATION_PROCESS_HERO})` }}
        />
        <img
          src={APPLICATION_PROCESS_HERO}
          alt=""
          className="pointer-events-none absolute right-0 bottom-0 w-[320%] max-w-none md:hidden"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-white from-0% via-white/90 via-[38%] to-transparent to-[72%]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent from-10% to-[#d5dde3]"
        />
        <div className="relative mx-auto flex min-h-[32rem] max-w-5xl items-end px-5 py-10 md:min-h-[28rem] md:items-center md:py-16">
          <div className="flex w-full max-w-sm flex-col gap-5">
            <div className="flex items-center gap-1">
              <BackButton onClick={onBack} className="mb-0" />
              <h1 className="font-display text-4xl font-bold tracking-tight text-navy md:text-5xl">
                {APPLICATION_PROCESS_TITLE}
              </h1>
            </div>
            {featured ? (
              <ProcessStepControl
                step={featured}
                number={1}
                emphasized
                onOpen={openStep}
              />
            ) : null}
          </div>
        </div>
      </section>
      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-[#d5dde3] py-10">
        <div className="relative mx-auto max-w-5xl px-5">
          <ProcessFlow
            steps={gridSteps}
            currentId={next?.id}
            startNumber={featured ? 2 : 1}
            onOpen={openStep}
          />
        </div>
      </section>
      <LookingFor />
    </div>
  );
}

function applyGettingStarted(
  me: VolunteerApplicationStatus,
  draft: GettingStartedDraft & { previousVolunteer: 'no' },
): VolunteerApplicationStatus {
  return {
    ...me,
    name: draft.fullName.trim(),
    firstName: draft.firstName.trim(),
    email: draft.email.trim().toLowerCase(),
    previousVolunteer: 'no',
    steps: me.steps.map((step) =>
      step.id === 'application_received'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyProfilePhoto(
  me: VolunteerApplicationStatus,
  draft: VolunteerProfilePhoto,
): VolunteerApplicationStatus {
  return {
    ...me,
    profilePhoto: draft,
    steps: me.steps.map((step) =>
      step.id === 'background_check'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyHistorySkillsLanguages(
  me: VolunteerApplicationStatus,
  draft: VolunteerHistorySkillsLanguages,
): VolunteerApplicationStatus {
  return {
    ...me,
    historySkillsLanguages: draft,
    steps: me.steps.map((step) =>
      step.id === 'child_safeguarding'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyFamilyStatus(
  me: VolunteerApplicationStatus,
  draft: VolunteerFamilyStatus,
): VolunteerApplicationStatus {
  return {
    ...me,
    familyStatus: draft,
    steps: me.steps.map((step) =>
      step.id === 'approved'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applySpouseApplication(
  me: VolunteerApplicationStatus,
  draft: VolunteerSpouseApplication,
): VolunteerApplicationStatus {
  return {
    ...me,
    spouseApplication: draft,
    steps: me.steps.map((step) =>
      step.id === 'flight_info'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyTermOfService(
  me: VolunteerApplicationStatus,
  draft: VolunteerTermOfService,
): VolunteerApplicationStatus {
  return {
    ...me,
    termOfService: draft,
    steps: me.steps.map((step) =>
      step.id === 'invoice'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyOtherContacts(
  me: VolunteerApplicationStatus,
  draft: VolunteerOtherContacts,
): VolunteerApplicationStatus {
  return {
    ...me,
    otherContacts: draft,
    steps: me.steps.map((step) =>
      step.id === 'sent_to_field'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyGuidelines(
  me: VolunteerApplicationStatus,
  draft: VolunteerGuidelines,
): VolunteerApplicationStatus {
  return {
    ...me,
    guidelines: draft,
    steps: me.steps.map((step) =>
      step.id === 'guidelines'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyPassportDetails(
  me: VolunteerApplicationStatus,
  draft: VolunteerPassportDetails,
): VolunteerApplicationStatus {
  return {
    ...me,
    passportDetails: draft,
    steps: me.steps.map((step) =>
      step.id === 'in_review'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

function applyGeneralInformation(
  me: VolunteerApplicationStatus,
  draft: VolunteerGeneralInformation,
): VolunteerApplicationStatus {
  return {
    ...me,
    generalInformation: draft,
    steps: me.steps.map((step) =>
      step.id === 'pastor_reference'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}
