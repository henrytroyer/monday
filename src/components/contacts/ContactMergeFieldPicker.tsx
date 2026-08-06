/**
 * ContactMergeFieldPicker.tsx — Per-field keep/delete choices for contact merge.
 * Defaults match buildFieldMergePlan / richest-survivor recommendations.
 */

import {
  CONTACT_TAG_LABELS,
  CONTACT_TAGS,
  type ContactTag,
} from '../../types/contact';
import type {
  MergeFieldChoices,
  MergeScalarFieldKey,
} from '../../services/contactUpsert/merge';

export interface ContactMergeFieldSelections {
  fieldValues: Partial<Record<MergeScalarFieldKey, string>>;
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
}

interface ContactMergeFieldPickerProps {
  choices: MergeFieldChoices;
  selections: ContactMergeFieldSelections;
  disabled?: boolean;
  onChange: (next: ContactMergeFieldSelections) => void;
  onPrimaryEmailChange?: (email: string) => void;
}

export default function ContactMergeFieldPicker({
  choices,
  selections,
  disabled = false,
  onChange,
  onPrimaryEmailChange,
}: ContactMergeFieldPickerProps) {
  const choiceFields = choices.fields.filter((f) => f.needsChoice);
  const resolvedFields = choices.fields.filter((f) => !f.needsChoice);

  function setFieldValue(key: MergeScalarFieldKey, value: string) {
    if (key === 'email' && onPrimaryEmailChange) {
      onPrimaryEmailChange(value);
      return;
    }
    onChange({
      ...selections,
      fieldValues: { ...selections.fieldValues, [key]: value },
    });
  }

  function toggleTag(tag: ContactTag) {
    const has = selections.tags.includes(tag);
    onChange({
      ...selections,
      tags: has
        ? selections.tags.filter((t) => t !== tag)
        : [...selections.tags, tag],
    });
  }

  function pickTagsFromContact(contactId: string) {
    const entry = choices.tags.byContact.find((c) => c.contactId === contactId);
    if (!entry) return;
    onChange({ ...selections, tags: [...entry.tags] });
  }

  function selectAllUnionTags() {
    onChange({
      ...selections,
      tags: [...choices.tags.recommendedTags],
    });
  }

  return (
    <div className="space-y-4">
      {choiceFields.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-crm-heading">
            Choose values to keep
          </h3>
          <p className="text-xs text-crm-slate">
            Defaults match the recommended survivor. Pick another value to keep
            it instead; duplicates are still archived (not deleted).
          </p>
          <ul className="space-y-3">
            {choiceFields.map((field) => (
              <li
                key={field.key}
                className="rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-3"
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
                  {field.label}
                </div>
                <div className="space-y-2">
                  {field.options.map((opt) => {
                    const selected =
                      (selections.fieldValues[field.key] ??
                        field.recommendedValue) === opt.value;
                    const isRecommended =
                      opt.value === field.recommendedValue;
                    return (
                      <label
                        key={`${field.key}-${opt.contactId}-${opt.value}`}
                        className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
                          selected
                            ? 'bg-crm-indigo/10 text-crm-heading'
                            : 'text-crm-slate hover:bg-crm-taupe-50'
                        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <input
                          type="radio"
                          className="mt-1"
                          name={`merge-field-${field.key}`}
                          checked={selected}
                          disabled={disabled}
                          onChange={() => setFieldValue(field.key, opt.value)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="break-words font-medium text-crm-heading">
                            {opt.value}
                          </span>
                          <span className="mt-0.5 block text-xs text-crm-slate/80">
                            from {opt.contactName}
                            {isRecommended ? ' · recommended' : ''}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {choices.tags.needsChoice && (
        <section className="rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-crm-slate">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={disabled}
                onClick={selectAllUnionTags}
                className="rounded-lg border border-crm-taupe/20 px-2 py-0.5 text-xs text-crm-slate hover:bg-crm-taupe-50 disabled:opacity-50"
              >
                Union (all)
              </button>
              {choices.tags.byContact.map((entry) => (
                <button
                  key={entry.contactId}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickTagsFromContact(entry.contactId)}
                  className="rounded-lg border border-crm-taupe/20 px-2 py-0.5 text-xs text-crm-slate hover:bg-crm-taupe-50 disabled:opacity-50"
                >
                  From {entry.contactName}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTACT_TAGS.filter((tag) =>
              choices.tags.recommendedTags.includes(tag),
            ).map((tag) => {
              const checked = selections.tags.includes(tag);
              return (
                <label
                  key={tag}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                    checked
                      ? 'border-crm-indigo/30 bg-crm-indigo/10 text-crm-heading'
                      : 'border-crm-taupe/20 text-crm-slate'
                  } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleTag(tag)}
                  />
                  {CONTACT_TAG_LABELS[tag]}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {choices.pastorSource?.needsChoice && (
        <section className="rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
            {choices.pastorSource.label}
          </div>
          <div className="space-y-1">
            {choices.pastorSource.options.map((opt) => {
              const selected =
                (selections.pastorSourceId ??
                  choices.pastorSource!.recommendedContactId) ===
                opt.contactId;
              return (
                <label
                  key={opt.contactId}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    selected
                      ? 'bg-crm-indigo/10 text-crm-heading'
                      : 'text-crm-slate hover:bg-crm-taupe-50'
                  } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="merge-pastor-source"
                    checked={selected}
                    disabled={disabled}
                    onChange={() =>
                      onChange({
                        ...selections,
                        pastorSourceId: opt.contactId,
                      })
                    }
                  />
                  {opt.contactName}
                  {opt.contactId ===
                  choices.pastorSource!.recommendedContactId
                    ? ' · recommended'
                    : ''}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {choices.parentSource?.needsChoice && (
        <section className="rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
            {choices.parentSource.label}
          </div>
          <div className="space-y-1">
            {choices.parentSource.options.map((opt) => {
              const selected =
                (selections.parentSourceId ??
                  choices.parentSource!.recommendedContactId) ===
                opt.contactId;
              return (
                <label
                  key={opt.contactId}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    selected
                      ? 'bg-crm-indigo/10 text-crm-heading'
                      : 'text-crm-slate hover:bg-crm-taupe-50'
                  } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="merge-parent-source"
                    checked={selected}
                    disabled={disabled}
                    onChange={() =>
                      onChange({
                        ...selections,
                        parentSourceId: opt.contactId,
                      })
                    }
                  />
                  {opt.contactName}
                  {opt.contactId ===
                  choices.parentSource!.recommendedContactId
                    ? ' · recommended'
                    : ''}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {resolvedFields.length > 0 && (
        <section className="rounded-xl border border-crm-taupe/15 bg-crm-taupe-50/40 px-3 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
            Same across contacts
          </h3>
          <dl className="grid gap-2 text-sm">
            {resolvedFields.map((field) => (
              <div key={field.key} className="flex gap-2">
                <dt className="w-24 shrink-0 font-medium text-crm-heading">
                  {field.label}
                </dt>
                <dd className="break-words text-crm-slate">
                  {field.resolvedValue || '—'}
                </dd>
              </div>
            ))}
            {!choices.tags.needsChoice &&
              choices.tags.recommendedTags.length > 0 && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-medium text-crm-heading">
                    Tags
                  </dt>
                  <dd className="text-crm-slate">
                    {choices.tags.recommendedTags
                      .map((tag) => CONTACT_TAG_LABELS[tag])
                      .join(', ')}
                  </dd>
                </div>
              )}
          </dl>
        </section>
      )}
    </div>
  );
}
