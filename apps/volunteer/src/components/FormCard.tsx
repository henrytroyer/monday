import type { FormEvent, ReactNode } from 'react';

const CARD =
  'mx-auto w-full max-w-3xl rounded-2xl bg-white px-5 py-8 shadow-sm ring-1 ring-sand/70 sm:px-8';

export function FormCard({
  children,
  onSubmit,
  hidden = false,
}: {
  children: ReactNode;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  hidden?: boolean;
}) {
  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} aria-hidden={hidden} className={CARD}>
        {children}
      </form>
    );
  }
  return (
    <div aria-hidden={hidden || undefined} className={CARD}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={
        className ?? 'mx-auto mb-6 w-full max-w-3xl'
      }
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/70">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-navy">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-crm-slate">
          {description}
        </p>
      ) : null}
      {children}
    </header>
  );
}
