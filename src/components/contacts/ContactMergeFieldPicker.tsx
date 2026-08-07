/**
 * ContactMergeFieldPicker.tsx — Per-field keep/delete choices for contact merge.
 *
 * Email / phone / address: keep several (checkboxes) + mark one Primary.
 * Other scalars: single radio. Defaults match buildFieldMergePlan.
 */

import {
  CONTACT_TAG_LABELS,
  CONTACT_TAGS,
  type ContactTag,
} from '../../types/contact';
import type {
  MergeFieldChoices,
  MergeMultiFieldKind,
  MergeMultiValueSelection,
  MergeScalarFieldKey,
} from '../../services/contactUpsert/merge';

export interface ContactMergeFieldSelections {
  fieldValues: Partial<Record<MergeScalarFieldKey, string>>;
  multi: Record<MergeMultiFieldKind, MergeMultiValueSelection>;
  tags: ContactTag[];
  pastorSourceId?: string;
  parentSourceId?: string;
}

interface ContactMergeFieldPickerProps {
  choices: MergeFieldChoices;
  selections: ContactMergeFieldSelections;
  disabled?: boolean;
  onChange: (next: ContactMergeFieldSelections) => void;
}

function valuesEqual(
  kind: MergeMultiFieldKind,
  a: string,
  b: string,
): boolean {
  if (kind === 'email') {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  if (kind === 'phone') {
    const da = a.replace(/\D/g, '');
    const db = b.replace(/\D/g, '');
    return (da || a.trim().toLowerCase()) === (db || b.trim().toLowerCase());
  }
  return (
    a.trim().toLowerCase().replace(/\s+/g, ' ') ===
    b.trim().toLowerCase().replace(/\s+/g, ' ')
  );
}

export default function ContactMergeFieldPicker({
  choices,
  selections,
  disabled = false,
  onChange,
}: ContactMergeFieldPickerProps) {
  const choiceFields = choices.fields.filter((f) => f.needsChoice);
  const resolvedFields = choices.fields.filter((f) => !f.needsChoice);
  const multiNeedingChoice = choices.multiFields.filter((f) => f.needsChoice);
  const multiResolved = choices.multiFields.filter((f) => !f.needsChoice);

  function setFieldValue(key: MergeScalarFieldKey, value: string) {
    onChange({
      ...selections,
      fieldValues: { ...selections.fieldValues, [key]: value },
    });
  }

  function toggleKept(kind: MergeMultiFieldKind, value: string) {
    const current = selections.multi[kind] ?? { kept: [], primary: '' };
    const kept = [...current.kept];
    const idx = kept.findIndex((v) => valuesEqual(kind, v, value));
    if (idx >= 0) {
      kept.splice(idx, 1);
    } else {
      kept.push(value);
    }
    let primary = current.primary;
    if (kept.length === 0) {
      primary = '';
    } else if (
      !primary ||
      !kept.some((v) => valuesEqual(kind, v, primary))
    ) {
      primary = kept[0]!;
    }
    onChange({
      ...selections,
      multi: {
        ...selections.multi,
        [kind]: { kept, primary },
      },
    });
  }

  function setPrimary(kind: MergeMultiFieldKind, value: string) {
    const current = selections.multi[kind] ?? { kept: [], primary: '' };
    const kept = current.kept.some((v) => valuesEqual(kind, v, value))
      ? current.kept
      : [...current.kept, value];
    onChange({
      ...selections,
      multi: {
        ...selections.multi,
        [kind]: { kept, primary: value },
      },
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
      {multiNeedingChoice.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-crm-heading">
            Keep several values
          </h3>
          <p className="text-xs text-crm-slate">
            Check every value to save. Mark one as Primary (shows first); the
            rest become Alternate.
          </p>
          <ul className="space-y-3">
            {multiNeedingChoice.map((field) => {
              const sel = selections.multi[field.kind] ?? {
                kept: [],
                primary: '',
              };
              return (
                <li
                  key={field.kind}
                  className="rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-3"
                >
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
                    {field.label}
                  </div>
                  <div className="space-y-2">
                    {field.options.map((opt) => {
                      const kept = sel.kept.some((v) =>
                        valuesEqual(field.kind, v, opt.value),
                      );
                      const isPrimary =
                        kept &&
                        Boolean(sel.primary) &&
                        valuesEqual(field.kind, sel.primary, opt.value);
                      const isRecommendedPrimary = valuesEqual(
                        field.kind,
                        opt.value,
                        field.recommendedPrimary,
                      );
                      return (
                        <div
                          key={`${field.kind}-${opt.contactId}-${opt.value}`}
                          className={`rounded-lg px-2 py-1.5 text-sm ${
                            kept
                              ? 'bg-crm-indigo/10 text-crm-heading'
                              : 'text-crm-slate'
                          } ${disabled ? 'opacity-60' : ''}`}
                        >
                          <label className="flex cursor-pointer items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={kept}
                              disabled={disabled}
                              onChange={() =>
                                toggleKept(field.kind, opt.value)
                              }
                            />
                            <span className="min-w-0 flex-1">
                              <span className="whitespace-pre-wrap break-words font-medium text-crm-heading">
                                {opt.value}
                              </span>
                              <span className="mt-0.5 block text-xs text-crm-slate/80">
                                from {opt.contactName}
                                {isRecommendedPrimary
                                  ? ' · recommended primary'
                                  : ''}
                              </span>
                            </span>
                          </label>
                          {kept && (
                            <div className="mt-1.5 flex flex-wrap gap-2 pl-6">
                              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-crm-heading">
                                <input
                                  type="radio"
                                  name={`merge-primary-${field.kind}`}
                                  checked={isPrimary}
                                  disabled={disabled}
                                  onChange={() =>
                                    setPrimary(field.kind, opt.value)
                                  }
                                />
                                Primary
                              </label>
                              {!isPrimary && (
                                <span className="text-xs text-crm-slate">
                                  Alternate
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

      {(resolvedFields.length > 0 || multiResolved.length > 0) && (
        <section className="rounded-xl border border-crm-taupe/15 bg-crm-taupe-50/40 px-3 py-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-crm-slate">
            Same across contacts
          </h3>
          <dl className="grid gap-2 text-sm">
            {multiResolved.map((field) => (
              <div key={field.kind} className="flex gap-2">
                <dt className="w-24 shrink-0 font-medium text-crm-heading">
                  {field.label}
                </dt>
                <dd className="whitespace-pre-wrap break-words text-crm-slate">
                  {field.recommendedPrimary || '—'}
                </dd>
              </div>
            ))}
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
