import type { ReactNode } from 'react';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import { FieldPurpose } from '../components/FieldPurpose';
import { SubmissionThanksOverlay } from '../components/SubmissionThanksOverlay';
import { FieldScheduleBar } from '../components/FieldScheduleBar';
import { FieldServiceWays } from '../components/FieldServiceWays';
import { JourneyRoute } from '../components/JourneyRoute';
import { OnboardingReminder, OnboardingRoute } from '../components/OnboardingRoute';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { ProgressBubble } from '../components/ProgressBubble';
import { CONNECTOR } from '../lib/stepConnector';
import { ServicePeriodInfo } from '../components/ServicePeriodInfo';
import { ServicePeriodTimeline } from '../components/ServicePeriodTimeline';
import { greetingBackdrop, journeyArrived, journeyDestination } from '../lib/journey';
import { stepFillPercent } from '../lib/formProgress';
import { nextVolunteerAction } from '../lib/nextAction';
import {
  applicationIsSubmitted,
  nextOnboardingStep,
  onboardingFillPercent,
  processCompletionPercent,
  processCompletionSegments,
  type ProcessRingSegment,
} from '../lib/onboarding';
import { FIELD_HOME_BACKDROP, type PortalDestination } from '../lib/nav';
import {
  PREVIEW_DOCUMENT_STAGE_ARROWS,
  withChatGroupProgress,
  withStaffUploadProgress,
  type ChatGroupStage,
  type StaffUploadStage,
} from '../lib/preparationDocuments';
import {
  PREVIEW_HOME_COUNT,
  PREVIEW_HOME_LABELS,
  PREVIEW_THANKS_HOME,
  previewHomeStatus,
  type PreviewHomeIndex,
} from '../lib/previewHomeStepper';
import { saveVehicleReservation } from '../lib/fieldVehicleReservation';
import { servicePeriodFor } from '../lib/servicePeriod';
import { showWelcomeHome } from '../lib/portalSession';
import { canOpenProcessStep } from '../process/previewAccess';

