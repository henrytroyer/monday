import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { slotLabelForIndex } from '../../constants/longtermReferenceSlots';
import { useApplicationDetail } from '../../hooks/useApplicationDetail';
import { useLongtermReferences } from '../../hooks/useLongtermReferences';
import { useShortTermOnboardingPipeline } from '../../hooks/useShortTermOnboardingPipeline';
import { useWorkFocus } from '../../hooks/useWorkFocus';
import { openItem } from '../../utils/mondayHelpers';
import { savePipeline } from '../../services/onboardingPipelineStorage';
import { syncOnboardingStepToMonday } from '../../services/crmApi';
import { useMockData } from '../../config/boards';
import type { OnboardingPipeline, Volunteer, VolunteerDetail } from '../../types/volunteer';
import {
  buildOnboardingMergeContext,
  mergePipelineWithStorage,
} from '../../utils/onboardingPipeline';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import { displayTermOfService } from '../../utils/volunteerTerm';
import CrmPageLoading from '../shared/CrmPageLoading';
import FormFieldsPanel, { findFormPdf } from './FormFieldsPanel';
import ApplicationInvoiceSection from './ApplicationInvoiceSection';
import LongtermReferenceAnswersPanel from './LongtermReferenceAnswersPanel';
import LongtermReferenceCommandCenter from './LongtermReferenceCommandCenter';
import OnboardingProgress from './OnboardingProgress';
import OnboardingProgressPanel from './OnboardingProgressPanel';
import SendEmailModal from './SendEmailModal';
import TermNotesChat from './TermNotesChat';
import TermEmailCorrespondence from './TermEmailCorrespondence';
import ApplicationActivityTimeline from './ApplicationActivityTimeline';
import VolunteerContactCard from './VolunteerContactCard';
import CoupleApplicationCard from './CoupleApplicationCard';
import VolunteerAvatar from './VolunteerAvatar';
import CoupleAvatarStack from './CoupleAvatarStack';
import VolunteerTermDisplay from './VolunteerTermDisplay';
import ContactCallModal from '../contacts/ContactCallModal';
import { useCurrentUser } from '../../context/useCurrentUser';
import SectionGate from '../shared/SectionGate';
import type { SectionId } from '../../preferences/workFocus';
import {
  applicationSectionOrder,
  orderSectionEntries,
} from '../../preferences/workFocus';
import { useTermNotes } from '../../hooks/useTermNotes';
import { useApplicationActivityTimeline } from '../../hooks/useApplicationActivityTimeline';
import { fetchPastorReferenceReceivedSnapshot } from '../../services/pastorReferenceBoard';

type DrillDownView = 'application' | 'pastor' | null;

interface ApplicationDetailPanelProps {
  volunteer: Volunteer;
  boardId: string | null;
  onBack: () => void;
  backLabel?: string;
  quickActionsBeforeFiles?: boolean;
  applicationsEditable?: boolean;
}

