/**
 * PermissionDeniedToast.tsx — Global “Permission denied…” popup.
 */

import { useEffect, useState } from 'react';

const EVENT = 'crm-permission-denied';

export function showPermissionDenied(
  message = 'Permission denied. Reach out to the developer.',
): void {
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { message } }),
  );
}

export default function PermissionDeniedToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onDenied(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message || 'Permission denied. Reach out to the developer.');
    }
    window.addEventListener(EVENT, onDenied);
    return () => window.removeEventListener(EVENT, onDenied);
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(null), 4200);
    return () => window.clearTimeout(id);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-[100] max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg"
    >
      {message}
    </div>
  );
}
