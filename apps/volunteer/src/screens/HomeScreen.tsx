import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { JourneyRoute } from '../components/JourneyRoute';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { StepCard } from '../components/StepCard';
import { greetingBackdrop, journeyArrived, journeyDestination } from '../lib/journey';
import { nextVolunteerAction } from '../lib/nextAction';
import { type PortalDestination } from '../lib/nav';

export function HomeScreen({
  me,
  onGoTo,
}: {
  me: VolunteerApplicationStatus;
  onGoTo: (destination: PortalDestination) => void;
}) {
  const next = nextVolunteerAction(me);
  const firstName = me.firstName || me.name.trim().split(/\s+/)[0] || me.name;
  const arrived = journeyArrived(me);
  const backdrop = greetingBackdrop(journeyDestination(me).region);

  return (
    <div className="-mb-8 flex flex-col">
      <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 max-md:min-h-[40rem]">
        <img
          src={backdrop}
          alt=""
          className="block h-full w-full object-cover object-center max-md:absolute max-md:inset-0 md:h-[28rem]"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/45 via-navy/20 to-navy/35"
          aria-hidden
        />
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-5xl flex-col gap-8 px-5 py-8 md:flex-row md:items-end md:justify-between md:py-10">
          <div className="flex w-full flex-col gap-8 md:w-[17rem] md:shrink-0 md:self-stretch md:justify-between">
            <header className="[text-shadow:0_1px_10px_rgba(15,30,55,0.55)]">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-white!">
                Hello, {firstName}
              </h1>
            </header>

            <div className="flex flex-col gap-3">
              {next || arrived ? (
                <p className="text-lg font-semibold text-white [text-shadow:0_1px_10px_rgba(15,30,55,0.55)]">
                  {next
                    ? 'The next step in your application:'
                    : 'Your short-term application is complete.'}
                </p>
              ) : null}
              {next ? (
                <button
                  type="button"
                  onClick={() => onGoTo({ tab: 'short-term', view: 'progress' })}
                  className="w-full text-left"
                >
                  <StepCard step={next} emphasized />
                </button>
              ) : (
                <p className="rounded-2xl bg-white p-5 text-sm text-crm-slate shadow-sm ring-1 ring-sand/70">
                  Nothing for you to do right now on this application.
                </p>
              )}
            </div>
          </div>

          <NotificationsPanel me={me} className="w-full md:max-w-md" />
          </div>
        </div>
      </section>

      <JourneyRoute
        me={me}
        onSelectStep={() => onGoTo({ tab: 'short-term', view: 'progress' })}
      />
    </div>
  );
}
