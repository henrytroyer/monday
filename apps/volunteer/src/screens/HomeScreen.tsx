import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { JourneyRoute } from '../components/JourneyRoute';
import { StepCard } from '../components/StepCard';
import { journeyArrived } from '../lib/journey';
import { nextVolunteerAction } from '../lib/nextAction';
import type { PortalDestination } from '../lib/nav';

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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-navy/70">
          Welcome back
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-tight text-navy">
          Hello, {firstName}
        </h1>
        <p className="mt-2 text-sm text-crm-slate">
          {arrived
            ? 'Your short-term application is complete.'
            : 'Here is the next step on your way to the field.'}
        </p>
      </header>

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

      <JourneyRoute
        me={me}
        onSelectStep={() => onGoTo({ tab: 'short-term', view: 'progress' })}
      />
    </div>
  );
}
