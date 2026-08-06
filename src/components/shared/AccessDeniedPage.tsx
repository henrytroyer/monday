/**
 * AccessDeniedPage.tsx — Authenticated user lacks page permission.
 */

export default function AccessDeniedPage({
  title = 'Access denied',
}: {
  title?: string;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-xl font-semibold text-crm-heading">{title}</h2>
      <p className="mt-3 max-w-md text-sm text-crm-slate">
        Permission denied. Reach out to the developer.
      </p>
    </div>
  );
}
