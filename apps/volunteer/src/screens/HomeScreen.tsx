import type { ReactNode } from 'react';
import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerApplicationUpdate,
} from '../contract/volunteerApi';
import { FieldCalendar } from '../components/FieldCalendar';
import { JourneyRoute } from '../components/JourneyRoute';
import {
  OnboardingReminder,
  OnboardingRoute,
  SubmittedThanks,
} from '../components/OnboardingRoute';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { ProgressBubble } from '../components/ProgressBubble';
import { WATER_COLORS } from '../lib/bubbleWater';
import { ServicePeriodInfo } from '../components/ServicePeriodInfo';
import { greetingBackdrop, journeyArrived, journeyDestination } from '../lib/journey';
import { stepFillPercent } from '../lib/formProgress';
import { nextVolunteerAction } from '../lib/nextAction';
import {
  applicationIsSubmitted,
  nextOnboardingStep,
  onboardingFillPercent,
  previewDepartureProgress,
  processCompletionPercent,
  processCompletionSegments,
  revealOnboarding,
  type ProcessRingSegment,
} from '../lib/onboarding';
import { FIELD_HOME_BACKDROP, type PortalDestination } from '../lib/nav';
import { showWelcomeHome } from '../lib/portalSession';
import { canOpenProcessStep } from '../process/previewAccess';

export function HomeScreen({
  me,
  notificationsOpen,
  onNotificationsOpenChange,
  onGoTo,
  onUpdateMe,
}: {
  me: VolunteerApplicationStatus;
  notificationsOpen: boolean;
  onNotificationsOpenChange: (open: boolean) => void;
  onGoTo: (destination: PortalDestination) => void;
  onUpdateMe: (next: VolunteerApplicationUpdate) => void;
}) {
  const progress = previewDepartureProgress(me);
  const submitted = applicationIsSubmitted(progress);
  const onField = Boolean(me.arrivedInEurope);
  const showOnboarding = submitted && Boolean(progress.onboardingRevealed) && !onField;
  const awaitingNextSteps = submitted && !showOnboarding;
  const onboardingNext = showOnboarding ? nextOnboardingStep(progress) : null;
  const onboardingFill = onboardingNext ? onboardingFillPercent(onboardingNext) : 0;
  const next = awaitingNextSteps || showOnboarding ? null : nextVolunteerAction(progress);
  const nextFill = next ? stepFillPercent(progress, next.id) : 0;
  const completion = processCompletionPercent(progress);
  const completionSegments = processCompletionSegments(progress);
  const firstName = me.firstName || me.name.trim().split(/\s+/)[0] || me.name;
  const arrived = journeyArrived(me);
  const destination = journeyDestination(me);
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
    if (awaitingNextSteps) {
      return <SubmittedThanks onReveal={() => onUpdateMe(revealOnboarding)} />;
    }
    if (showOnboarding) {
      return <OnboardingRoute me={progress} onUpdateMe={onUpdateMe} />;
    }
    return <JourneyRoute me={me} onSelectStep={openStep} />;
  }

  if (showWelcomeHome(me)) {
    return (
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
    );
  }

  return (
    <div className={`flex flex-col ${onField ? 'gap-8' : '-mb-8'}`}>
      <section
        className={`relative left-1/2 -mt-8 w-screen -translate-x-1/2 ${
          onField ? '' : 'h-[32rem] md:h-[28rem]'
        }`}
      >
        <img
          src={backdrop}
          alt=""
          className={
            onField
              ? 'block h-auto w-full'
              : 'absolute inset-0 h-full w-full object-cover object-center'
          }
        />
        {onField ? (
          <h1 className="absolute top-4 left-4 z-10 font-display text-3xl font-extrabold tracking-tight text-white! drop-shadow-[0_1px_2px_rgba(15,23,42,0.85)]">
            Hi {firstName}!
          </h1>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/45 via-navy/20 to-navy/35"
            aria-hidden
          />
        )}
        {onField ? (
          <div className="absolute inset-0 max-md:relative max-md:z-10">
            <div className="mx-auto h-full max-w-5xl px-5 py-8">
              <NotificationsPanel
                me={me}
                open={notificationsOpen}
                onOpenChange={onNotificationsOpenChange}
                className="mt-8 w-full md:absolute md:top-4 md:right-4 md:z-10 md:mt-0 md:w-full md:max-w-md"
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-10 grid grid-rows-[minmax(0,1fr)_auto]">
            <div className="flex min-h-0 flex-col gap-3 px-4 pt-4 md:flex-row md:items-start md:justify-between md:gap-4">
              <h1 className="w-max max-w-xs shrink-0 font-display text-3xl font-extrabold tracking-tight text-white! md:ml-[max(0.25rem,calc((100vw-64rem)/2))]">
                Hello, {firstName}
              </h1>
              <div className="min-h-0 w-full max-w-md flex-1 md:h-full md:flex-none">
                <NotificationsPanel
                  me={me}
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
                  {awaitingNextSteps ? (
                    <SubmittedCheck />
                  ) : onboardingNext ? (
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
                      {arrived
                        ? 'Your short-term application is complete.'
                        : 'Nothing for you to do right now on this application.'}
                    </p>
                  )}
                </FooterCell>
                <FooterCell divider={showServicePeriod}>
                  <div className="flex items-center justify-center gap-4">
                    <p className="text-center text-lg font-semibold leading-tight text-navy">
                      Process completion
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

      {progressBand()}
      {onField ? <FieldCalendar /> : null}
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

const WATER_STOP_AT = [0, 0.16, 0.48, 1] as const;
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

/** Same wash as a filled bubble: pale at the start of a slice, deep at its leading edge. */
function fadedRingPieces(segment: ProcessRingSegment) {
  const colors = WATER_COLORS[segment.tone];
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
      color: waterColor(colors, (cursor + span / 2) / segment.length),
    });
    cursor += span;
    index += 1;
  }
  return pieces;
}

function waterColor(
  colors: readonly [string, string, string, string],
  amount: number,
): string {
  const t = Math.min(1, Math.max(0, amount));
  for (let index = 1; index < WATER_STOP_AT.length; index += 1) {
    const stop = WATER_STOP_AT[index];
    if (t <= stop) {
      const previous = WATER_STOP_AT[index - 1];
      const span = stop - previous;
      const local = span === 0 ? 0 : (t - previous) / span;
      return mixHex(colors[index - 1], colors[index], local);
    }
  }
  return colors[colors.length - 1];
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
    color: waterColor(WATER_COLORS[last.tone], 1),
    cx: 18 + 15.5 * Math.cos(theta),
    cy: 18 + 15.5 * Math.sin(theta),
  };
}

function SubmittedCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-10 w-10 text-[#1f9d55]"
      fill="none"
      role="img"
      aria-label="Application submitted"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 12.6 9.2 17.3 19.5 6.8" />
    </svg>
  );
}
