import type { ReactNode } from 'react';
import { FIELD_SERVICE_WAYS, type FieldServiceWayId } from '../lib/fieldService';

export function FieldServiceWays() {
  return (
    <section
      aria-label="Field tools"
      className="relative left-1/2 w-screen -translate-x-1/2 px-4 pt-2 pb-16"
    >
      <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
        {FIELD_SERVICE_WAYS.map((way) => (
          <li
            key={way.id}
            className="rounded-2xl bg-white px-5 py-5 shadow-[0_10px_28px_rgba(27,54,93,0.06)]"
          >
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crm-terracotta text-white">
                <ServiceWayIcon id={way.id} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold leading-tight text-navy">{way.title}</h2>
                {way.body ? (
                  <p className="mt-1.5 text-[0.95rem] leading-6 text-navy">{way.body}</p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ServiceWayIcon({ id }: { id: FieldServiceWayId }) {
  if (id === 'vehicle') return <VehicleIcon />;
  if (id === 'photos') return <CameraIcon />;
  return <FeedbackIcon />;
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      {children}
    </svg>
  );
}

function VehicleIcon() {
  return (
    <IconFrame>
      <path
        fill="currentColor"
        d="M7.2 21.2a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zm13.6 0a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6zM6.2 17.4h1.2a3.5 3.5 0 0 1 6.8 0h3.6a3.5 3.5 0 0 1 6.8 0H26v-2.2l-2.4-6.2A2.2 2.2 0 0 0 21.6 7.4h-9.2a2.2 2.2 0 0 0-2 1.4L8 15.2H6.2c-.9 0-1.6.7-1.6 1.6v.6h1.6z"
      />
    </IconFrame>
  );
}

function CameraIcon() {
  return (
    <IconFrame>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M11.2 6.2 12.6 8.4H23a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10.4a2 2 0 0 1 2-2h2.4l1.8-2.2h0zm3.8 13.6a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zm0-1.8a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2z"
      />
    </IconFrame>
  );
}

function FeedbackIcon() {
  return (
    <IconFrame>
      <path
        fill="currentColor"
        d="M6.2 6.4h17.6A2.2 2.2 0 0 1 26 8.6v9.6a2.2 2.2 0 0 1-2.2 2.2h-8.2l-4.6 3.4c-.6.4-1.4 0-1.4-.7v-2.7H6.2A2.2 2.2 0 0 1 4 18.2V8.6a2.2 2.2 0 0 1 2.2-2.2z"
      />
    </IconFrame>
  );
}
