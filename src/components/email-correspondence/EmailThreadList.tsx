/**
 * EmailThreadList — selectable list of email threads.
 */

import type { EmailThread } from '../../types/emailThread';
import { formatEmailListDate } from '../../utils/formatEmailThread';

interface EmailThreadListProps {
  threads: EmailThread[];
  selectedThreadId: string | null;
  onSelect: (threadId: string) => void;
}

export default function EmailThreadList({
  threads,
  selectedThreadId,
  onSelect,
}: EmailThreadListProps) {
  if (threads.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-crm-slate">
        No email threads match your filters.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-crm-taupe/20">
      {threads.map((thread) => {
        const selected = thread.id === selectedThreadId;
        return (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => onSelect(thread.id)}
              className={`flex w-full flex-col gap-1 px-3 py-3 text-left transition ${
                selected ? 'bg-crm-taupe-50' : 'hover:bg-crm-taupe-50/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold text-crm-heading">
                  {thread.subject}
                </p>
                <time
                  dateTime={thread.lastMessageAt}
                  className="shrink-0 text-xs text-crm-slate"
                >
                  {formatEmailListDate(thread.lastMessageAt)}
                </time>
              </div>
              <p className="truncate text-xs text-crm-slate">
                {thread.messageCount} message
                {thread.messageCount === 1 ? '' : 's'}
                {thread.applicationId
                  ? ` · App ${thread.applicationId}`
                  : ' · No application'}
                {thread.needsAssociationReview ? ' · Needs review' : ''}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
