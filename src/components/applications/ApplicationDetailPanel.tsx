import { useState, type ReactNode } from 'react';
import { getTimelineLabel } from '../../data/timelines';
import { useApplicationDetail } from '../../hooks/useApplicationDetail';
import { openItem } from '../../utils/mondayHelpers';
import type { Volunteer } from '../../types/volunteer';
import {
  displayLocationPreference,
  hasDistinctAssignedLocation,
} from '../../utils/volunteerLocation';
import FormFieldsPanel, { findFormPdf } from './FormFieldsPanel';
import ItineraryBubbles from './ItineraryBubbles';
import OnboardingProgress from './OnboardingProgress';
import SendEmailModal from './SendEmailModal';
import TermNotesChat from './TermNotesChat';
import VolunteerContactCard from './VolunteerContactCard';

type DrillDownView = 'application' | 'pastor' | null;

interface ApplicationDetailPanelProps {
  volunteer: Volunteer;
  boardId: string | null;
  onBack: () => void;
}

export default function ApplicationDetailPanel({
  volunteer,
  boardId,
  onBack,
}: ApplicationDetailPanelProps) {
  const { detail, loading, error, refetch } = useApplicationDetail(volunteer);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [drillDown, setDrillDown] = useState<DrillDownView>(null);

  const timelineLabel = getTimelineLabel(volunteer.timelineId);
  const display = detail ?? null;

  const handleOpenInMonday = () => {
    if (!volunteer.id.startsWith('mock-') && boardId) {
      openItem(volunteer.id, boardId);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-300 bg-slate-200/60 p-2 shadow-sm">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to applications
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <p className="text-center text-slate-500">
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
              <VolunteerContactCard detail={display} />

              <Panel title="Quick Actions">
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              </Panel>

              {sendEmailOpen && display && (
                <SendEmailModal
                  detail={display}
                  onClose={() => setSendEmailOpen(false)}
                />
              )}

              <Panel title="Onboarding Progress">
                <OnboardingProgress
                  steps={display.onboardingSteps}
                  volunteerName={display.name}
                  itemId={display.id}
                  boardId={boardId}
                  onInvoiceLinked={() => refetch()}
                />
              </Panel>

              <Panel title="Placement Details">
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InfoCard
                    label="Location preference"
                    value={displayLocationPreference(display)}
                  />
                  {hasDistinctAssignedLocation(display) && (
                    <InfoCard label="Assigned location" value={display.location} />
                  )}
                  <InfoCard label="Signup timeline" value={timelineLabel} />
                  <InfoCard label="Coordinator" value={display.coordinator} />
                  <InfoCard label="Housing" value={display.housing} />
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-700">
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
              />

              <Panel title="Application Timeline">
                <div className="mt-4 space-y-3">
                  {display.activityTimeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No updates yet.</p>
                  ) : (
                    display.activityTimeline.map((event, index) => (
                      <TimelineEvent
                        key={`${event.date}-${index}`}
                        date={event.date}
                        text={event.text}
                      />
                    ))
                  )}
                </div>
              </Panel>
            </div>
          )}
        </div>

        {drillDown && display && (
          <FormFieldsPanel
            title={
              drillDown === 'application'
                ? `Full application — ${display.name}`
                : `Pastor reference — ${display.name}`
            }
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
            onClose={() => setDrillDown(null)}
          />
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
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
      className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:bg-slate-50"
    >
      <div className="font-semibold">{label}</div>
      <div className="mt-2 text-sm text-slate-500">Open and manage details</div>
    </button>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}

function TimelineEvent({ date, text }: { date: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">
        {date}
      </div>
      <div>{text}</div>
    </div>
  );
}
