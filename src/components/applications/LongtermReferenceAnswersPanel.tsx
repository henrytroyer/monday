import { useEffect } from 'react';
import type { ApplicationFormField } from '../../types/volunteer';
import OverlayBackButton from '../layout/OverlayBackButton';

interface LongtermReferenceAnswersPanelProps {
  title: string;
  backLabel: string;
  fields: ApplicationFormField[];
  onClose: () => void;
}

/** Full-page reference Q&A within the application detail panel. */
export default function LongtermReferenceAnswersPanel({
  title,
  backLabel,
  fields,
  onClose,
}: LongtermReferenceAnswersPanelProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-30 flex min-h-0 flex-col bg-crm-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lt-ref-answers-title"
    >
      <div className="shrink-0 border-b border-crm-taupe/20 bg-crm-taupe-50 px-6 py-4">
        <OverlayBackButton backLabel={backLabel} onBack={onClose} />
        <h2
          id="lt-ref-answers-title"
          className="mt-3 min-w-0 text-xl font-semibold text-crm-heading"
        >
          {title}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {fields.length === 0 ? (
          <p className="text-sm text-crm-slate">
            No reference answers on this item yet.
          </p>
        ) : (
          <dl className="mx-auto max-w-3xl space-y-5">
            {fields.map((field) => (
              <div
                key={field.id}
                className="rounded-xl border border-crm-taupe/20 bg-crm-taupe-50/50 px-4 py-3"
              >
                <dt className="text-sm font-medium text-crm-slate">
                  {field.question}
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-crm-text">
                  {field.answer}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
