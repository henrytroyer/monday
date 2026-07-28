/**
 * EmailThreadHeader — subject, contact, message count, last message date.
 */

import type { EmailThread } from '../../types/emailThread';
import { formatEmailListDate } from '../../utils/formatEmailThread';

interface EmailThreadHeaderProps {
  thread: EmailThread;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
}

export default function EmailThreadHeader({
  thread,
  onExpandAll,
  onCollapseAll,
}: EmailThreadHeaderProps) {
  return (
    <div className="border-b border-crm-taupe/20 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-base font-semibold text-crm-heading">
            {thread.subject || '(no subject)'}
          </h4>
          <p className="mt-1 text-sm text-crm-slate">
            {thread.contactName ?? 'Contact'}
            {thread.contactEmail ? (
              <>
                {' '}
                ·{' '}
                <span className="font-medium text-crm-heading">
                  {thread.contactEmail}
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-crm-slate">
            {thread.messageCount} message{thread.messageCount === 1 ? '' : 's'}
            {' · '}
            Latest {formatEmailListDate(thread.lastMessageAt)}
          </p>
          {thread.needsAssociationReview && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              Application association needs review.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {onExpandAll && (
            <button
              type="button"
              onClick={onExpandAll}
              className="rounded-lg border border-crm-taupe/20 px-2.5 py-1 text-xs text-crm-slate hover:bg-crm-taupe-50"
            >
              Expand all
            </button>
          )}
          {onCollapseAll && (
            <button
              type="button"
              onClick={onCollapseAll}
              className="rounded-lg border border-crm-taupe/20 px-2.5 py-1 text-xs text-crm-slate hover:bg-crm-taupe-50"
            >
              Collapse all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
