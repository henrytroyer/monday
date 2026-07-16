import type { ApplicationFormField } from '../../types/volunteer';
import { formatDisplayDate } from '../../utils/formatDateOfBirth';
import { formatEndOfServiceReviewLabel } from '../../utils/formatTermDateRange';

interface EndOfServiceReviewSectionProps {
  completedAt?: string;
  fields?: ApplicationFormField[];
  onViewAll?: () => void;
  compact?: boolean;
}

const PREVIEW_FIELD_COUNT = 4;

export default function EndOfServiceReviewSection({
  completedAt,
  fields = [],
  onViewAll,
  compact = false,
}: EndOfServiceReviewSectionProps) {
  const hasReview = Boolean(completedAt?.trim() || fields.length > 0);
  const previewFields = fields.slice(0, PREVIEW_FIELD_COUNT);
  const hasMoreFields = fields.length > PREVIEW_FIELD_COUNT;

  return (
    <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-4">
      <h3 className="text-sm font-semibold text-crm-heading">
        End of service review
      </h3>

      {!hasReview ? (
        <p className="mt-2 text-sm text-crm-slate">No review on file for this term.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-crm-slate">
            {formatEndOfServiceReviewLabel(completedAt)}
          </p>

          {!compact && previewFields.length > 0 && (
            <dl className="mt-4 space-y-3">
              {previewFields.map((field) => (
                <div key={field.id}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
                    {field.question}
                  </dt>
                  <dd className="mt-1 text-sm text-crm-heading">{field.answer}</dd>
                </div>
              ))}
            </dl>
          )}

          {!compact && hasMoreFields && onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="mt-4 rounded-xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50"
            >
              View full review ({fields.length} answers)
            </button>
          )}

          {compact && completedAt && (
            <p className="mt-1 text-xs text-crm-slate">
              Completed {formatDisplayDate(completedAt) ?? completedAt}
            </p>
          )}
        </>
      )}
    </section>
  );
}
