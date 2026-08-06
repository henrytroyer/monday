/**
 * ContactMergeConfirmModal.tsx — In-CRM confirmation for merging Contacts.
 * Supports field-level keep/delete selection; defaults match the merge engine.
 */

import { useEffect, useMemo, useState } from 'react';
import type { ContactListItem } from '../../types/contact';
import type { MergeContactsPreview } from '../../services/contactUpsert/contactBoardDedupe';
import {
  buildMergeFieldChoices,
  defaultSelectionsFromChoices,
  recomputeAltEmailForPrimary,
  selectionsToFieldOverrides,
  type FieldMergeOverrides,
} from '../../services/contactUpsert/merge';
import ContactMergeFieldPicker, {
  type ContactMergeFieldSelections,
} from './ContactMergeFieldPicker';

interface ContactMergeConfirmModalProps {
  open: boolean;
  survivor: ContactListItem;
  losers: ContactListItem[];
  preview: MergeContactsPreview;
  allContacts?: ContactListItem[];
  busy?: boolean;
  onConfirm: (overrides: FieldMergeOverrides) => void;
  onCancel: () => void;
}

export default function ContactMergeConfirmModal({
  open,
  survivor,
  losers,
  preview,
  allContacts = [],
  busy = false,
  onConfirm,
  onCancel,
}: ContactMergeConfirmModalProps) {
  const choices = useMemo(
    () => buildMergeFieldChoices(survivor, losers, allContacts),
    [survivor, losers, allContacts],
  );

  const [selections, setSelections] = useState<ContactMergeFieldSelections>(
    () => defaultSelectionsFromChoices(choices),
  );

  // Reset selections when the merge set changes / dialog opens.
  useEffect(() => {
    if (!open) return;
    setSelections(defaultSelectionsFromChoices(choices));
  }, [open, choices]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  function handlePrimaryEmailChange(email: string) {
    const alt = recomputeAltEmailForPrimary(survivor, losers, email);
    setSelections((prev) => ({
      ...prev,
      fieldValues: {
        ...prev.fieldValues,
        email,
        altEmail: alt ?? '',
      },
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-merge-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/30 backdrop-blur-sm"
        aria-label="Cancel merge"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />

      <div className="relative flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="shrink-0 border-b border-crm-taupe/20 px-5 py-4">
          <h2
            id="contact-merge-title"
            className="text-lg font-semibold text-crm-heading"
          >
            Merge into “
            {selections.fieldValues.name || preview.resultingName}”?
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            Choose which values to keep for each field. Defaults match the
            richest survivor. Duplicates are archived (not permanently deleted).
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 text-sm">
          {preview.namesDiffer && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              Names differ across these contacts. Pick which name to keep below.
            </div>
          )}

          <div className="space-y-2">
            <div>
              <span className="font-medium text-crm-heading">Keep record</span>
              <p className="text-crm-slate">
                {survivor.name}{' '}
                <span className="text-xs text-crm-slate/80">({survivor.id})</span>
              </p>
            </div>
            <div>
              <span className="font-medium text-crm-heading">
                Archive{' '}
                {losers.length === 1
                  ? 'duplicate'
                  : `${losers.length} duplicates`}
              </span>
              <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-crm-taupe/15 bg-crm-white px-3 py-2 text-crm-slate">
                {losers.map((loser) => (
                  <li key={loser.id}>
                    {loser.name}{' '}
                    <span className="text-xs text-crm-slate/80">
                      ({loser.id})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ContactMergeFieldPicker
            choices={choices}
            selections={selections}
            disabled={busy}
            onChange={setSelections}
            onPrimaryEmailChange={handlePrimaryEmailChange}
          />

          {(preview.willUpdatePastor || preview.willUpdateParents) &&
            preview.connectedVolunteerNames.length > 0 && (
              <div className="rounded-xl border border-crm-indigo/20 bg-crm-indigo/5 px-3 py-3 text-crm-heading">
                <p className="font-medium">Connected volunteer updates</p>
                <p className="mt-1 text-crm-slate">
                  {preview.connectedVolunteerNames.join(', ')}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-crm-slate">
                  {preview.willUpdatePastor ? (
                    <li>
                      Pastor fields from the selected Pastor-tagged contact.
                    </li>
                  ) : null}
                  {preview.willUpdateParents ? (
                    <li>
                      Parents fields from the selected Parents-tagged contact.
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-crm-taupe/20 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-xl border border-crm-taupe/25 bg-crm-white px-4 py-2 text-sm font-medium text-crm-heading hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm(selectionsToFieldOverrides(selections))
            }
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-crm-indigo-dark disabled:opacity-50"
          >
            {busy ? 'Merging…' : 'Merge contacts'}
          </button>
        </div>
      </div>
    </div>
  );
}