export function HomeScreen({
  me,
  previewHome = null,
  onPreviewHomeChange,
  flightsUpload,
  trainingUpload,
  chatGroup,
  onFlightsUpload,
  onTrainingUpload,
  onChatGroup,
  notificationsOpen,
  onNotificationsOpenChange,
  onGoTo,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  previewHome?: PreviewHomeIndex | null;
  onPreviewHomeChange?: (index: PreviewHomeIndex) => void;
  flightsUpload: StaffUploadStage;
  trainingUpload: StaffUploadStage;
  chatGroup: ChatGroupStage;
  onFlightsUpload: (stage: StaffUploadStage) => void;
  onTrainingUpload: (stage: StaffUploadStage) => void;
  onChatGroup: (stage: ChatGroupStage) => void;
  notificationsOpen: boolean;
  onNotificationsOpenChange: (open: boolean) => void;
  onGoTo: (destination: PortalDestination) => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const displayed = previewHome == null ? me : previewHomeStatus(me, previewHome);
  const view = PREVIEW_DOCUMENT_STAGE_ARROWS
    ? withChatGroupProgress(
        withStaffUploadProgress(displayed, { flights: flightsUpload, training: trainingUpload }),
        chatGroup,
      )
    : displayed;
  const showThanks = previewHome === PREVIEW_THANKS_HOME;
  const submitted = applicationIsSubmitted(view) && previewHome !== 1 && !showThanks;
  const onField = Boolean(view.arrivedInEurope);
  const showOnboarding = submitted && !onField;
  const onboardingNext = showOnboarding ? nextOnboardingStep(view) : null;
  const onboardingFill = onboardingNext ? onboardingFillPercent(onboardingNext) : 0;
  const next = submitted ? null : nextVolunteerAction(view);
  const nextFill = next ? stepFillPercent(view, next.id) : 0;
  const completion = processCompletionPercent(view);
  const completionSegments = processCompletionSegments(view);
  const firstName = view.firstName || view.name.trim().split(/\s+/)[0] || view.name;
  const arrived = journeyArrived(view);
  const destination = journeyDestination(view);
  const backdrop = onField ? FIELD_HOME_BACKDROP : greetingBackdrop(destination.region);
  const showServicePeriod = !onField && destination.region !== 'germany';

  function openStep(id: ShortTermStepId) {
    if (!canOpenProcessStep(id, me.steps)) return;
    onGoTo({ tab: 'application', step: id });
  }

  function beginApplication() {
    onUpdateMe({ ...me, applicationStarted: true });
    openStep('application_received');
  }

  function progressBand() {
    if (onField) return null;
    if (showOnboarding) {
      return (
        <OnboardingRoute
          me={view}
          flightsUpload={flightsUpload}
          trainingUpload={trainingUpload}
          chatGroup={chatGroup}
          onFlightsUpload={onFlightsUpload}
          onTrainingUpload={onTrainingUpload}
          onChatGroup={onChatGroup}
          onUpdateMe={onUpdateMe}
          onOpenDocument={(id) => onGoTo({ tab: 'document', document: id })}
          onOpenTraining={() => onGoTo({ tab: 'training' })}
        />
      );
    }
    return <JourneyRoute me={view} onSelectStep={openStep} />;
  }

  const arrows =
    previewHome == null || !onPreviewHomeChange ? null : (
      <PreviewHomeArrows index={previewHome} onChange={onPreviewHomeChange} />
    );

  if (showThanks) {
    return (
      <>
        <SubmissionThanksOverlay hold />
        {arrows}
      </>
    );
  }

  if (showWelcomeHome(view)) {
    return (
      <>
      <div className="relative left-1/2 -my-8 flex min-h-[calc(100dvh-10.5rem)] w-screen -translate-x-1/2 flex-col items-center justify-center bg-gradient-to-b from-[#667b96] via-[#647fa8] to-[#224a6d] px-6 py-16 text-center">
        <h1 className="max-w-3xl text-balance font-display text-3xl font-medium leading-snug text-white! md:text-4xl">
          Hello {firstName}, welcome to the i58 volunteer portal
        </h1>
        <button
          type="button"
          onClick={beginApplication}
          className="mt-10 min-h-11 rounded-full bg-crm-terracotta px-7 text-sm font-semibold text-white shadow-sm hover:brightness-95"
        >
          Begin i58 Volunteer Application
        </button>
      </div>
      {arrows}
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col -mb-8">
      <section
        className={`relative left-1/2 -mt-8 w-screen -translate-x-1/2 ${
          onField ? '' : 'h-[32rem] md:h-[28rem]'
        }`}
      >
        {onField ? (
          <div className="relative">
            <img
              src={backdrop}
              alt=""
              width={2046}
              height={1358}
              className="block h-[28rem] w-full object-cover object-center md:h-[34rem]"
            />
            <div className="absolute inset-0 z-10 flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-6">
              <div className="min-w-0 max-w-xl shrink-0 md:flex-1">
                <FieldPurpose />
              </div>
              <div className="flex min-h-0 w-full flex-1 flex-col md:h-full md:w-[28rem] md:flex-none">
                <NotificationsPanel
                  me={view}
                  open={notificationsOpen}
                  onOpenChange={onNotificationsOpenChange}
                  className="max-h-full min-h-0 w-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        )}
        {onField ? null : (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/45 via-navy/20 to-navy/35"
            aria-hidden
          />
        )}
        {onField ? null : (
          <div className="absolute inset-0 z-10 grid grid-rows-[minmax(0,1fr)_auto]">
            <div className="flex min-h-0 flex-col gap-3 px-4 pt-4 md:flex-row md:items-start md:justify-between md:gap-4">
              <h1 className="w-max max-w-xs shrink-0 font-display text-3xl font-extrabold tracking-tight text-white! md:ml-[max(0.25rem,calc((100vw-64rem)/2))]">
                Hello, {firstName}
              </h1>
              <div className="min-h-0 w-full max-w-md flex-1 md:h-full md:flex-none">
                <NotificationsPanel
                  me={view}
                  open={notificationsOpen}
                  onOpenChange={onNotificationsOpenChange}
                  fillAvailable
                  className="w-full"
                />
              </div>
            </div>
            <div className="p-4">
              <div
                className={`grid rounded-2xl bg-white/95 text-center shadow-lg ring-1 ring-white/60 backdrop-blur ${
                  showServicePeriod ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                <FooterCell divider>
                  {onboardingNext ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex shrink-0 flex-col items-center">
                        <p className="text-center text-lg font-semibold leading-tight text-navy whitespace-nowrap">
                          {onboardingFill > 0 ? 'Continue this step:' : 'Next step:'}
                        </p>
                        <p className="mt-1 text-center text-sm font-semibold leading-tight text-navy">
                          {onboardingNext.title}
                        </p>
                      </div>
                      <OnboardingReminder step={onboardingNext} size="lg" showLabel={false} />
                    </div>
                  ) : next ? (
                    <div className="flex items-center justify-center gap-4">
                      <div className="flex shrink-0 flex-col items-center">
                        <p className="text-center text-lg font-semibold leading-tight text-navy whitespace-nowrap">
                          {nextFill > 0 ? 'Continue this step:' : 'Next step:'}
                        </p>
                        <p className="mt-1 text-center text-sm font-semibold leading-tight text-navy">
                          {next.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openStep(next.id)}
                        className="w-fit shrink-0"
                        aria-label={`${next.title}, ${
                          next.status === 'complete'
                            ? 'complete'
                            : nextFill > 0
                              ? 'in progress'
                              : 'not finished'
                        }`}
                      >
                        <ProgressBubble
                          id={next.id}
                          title={next.title}
                          fill={nextFill}
                          complete={next.status === 'complete'}
                          svgId={`${next.id}-next`}
                          size="lg"
                          showLabel={false}
                        />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-crm-slate">
                      {completion === 100
                        ? "We're excited to welcome you to Europe!"
                        : arrived
                          ? 'Your short-term application is complete.'
                          : 'Nothing for you to do right now on this application.'}
                    </p>
                  )}
                </FooterCell>
                <FooterCell divider={showServicePeriod}>
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-center text-lg font-semibold leading-tight text-navy">
                      Progress
                      <br />
                      until departure
                    </p>
                    <CompletionRing percent={completion} segments={completionSegments} />
                  </div>
                </FooterCell>
                {showServicePeriod ? (
                  <FooterCell>
                    <ServicePeriodInfo className="w-[82%] shadow-none ring-0" />
                  </FooterCell>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {onField ? (
        <>
          <section
            aria-label="Field schedules"
            className="relative left-1/2 w-screen -translate-x-1/2 border-b-2 border-white bg-[#667b96] px-4 py-4"
          >
            <FieldScheduleBar />
          </section>
          <section
            aria-label="Service"
            className="relative left-1/2 w-screen -translate-x-1/2 bg-white"
          >
            <div className="mx-auto w-full max-w-5xl px-5 py-5">
              <h2 className="font-display text-lg font-extrabold text-navy">Service</h2>
              <div className="mt-4">
                <ServicePeriodTimeline period={servicePeriodFor(view)} labelled={false} />
              </div>
            </div>
          </section>
          <FieldServiceWays
            volunteerId={me.email}
            volunteerName={me.name}
            reservations={me.vehicleReservations ?? []}
            onReserve={(reservation) =>
              onUpdateMe((current) => ({
                ...current,
                vehicleReservations: saveVehicleReservation(current.vehicleReservations, reservation),
              }))
            }
          />
        </>
      ) : null}

      {progressBand()}
    </div>
    {arrows}
    </>
  );
}

function PreviewHomeArrows({
  index,
  onChange,
}: {
  index: PreviewHomeIndex;
  onChange: (index: PreviewHomeIndex) => void;
}) {
  const label = PREVIEW_HOME_LABELS[index];

  function step(delta: -1 | 1) {
    const next = Math.min(PREVIEW_HOME_COUNT - 1, Math.max(0, index + delta));
    onChange(next as PreviewHomeIndex);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-white px-3 py-2 text-center shadow-lg ring-1 ring-navy/15">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous homepage"
          disabled={index === 0}
          onClick={() => step(-1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-lg text-white disabled:bg-crm-taupe disabled:text-navy/40"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-navy">
          Mock {index + 1}/{PREVIEW_HOME_COUNT} · {label}
        </p>
        <button
          type="button"
          aria-label="Next homepage"
          disabled={index === PREVIEW_HOME_COUNT - 1}
          onClick={() => step(1)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-lg text-white disabled:bg-crm-taupe disabled:text-navy/40"
        >
          →
        </button>
      </div>
      <p className="mt-1 text-xs font-semibold text-crm-terracotta">Remove before production</p>
    </div>
  );
}

function FooterCell({
  children,
  divider = false,
}: {
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5">
      {children}
      {divider ? (
        <span
          className="absolute top-1/2 right-0 h-8 w-0.5 -translate-y-1/2 bg-navy/60"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

const RING_SLICE = 1;

function CompletionRing({
  percent,
  segments,
}: {
  percent: number;
  segments: ProcessRingSegment[];
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const pieces = segments.flatMap(fadedRingPieces);
  const tip = ringTip(segments);
  return (
    <div className="relative h-18 w-18 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#d4c8b8" strokeWidth="3" />
        {pieces.map((piece) => (
          <circle
            key={piece.key}
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={piece.color}
            strokeWidth="3"
            strokeLinecap="butt"
            pathLength="100"
            strokeDasharray={`${piece.length} ${100 - piece.length}`}
            strokeDashoffset={-piece.start}
          />
        ))}
        {tip ? <circle cx={tip.cx} cy={tip.cy} r="1.5" fill={tip.color} /> : null}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-navy">
        {clamped}%
      </span>
    </div>
  );
}

/** A short shift, the same size as an arrow, from the start of a slice to its leading edge. */
function fadedRingPieces(segment: ProcessRingSegment) {
  const color = CONNECTOR[segment.tone];
  const pieces: { key: string; start: number; length: number; color: string }[] = [];
  let cursor = 0;
  let index = 0;
  while (cursor < segment.length - 0.001) {
    const span = Math.min(RING_SLICE, segment.length - cursor);
    const start = segment.start + Math.max(0, cursor - (index === 0 ? 0 : 0.35));
    const end = segment.start + cursor + span;
    pieces.push({
      key: `${segment.tone}-${segment.start}-${index}`,
      start,
      length: end - start,
      color: mixHex(color.from, color.to, (cursor + span / 2) / segment.length),
    });
    cursor += span;
    index += 1;
  }
  return pieces;
}

function mixHex(from: string, to: string, amount: number): string {
  const start = hexChannels(from);
  const end = hexChannels(to);
  const channels = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * amount),
  );
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function hexChannels(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Round cap on the leading end of the last colored slice, while the ring is open. */
function ringTip(
  segments: ProcessRingSegment[],
): { cx: number; cy: number; color: string } | null {
  const last = segments.reduce<ProcessRingSegment | null>((furthest, segment) => {
    if (!furthest || segment.start + segment.length > furthest.start + furthest.length) {
      return segment;
    }
    return furthest;
  }, null);
  if (!last) return null;
  const end = last.start + last.length;
  if (end >= 100) return null;
  const theta = (end / 100) * Math.PI * 2;
  return {
    color: CONNECTOR[last.tone].to,
    cx: 18 + 15.5 * Math.cos(theta),
    cy: 18 + 15.5 * Math.sin(theta),
  };
}