export default function ApplicationDetailPanel({
  volunteer,
  boardId,
  onBack,
  backLabel = '← Back to short-term applications',
  quickActionsBeforeFiles = false,
  applicationsEditable = false,
}: ApplicationDetailPanelProps) {
  const { displayName } = useCurrentUser();
  const { focus: workFocus } = useWorkFocus();
  const canViewAppFiles = true;
  const canSendEmail = true;
  const canViewInvoice = true;
  const { detail, loading, error, refetch } = useApplicationDetail(volunteer, {
    longterm: quickActionsBeforeFiles,
  });
  const longtermReferences = useLongtermReferences({
    applicationId: volunteer.id,
    applicationBoardId: quickActionsBeforeFiles ? boardId : null,
    enabled: quickActionsBeforeFiles,
  });
  const referenceSlots = longtermReferences.slots;
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [referenceRequestSlot, setReferenceRequestSlot] = useState<
    number | null
  >(null);
  const [referenceReminderSlot, setReferenceReminderSlot] = useState<
    number | null
  >(null);
  const [onboardingEmailOpen, setOnboardingEmailOpen] = useState(false);
  const [longtermPipeline, setLongtermPipeline] = useState<OnboardingPipeline | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownView>(null);
  const [answersSlotIndex, setAnswersSlotIndex] = useState<number | null>(null);

  const { requestClose: requestCloseDrillDown } = useNavLayer(
    drillDown !== null,
    () => setDrillDown(null),
    `form-${drillDown ?? 'none'}-${volunteer.id}`,
  );

  const { requestClose: requestCloseEmail } = useNavLayer(
    sendEmailOpen,
    () => {
      setSendEmailOpen(false);
      setReferenceRequestSlot(null);
      setReferenceReminderSlot(null);
      setOnboardingEmailOpen(false);
    },
    `send-email-${volunteer.id}`,
  );

  useEffect(() => {
    if (!detail || !quickActionsBeforeFiles) return;
    let cancelled = false;
    void import('../../services/portalOnboardingSync')
      .then(({ loadPipelineFromPortal }) =>
        loadPipelineFromPortal(volunteer.id),
      )
      .catch(() => null)
      .then(() => {
        if (cancelled) return;
        setLongtermPipeline(mergePipelineWithStorage(volunteer, detail, true));
      });
    return () => {
      cancelled = true;
    };
  }, [volunteer.id, volunteer.timelineId, detail, quickActionsBeforeFiles]);

  const shortTermOnboarding = useShortTermOnboardingPipeline({
    volunteer,
    detail: quickActionsBeforeFiles ? null : detail,
    actorName: displayName,
  });

  const pipeline = quickActionsBeforeFiles
    ? longtermPipeline
    : shortTermOnboarding.pipeline;

  const isMock = useMockData();

  const handlePipelineChange = (next: OnboardingPipeline) => {
    const previous = pipeline;
    if (quickActionsBeforeFiles) {
      setLongtermPipeline(next);
      savePipeline(next, {
        actorName: displayName,
        volunteerName: volunteer.name,
        longterm: true,
      });
    } else {
      shortTermOnboarding.handlePipelineChange(next);
    }

    // Mirror mapped step completions onto Monday columns (bidirectional SoT).
    if (
      !isMock &&
      applicationsEditable &&
      boardId &&
      previous
    ) {
      for (const step of next.steps) {
        const before = previous.steps.find((s) => s.stepId === step.stepId);
        const wasComplete = before?.status === 'complete';
        const isComplete = step.status === 'complete';
        if (wasComplete === isComplete) continue;
        void syncOnboardingStepToMonday(
          boardId,
          volunteer.id,
          step.stepId,
          isComplete,
        ).catch(() => {
          /* column may be missing on this board */
        });
      }
    }
  };

  const handleSendProgressEmail = (_stepId?: string) => {
    setOnboardingEmailOpen(true);
    setReferenceReminderSlot(null);
    setSendEmailOpen(true);
  };

  const onboardingMergeContext = useMemo(
    () =>
      pipeline
        ? buildOnboardingMergeContext(pipeline, quickActionsBeforeFiles)
        : {},
    [pipeline, quickActionsBeforeFiles],
  );

  const { requestClose: requestCloseCall } = useNavLayer(
    callOpen,
    () => setCallOpen(false),
    `call-${volunteer.id}`,
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !drillDown &&
        !sendEmailOpen &&
        !callOpen &&
        answersSlotIndex === null
      ) {
        onBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, drillDown, sendEmailOpen, callOpen, answersSlotIndex]);

  const display = detail ?? null;
  const [linkedPastorReferenceReceived, setLinkedPastorReferenceReceived] =
    useState(false);
  const emailCorrespondenceRefetch = useRef<(() => void) | null>(null);

  // Long-term Quick Action: watch Contacts → Pastor Reference connect column.
  useEffect(() => {
    if (!quickActionsBeforeFiles || !display) {
      setLinkedPastorReferenceReceived(false);
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const snapshot = await fetchPastorReferenceReceivedSnapshot(volunteer.id);
        if (!cancelled) {
          setLinkedPastorReferenceReceived(Boolean(snapshot?.received));
        }
      } catch {
        if (!cancelled) setLinkedPastorReferenceReceived(false);
      }
    };

    void refresh();
    if (isMock) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, 30_000);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [quickActionsBeforeFiles, display?.id, volunteer.id, isMock]);
  const termNotesState = useTermNotes({
    itemId: volunteer.id,
    timelineId: volunteer.timelineId,
    initialNotes: detail?.termNotes ?? [],
  });
  const activityTimeline = useApplicationActivityTimeline({
    itemId: volunteer.id,
    timelineId: volunteer.timelineId,
    timelineLabel: display ? displayTermOfService(display) : '',
    termNotes: termNotesState.notes,
    contactEmail: display?.email,
    contactEmails: display?.emails.map((entry) => entry.address),
    itemCreatedAt: display?.itemCreatedAt,
  });
  const { requestClose: requestCloseAnswers } = useNavLayer(
    answersSlotIndex !== null,
    () => setAnswersSlotIndex(null),
    `lt-ref-answers-${answersSlotIndex ?? 'none'}-${volunteer.id}`,
  );

  const requestReferenceSlot = referenceSlots.find(
    (slot) => slot.slotIndex === referenceRequestSlot,
  );
  const answersSlot = referenceSlots.find(
    (slot) => slot.slotIndex === answersSlotIndex,
  );

  const referenceFixedRecipient =
    requestReferenceSlot?.refereeEmail && display
      ? {
          role: 'reference' as const,
          label:
            requestReferenceSlot.refereeName ??
            (requestReferenceSlot.slotLabel ??
              slotLabelForIndex(requestReferenceSlot.slotIndex)),
          address: requestReferenceSlot.refereeEmail,
        }
      : undefined;

  const handleOpenInMonday = () => {
    if (!volunteer.id.startsWith('mock-') && boardId) {
      openItem(volunteer.id, boardId);
    }
  };

  // Green only when Contacts → Pastor Reference connect column links a filled form.
  const pastorReferenceReceived =
    shortTermOnboarding.pastorReferenceReceived || linkedPastorReferenceReceived;

  const quickActions = (
    <div className="rounded-xl border border-crm-taupe/20 bg-crm-white px-4 py-3">
      <h3 className="text-sm font-semibold text-crm-heading">Quick Actions</h3>
      <div className="mt-3 flex flex-wrap gap-2.5">
        <ActionButton
          label="Open in monday.com"
          onClick={handleOpenInMonday}
        />
        <ActionButton
          label="View Full Application"
          onClick={() => setDrillDown('application')}
        />
        <ActionButton
          label="View Pastor Reference"
          onClick={() => setDrillDown('pastor')}
          variant={pastorReferenceReceived ? 'success' : 'default'}
        />
        {canSendEmail && (
          <ActionButton
            label="Send email"
            onClick={() => setSendEmailOpen(true)}
          />
        )}
      </div>
    </div>
  );

  const referencesPanel =
    quickActionsBeforeFiles ? (
    <LongtermReferenceCommandCenter
      slots={referenceSlots}
      loading={longtermReferences.loading}
      onViewAnswers={setAnswersSlotIndex}
      onSendRequest={(slotIndex) => {
        setReferenceRequestSlot(slotIndex);
        setSendEmailOpen(true);
      }}
      onApprove={(slotIndex) =>
        void longtermReferences.setReviewStatus(slotIndex, 'approved')
      }
      onNeedsReview={(slotIndex) =>
        void longtermReferences.setReviewStatus(slotIndex, 'needs_review')
      }
      onUndoReview={(slotIndex) =>
        void longtermReferences.clearReviewStatus(slotIndex)
      }
    />
  ) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
        <div className="shrink-0 border-b border-crm-taupe/20 bg-crm-taupe-50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-crm-slate hover:text-crm-heading"
          >
            {backLabel}
          </button>
        </div>

        <SectionGate id="application.identity">
          <ApplicationIdentityBar display={display} volunteer={volunteer} loading={loading} />
        </SectionGate>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <CrmPageLoading
              label="i58 Volunteer portal · Application"
              className="min-h-[240px] py-8"
            />
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error} — showing available fields only.
            </div>
          )}

          {display && !loading && (
            <div className="space-y-6">
              {orderSectionEntries(
                workFocus,
                applicationSectionOrder(workFocus),
                {
                  'application.contact_card': (
                    <SectionGate id="application.contact_card">
                      {display.couple ? (
                        <CoupleApplicationCard
                          detail={display}
                          onEmailClick={
                            canSendEmail
                              ? () => setSendEmailOpen(true)
                              : undefined
                          }
                          onPhoneClick={() => setCallOpen(true)}
                          sharedContent={quickActions}
                          splitFilesRow={quickActionsBeforeFiles}
                          besideFiles={referencesPanel}
                          boardId={boardId}
                          canUploadFiles={
                            applicationsEditable && canViewAppFiles
                          }
                          onFilesUploaded={() => refetch()}
                          showFiles={canViewAppFiles}
                        />
                      ) : (
                        <VolunteerContactCard
                          detail={display}
                          onEmailClick={
                            canSendEmail
                              ? () => setSendEmailOpen(true)
                              : undefined
                          }
                          onPhoneClick={() => setCallOpen(true)}
                          beforeFiles={quickActions}
                          splitFilesRow={quickActionsBeforeFiles}
                          besideFiles={referencesPanel}
                          boardId={boardId}
                          canUploadFiles={
                            applicationsEditable && canViewAppFiles
                          }
                          onFilesUploaded={() => refetch()}
                          canEdit={applicationsEditable}
                          longterm={quickActionsBeforeFiles}
                          onContactSaved={() => refetch()}
                          showFiles={canViewAppFiles}
                        />
                      )}
                    </SectionGate>
                  ),
                  'application.invoice':
                    canViewInvoice && workFocus === 'finance' ? (
                      <SectionGate id="application.invoice">
                        <ApplicationInvoiceSection
                          volunteerName={display.name}
                          invoiceId={
                            pipeline?.steps.find((s) => s.stepId === 'invoice')
                              ?.quickbooksInvoiceId
                          }
                          mondayStatus={display.status}
                          readOnly={!applicationsEditable}
                          onInvoiceLinked={() => refetch()}
                        />
                      </SectionGate>
                    ) : undefined,
                  'application.onboarding': pipeline ? (
                    <SectionGate id="application.onboarding">
                      <OnboardingProgressPanel
                        pipeline={pipeline}
                        variant={
                          quickActionsBeforeFiles ? 'long-term' : 'short-term'
                        }
                      >
                        <OnboardingProgress
                          pipeline={pipeline}
                          volunteer={volunteer}
                          volunteerName={display.name}
                          housing={display.housing}
                          itemId={display.id}
                          boardId={boardId}
                          variant={
                            quickActionsBeforeFiles
                              ? 'long-term'
                              : 'short-term'
                          }
                          onPipelineChange={handlePipelineChange}
                          onSendProgressEmail={handleSendProgressEmail}
                          invoiceReadOnly={!applicationsEditable}
                          onInvoiceLinked={() => refetch()}
                          showInvoiceStep={
                            canViewInvoice && workFocus !== 'finance'
                          }
                        />
                      </OnboardingProgressPanel>
                    </SectionGate>
                  ) : undefined,
                  'application.term_notes': (
                    <SectionGate id="application.term_notes">
                      <TermNotesChat
                        itemId={display.id}
                        timelineId={display.timelineId}
                        initialNotes={display.termNotes}
                        termNotesState={termNotesState}
                      />
                    </SectionGate>
                  ),
                  'application.email': (
                    <SectionGate id="application.email">
                      <TermEmailCorrespondence
                        itemId={display.id}
                        timelineId={display.timelineId}
                        timelineLabel={displayTermOfService(display)}
                        contactName={display.name}
                        contactEmail={display.email}
                        contactEmails={display.emails.map((e) => e.address)}
                        onRefetchReady={(refetchFn) => {
                          emailCorrespondenceRefetch.current = refetchFn;
                        }}
                      />
                    </SectionGate>
                  ),
                  'application.activity': (
                    <SectionGate id="application.activity">
                      <ApplicationActivityTimeline
                        events={activityTimeline.events}
                        loading={activityTimeline.loading}
                        error={activityTimeline.error}
                      />
                    </SectionGate>
                  ),
                } satisfies Partial<Record<SectionId, ReactNode>>,
              ).map((node, index) => (
                <div key={`app-section-${index}`}>{node}</div>
              ))}
            </div>
          )}
        </div>

        {sendEmailOpen && display && canSendEmail && (
          <SendEmailModal
            detail={display}
            onClose={requestCloseEmail}
            onAfterSend={() => {
              window.setTimeout(() => {
                emailCorrespondenceRefetch.current?.();
              }, 3000);
            }}
            onAfterMailto={() => {
              if (referenceRequestSlot !== null) {
                void longtermReferences.markEmailSent(referenceRequestSlot);
              }
            }}
            initialTemplateId={
              referenceRequestSlot !== null
                ? 'longterm-reference-request'
                : referenceReminderSlot !== null
                  ? 'reference-reminder'
                  : onboardingEmailOpen
                    ? 'onboarding-progress-update'
                    : undefined
            }
            initialRecipientRole={
              referenceReminderSlot !== null ? 'volunteer' : undefined
            }
            fixedRecipient={referenceFixedRecipient}
            extraMergeContext={
              referenceRequestSlot !== null && requestReferenceSlot
                ? {
                    referenceType: requestReferenceSlot.type,
                    referenceTypeLabel:
                      requestReferenceSlot.slotLabel ??
                      slotLabelForIndex(requestReferenceSlot.slotIndex),
                    applicantName: display.name,
                    applicantFirstName: display.name.split(' ')[0] ?? display.name,
                    refereeName: requestReferenceSlot.refereeName ?? '',
                    refereeNameGreeting: requestReferenceSlot.refereeName
                      ? ` ${requestReferenceSlot.refereeName.split(' ')[0]}`
                      : '',
                  }
                : referenceReminderSlot !== null
                  ? {
                      referenceType:
                        referenceSlots[referenceReminderSlot]?.type ?? '',
                      referenceTypeLabel:
                        referenceSlots[referenceReminderSlot]?.slotLabel ??
                        slotLabelForIndex(referenceReminderSlot ?? 0),
                    }
                  : onboardingEmailOpen
                    ? onboardingMergeContext
                    : undefined
            }
          />
        )}

        {callOpen && display && display.phone !== '—' && (
          <ContactCallModal
            contactName={display.name}
            phone={display.phone}
            onClose={requestCloseCall}
          />
        )}

        {drillDown && display && (
          <FormFieldsPanel
            title={
              drillDown === 'application'
                ? `Full application — ${display.name}`
                : `Pastor reference — ${display.name}`
            }
            backLabel={display.name}
            fields={
              drillDown === 'application'
                ? display.applicationFormFields
                : display.pastorReferenceFormFields
            }
            emptyMessage={
              drillDown === 'application'
                ? 'No additional application fields on this item.'
                : 'No pastor reference fields on this item. Check column titles on the board or add titles to VITE_PASTOR_REFERENCE_COLUMNS.'
            }
            pdfFile={
              drillDown === 'application'
                ? findFormPdf(display.files, /application.*form/i)
                : findFormPdf(display.files, /pastor.*reference/i)
            }
            onClose={requestCloseDrillDown}
          />
        )}

        {answersSlot?.formFields && answersSlotIndex !== null && (
          <LongtermReferenceAnswersPanel
            title={`${answersSlot.slotLabel ?? slotLabelForIndex(answersSlot.slotIndex)} — ${answersSlot.refereeName ?? 'Referee'}`}
            backLabel="References"
            fields={answersSlot.formFields}
            onClose={requestCloseAnswers}
          />
        )}
      </div>
    </div>
  );
}

