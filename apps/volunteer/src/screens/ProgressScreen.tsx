import { useState } from 'react';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
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
import type { GettingStartedDraft } from '../process/gettingStarted';
import { previewViewForStep } from '../process/previewAccess';
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
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
  initialStepId?: ShortTermStepId | null;
}) {
  const [view, setView] = useState<ProcessView>(() => {
    if (!initialStepId) return 'list';
    return previewViewForStep(initialStepId) ?? 'list';
  });
  const [openedFromList, setOpenedFromList] = useState(Boolean(initialStepId));

  function goTo(nextView: ProcessView) {
    setOpenedFromList(false);
    setView(nextView);
  }

  function returnHomeOr(previous: ProcessView) {
    if (openedFromList) onBack();
    else setView(previous);
  }

  if (view === 'advice') {
    return (
      <InformationNeededScreen
        onBack={onBack}
        onContinue={() => setView('getting-started')}
      />
    );
  }

  if (view === 'getting-started') {
    return (
      <GettingStartedScreen
        me={me}
        onBack={() => setView('advice')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, gettingStarted: draft }))
        }
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
        onBack={() => returnHomeOr('getting-started')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, generalInformation: draft }))
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
        onBack={() => returnHomeOr('general-information')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, passportDetails: draft }))
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
        onBack={() => returnHomeOr('passport-details')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, profilePhoto: draft }))
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
        onBack={() => returnHomeOr('profile-photo')}
        onSave={(draft) =>
          onUpdateMe((current) => ({
            ...current,
            historySkillsLanguages: draft,
          }))
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
        onBack={() => returnHomeOr('history-skills-languages')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, familyStatus: draft }))
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
        onBack={() => returnHomeOr('family-status')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, spouseApplication: draft }))
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
        onBack={() => returnHomeOr('spouse-application')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, termOfService: draft }))
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
        onBack={() => returnHomeOr('term-of-service')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, otherContacts: draft }))
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
        onBack={() => returnHomeOr('other-contacts')}
        onSave={(draft) =>
          onUpdateMe((current) => ({ ...current, guidelines: draft }))
        }
        onSubmit={(draft) => {
          onUpdateMe(applyGuidelines(me, draft));
        }}
        onFinished={onBack}
      />
    );
  }

  return null;
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
