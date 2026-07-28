/**
 * EmailMessageCard — sent/received message with expand/collapse.
 */

import type { EmailMessage } from '../../types/emailThread';
import EmailDirectionIndicator from '../contacts/EmailDirectionIndicator';
import EmailActivityTimeline from './EmailActivityTimeline';
import EmailTrackingSummary from './EmailTrackingSummary';

interface EmailMessageCardProps {
  message: EmailMessage;
  expanded: boolean;
  onToggle: () => void;
  applicationLabel?: string;
}

function formatExact(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function recipientsLine(
  label: string,
  recipients: Array<{ name: string; email: string }>,
): string | null {
  if (!recipients.length) return null;
  return `${label}: ${recipients.map((r) => `${r.name} <${r.email}>`).join(', ')}`;
}

export default function EmailMessageCard({
  message,
  expanded,
  onToggle,
  applicationLabel,
}: EmailMessageCardProps) {
  const isOutbound = message.direction === 'outbound';
  const alignClass = isOutbound ? 'ml-4 sm:ml-10' : 'mr-4 sm:mr-10';
  const bgClass = isOutbound
    ? 'bg-sky-50/80 ring-sky-100'
    : 'bg-crm-surface ring-crm-taupe/20';

  return (
    <article
      className={`rounded-2xl ring-1 ${bgClass} ${alignClass} px-4 py-3`}
    >
      <div className="flex items-start gap-3">
        <EmailDirectionIndicator direction={message.direction} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                isOutbound
                  ? 'bg-sky-100 text-sky-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {isOutbound ? 'Sent' : 'Received'}
            </span>
            <span className="text-xs text-crm-slate">
              {message.isAutomated ? 'Automated' : 'Manual'}
            </span>
            <time
              dateTime={message.sentAt}
              className="text-xs text-crm-slate"
              title={formatExact(message.sentAt)}
            >
              {formatExact(message.sentAt)}
            </time>
          </div>

          <p className="mt-1 text-sm font-semibold text-crm-heading">
            {message.senderName}{' '}
            <span className="font-normal text-crm-slate">
              &lt;{message.senderEmail}&gt;
            </span>
          </p>
          <p className="truncate text-sm font-medium text-crm-heading">
            {message.subject}
          </p>

          <button
            type="button"
            onClick={onToggle}
            className="mt-2 text-xs font-medium text-crm-indigo hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 border-t border-crm-taupe/15 pt-3 text-sm text-crm-slate">
              {recipientsLine('To', message.toRecipients) && (
                <p>{recipientsLine('To', message.toRecipients)}</p>
              )}
              {recipientsLine('Cc', message.ccRecipients) && (
                <p>{recipientsLine('Cc', message.ccRecipients)}</p>
              )}
              {recipientsLine('Bcc', message.bccRecipients) && (
                <p>{recipientsLine('Bcc', message.bccRecipients)}</p>
              )}
              {applicationLabel && (
                <p>
                  Application / term:{' '}
                  <span className="font-medium text-crm-heading">
                    {applicationLabel}
                  </span>
                </p>
              )}
              {message.sourceLabel && !applicationLabel && (
                <p>
                  Source:{' '}
                  <span className="font-medium text-crm-heading">
                    {message.sourceLabel}
                  </span>
                </p>
              )}

              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-crm-white/70 px-3 py-3 text-crm-heading">
                {message.htmlBody ? (
                  <div
                    className="prose prose-sm max-w-none"
                    // Sanitized upstream in SuperMail / timeline parsers where HTML is used
                    dangerouslySetInnerHTML={{ __html: message.htmlBody }}
                  />
                ) : (
                  message.textBody || '(empty body)'
                )}
              </div>

              {message.attachments.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {message.attachments.map((file) => (
                    <li key={file.id}>
                      {file.storageUrl ? (
                        <a
                          href={file.storageUrl}
                          className="text-crm-indigo hover:underline"
                          download={file.filename}
                        >
                          {file.filename}
                        </a>
                      ) : (
                        <span>{file.filename}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <EmailTrackingSummary message={message} />
              <EmailActivityTimeline message={message} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