function ApplicationIdentityBar({
  display,
  volunteer,
  loading,
}: {
  display: VolunteerDetail | null;
  volunteer: Volunteer;
  loading: boolean;
}) {
  const name =
    display?.couple?.displayName ?? display?.name ?? volunteer.name;
  const status = display?.status ?? volunteer.status;
  const source = display ?? volunteer;

  return (
    <div className="z-20 shrink-0 border-b border-crm-taupe/20 bg-crm-surface px-6 py-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        {display?.couple ? (
          <CoupleAvatarStack
            primaryName={display.name}
            partnerName={display.couple.partner.name}
            primaryPhotoUrl={display.profilePhotoUrl}
            partnerPhotoUrl={display.couple.partner.profilePhotoUrl}
            size="sm"
          />
        ) : (
          <VolunteerAvatar
            name={name}
            profilePhotoUrl={display?.profilePhotoUrl ?? volunteer.profilePhotoUrl}
            size="sm"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-crm-heading">
            {loading && !display ? 'Loading…' : name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-crm-slate">
            {hasConfirmedLocation(source) ? (
              <span className="font-medium text-green-800">
                {displayConfirmedLocation(source)}
              </span>
            ) : (
              <span>{displayLocationPreferenceOnly(source)}</span>
            )}
            <span className="text-crm-taupe/40">·</span>
            <VolunteerTermDisplay
              volunteer={source}
              pipelineStage={volunteer.pipelineStage}
            />
          </div>
        </div>
        <span className="hidden shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 sm:inline">
          {status}
        </span>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  variant = 'default',
}: {
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'success';
}) {
  const className =
    variant === 'success'
      ? 'rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-200/70'
      : 'rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50';

  return (
    <button type="button" onClick={onClick} className={className}>
      {label}
    </button>
  );
}
