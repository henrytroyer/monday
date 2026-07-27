import type { ReactNode } from 'react';

interface KeepAlivePageProps {
  active: boolean;
  mounted: boolean;
  children: ReactNode;
}

/**
 * Keeps page content mounted after first visit; toggles visibility instead of unmounting.
 */
export default function KeepAlivePage({
  active,
  mounted,
  children,
}: KeepAlivePageProps) {
  if (!mounted) return null;

  return (
    <div
      hidden={!active}
      aria-hidden={!active}
      // Prefer the `hidden` utility over the HTML attribute alone: with
      // Tailwind `important`, `flex!important` would otherwise override the
      // UA `[hidden] { display: none }` rule and stack every page.
      className={
        active
          ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
          : 'hidden'
      }
    >
      {children}
    </div>
  );
}
