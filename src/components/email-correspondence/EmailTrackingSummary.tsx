/**
 * EmailTrackingSummary — outbound engagement display (UI-only statuses).
 */

import type { EmailMessage } from '../../types/emailThread';
import {
  emailTrackingStatusLabel,
  resolveEmailTrackingDisplayStatus,
} from '../../services/emailTrackingStatus';

interface EmailTrackingSummaryProps {
  message: EmailMessage;
}

export default function EmailTrackingSummary({
  message,
}: EmailTrackingSummaryProps) {
  if (message.direction !== 'outbound') return null;

  const status = resolveEmailTrackingDisplayStatus(message);
  const label = emailTrackingStatusLabel(status);

  return (
    <div className="mt-3 rounded-xl border border-crm-taupe/15 bg-crm-surface px-3 py-2 text-xs text-crm-slate">
      <p className="font-medium text-crm-heading">Engagement</p>
      <p className="mt-1">{label}</p>
      {message.trackingEnabled && status === 'opened' && (
        <ul className="mt-2 space-y-0.5">
          {message.firstOpenedAt && (
            <li>First opened: {new Date(message.firstOpenedAt).toLocaleString()}</li>
          )}
          {message.lastOpenedAt && (
            <li>Last opened: {new Date(message.lastOpenedAt).toLocaleString()}</li>
          )}
          <li>Opens: {message.openCount}</li>
          <li>Link clicks: {message.clickCount}</li>
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-snug text-crm-slate/80">
        Open tracking may be incomplete because of email privacy protections,
        image blocking, security scanners, and cached tracking pixels.
      </p>
    </div>
  );
}
