import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import { LONGTERM_REFERENCE_TYPE_LABELS } from '../../constants/longtermReferenceSlots';
import { buildLongtermReferenceSlots } from '../../data/mockLongtermReferences';
import { useApplicationDetail } from '../../hooks/useApplicationDetail';
import { openItem } from '../../utils/mondayHelpers';
import { savePipeline } from '../../services/onboardingPipelineStorage';
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
import {
  displayConfirmedTerm,
  displayPreferredDates,
  displayTermOfService,
  hasConfirmedTerm,
} from '../../utils/volunteerTerm';
import FormFieldsPanel, { findFormPdf } from './FormFieldsPanel';
import ItineraryBubbles from './ItineraryBubbles';
import LongtermReferencesPanel from './LongtermReferencesPanel';
import OnboardingProgress from './OnboardingProgress';
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
import { useTermNotes } from '../../hooks/useTermNotes';
import { useApplicationActivityTimeline } from '../../hooks/useApplicationActivityTimeline';

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
  const { detail, loading, error, refetch } = useApplicationDetail(volunteer);
  const referenceSlots = useMemo(
    () =>
      quickActionsBeforeFiles
        ? buildLongtermReferenceSlots(volunteer.id)
        : [],
    [quickActionsBeforeFiles, volunteer.id],
  );
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [referenceReminderSlot, setReferenceReminderSlot] = useState<
    number | null
  >(null);
  const [onboardingEmailOpen, setOnboardingEmailOpen] = useState(false);
  const [pipeline, setPipeline] = useState<OnboardingPipeline | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownView>(null);
  const [selectedReferenceSlot, setSelectedReferenceSlot] = useState<
    number | null
  >(null);

  const { requestClose: requestCloseDrillDown } = useNavLayer(
    drillDown !== null,
    () => setDrillDown(null),
    `form-${drillDown ?? 'none'}-${volunteer.id}`,
  );

  const { requestClose: requestCloseEmail } = useNavLayer(
    sendEmailOpen,
    () => {
      setSendEmailOpen(false);
      setReferenceReminderSlot(null);
      setOnboardingEmailOpen(false);
    },
    `send-email-${volunteer.id}`,
  );

  useEffect(() => {
    if (detail) {
      setPipeline(mergePipelineWithStorage(volunteer, detail));
    }
  }, [volunteer.id, volunteer.timelineId, detail]);

  const handlePipelineChange = (next: OnboardingPipeline) => {
    setPipeline(next);
    savePipeline(next);
  };

  const handleSendProgressEmail = (_stepId?: string) => {
    setOnboardingEmailOpen(true);
    setReferenceReminderSlot(null);
    setSendEmailOpen(true);
  };

  const onboardingMergeContext = useMemo(
    () => (pipeline ? buildOnboardingMergeContext(pipeline) : {}),
    [pipeline],
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
        selectedReferenceSlot === null
      ) {
        onBack();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, drillDown, sendEmailOpen, callOpen, selectedReferenceSlot]);

  const display = detail ?? null;
  const emailCorrespondenceRefetch = useRef<(() => void) | null>(null);
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
  const selectedReference = referenceSlots.find(
    (slot) => slot.slotIndex === selectedReferenceSlot,
  );

  const { requestClose: requestCloseReference } = useNavLayer(
    selectedReferenceSlot !== null,
    () => setSelectedReferenceSlot(null),
    `reference-${selectedReferenceSlot ?? 'none'}-${volunteer.id}`,
  );

  const handleOpenInMonday = () => {
    if (!volunteer.id.startsWith('mock-') && boardId) {
      openItem(volunteer.id, boardId);
    }
  };

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
        />
        <ActionButton
          label="Send email"
          onClick={() => setSendEmailOpen(true)}
        />
      </div>
    </div>
  );

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

        <ApplicationIdentityBar display={display} volunteer={volunteer} loading={loading} />

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-center text-crm-slate">
              Loading application details…
            </p>
          )}

          {error && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {error} — showing available fields only.
            </div>
          )}

          {display && !loading && (
            <div className="space-y-6">
              {display.couple ? (
                <CoupleApplicationCard
                  detail={display}
                  onEmailClick={() => setSendEmailOpen(true)}
                  onPhoneClick={() => setCallOpen(true)}
                  sharedContent={quickActions}
                  splitFilesRow={quickActionsBeforeFiles}
                  besideFiles={
                    quickActionsBeforeFiles ? (
                      <LongtermReferencesPanel
                        slots={referenceSlots}
                        onSelectReference={setSelectedReferenceSlot}
                        onSendReminder={(slotIndex) => {
                          setReferenceReminderSlot(slotIndex);
                          setSendEmailOpen(true);
                        }}
                      />
                    ) : undefined
                  }
                />
              ) : (
                <VolunteerContactCard
                  detail={display}
                  onEmailClick={() => setSendEmailOpen(true)}
                  onPhoneClick={() => setCallOpen(true)}
                  beforeFiles={quickActions}
                  splitFilesRow={quickActionsBeforeFiles}
                  besideFiles={
                    quickActionsBeforeFiles ? (
                      <LongtermReferencesPanel
                        slots={referenceSlots}
                        onSelectReference={setSelectedReferenceSlot}
                        onSendReminder={(slotIndex) => {
                          setReferenceReminderSlot(slotIndex);
                          setSendEmailOpen(true);
                        }}
                      />
                    ) : undefined
                  }
                />
              )}

              <Panel title="Onboarding Progress">
                {pipeline && (
                  <OnboardingProgress
                    pipeline={pipeline}
                    volunteer={volunteer}
                    volunteerName={display.name}
                    housing={display.housing}
                    itemId={display.id}
                    boardId={boardId}
                    onPipelineChange={handlePipelineChange}
                    onSendProgressEmail={handleSendProgressEmail}
                    invoiceReadOnly={!applicationsEditable}
                    onInvoiceLinked={() => refetch()}
                  />
                )}
              </Panel>

              <Panel title="Placement Details">
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCard
                    label="Location preference"
                    value={displayLocationPreferenceOnly(display)}
                  />
                  {hasConfirmedLocation(display) && (
                    <InfoCard
                      label="Confirmed location"
                      value={displayConfirmedLocation(display)}
                    />
                  )}
                  {hasConfirmedTerm(display) ? (
                    <InfoCard
                      label="Term of service"
                      value={`Confirmed: ${displayConfirmedTerm(display)}`}
                      valueClassName="text-green-800"
                    />
                  ) : (
                    <>
                      <InfoCard
                        label="Preferred dates"
                        value={displayPreferredDates(display)}
                      />
                      <InfoCard
                        label="Term of service"
                        value={displayTermOfService(display)}
                      />
                    </>
                  )}
                  <InfoCard label="Coordinator" value={display.coordinator} />
                  <InfoCard label="Housing" value={display.housing} />
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-crm-heading">
                    Itinerary
                  </h4>
                  <div className="mt-3">
                    <ItineraryBubbles itinerary={display.itinerary} />
                  </div>
                </div>
              </Panel>

              <TermNotesChat
                itemId={display.id}
                timelineId={display.timelineId}
                initialNotes={display.termNotes}
                termNotesState={termNotesState}
              />

              <TermEmailCorrespondence
                itemId={display.id}
                timelineId={display.timelineId}
                timelineLabel={displayTermOfService(display)}
                contactName={display.name}
                contactEmail={display.email}
                contactEmails={display.emails.map((e) => e.address)}
                onRefetchReady={(refetch) => {
                  emailCorrespondenceRefetch.current = refetch;
                }}
              />

              <ApplicationActivityTimeline
                events={activityTimeline.events}
                loading={activityTimeline.loading}
                error={activityTimeline.error}
              />
            </div>
          )}
        </div>

        {sendEmailOpen && display && (
          <SendEmailModal
            detail={display}
            onClose={requestCloseEmail}
            onAfterSend={() => {
              window.setTimeout(() => {
                emailCorrespondenceRefetch.current?.();
              }, 3000);
            }}
            initialTemplateId={
              referenceReminderSlot !== null
                ? 'reference-reminder'
                : onboardingEmailOpen
                  ? 'onboarding-progress-update'
                  : undefined
            }
            initialRecipientRole={
              referenceReminderSlot !== null ? 'volunteer' : undefined
            }
            extraMergeContext={
              referenceReminderSlot !== null
                ? {
                    referenceType:
                      referenceSlots[referenceReminderSlot]?.type ?? '',
                    referenceTypeLabel:
                      LONGTERM_REFERENCE_TYPE_LABELS[
                        referenceSlots[referenceReminderSlot]?.type ?? 'friend'
                      ],
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

        {selectedReference &&
          selectedReference.status === 'received' &&
          selectedReference.formFields &&
          display && (
            <FormFieldsPanel
              title={`${LONGTERM_REFERENCE_TYPE_LABELS[selectedReference.type]} reference — ${selectedReference.refereeName}`}
              backLabel={display.name}
              fields={selectedReference.formFields}
              emptyMessage="No reference fields on this item."
              onClose={requestCloseReference}
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <h3 className="text-lg font-semibold text-crm-heading">{title}</h3>
      {children}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
    >
      {label}
    </button>
  );
}

function InfoCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl bg-crm-surface p-4 ring-1 ring-crm-taupe/20">
      <div className="text-sm text-crm-slate">{label}</div>
      <div className={`mt-2 font-semibold ${valueClassName ?? ''}`}>{value}</div>
    </div>
  );
}
