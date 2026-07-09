/** Church InfoCard — pastor/church fields on volunteer contact detail (Contacts board columns). */
import { useEffect, useState, type ReactNode } from 'react';
import { useNavLayer } from '../../context/NavigationHistoryContext';
import type { ContactPastorReference } from '../../types/contact';
import type { ContactPastorFields } from '../../services/contactStorage';
import ContactCallModal from './ContactCallModal';

interface ChurchInfoCardProps {
  volunteerName: string;
  pastorReference?: ContactPastorReference;
  linkedItemIds?: string[];
  drillDownLoading?: boolean;
  saving?: boolean;
  canEdit?: boolean;
  onSave?: (fields: ContactPastorFields) => Promise<unknown>;
  onViewPastorReference?: () => void;
}

const inputClass =
  'w-full rounded-lg border border-crm-taupe/20 bg-crm-surface px-2 py-1 text-sm outline-none focus:border-crm-slate';

const editButtonClass =
  'rounded-xl border border-crm-taupe/25 bg-crm-taupe-100/90 px-4 py-2 text-sm font-medium text-crm-slate transition hover:border-crm-taupe/40 hover:bg-crm-taupe-100 hover:text-crm-heading disabled:cursor-not-allowed disabled:opacity-45';

function fieldsFromReference(
  pastorReference?: ContactPastorReference,
): ContactPastorFields {
  return {
    name: pastorReference?.name ?? '',
    email: pastorReference?.email ?? '',
    phone: pastorReference?.phone ?? '',
    church: pastorReference?.church ?? '',
  };
}

export default function ChurchInfoCard({
  volunteerName,
  pastorReference,
  linkedItemIds = [],
  drillDownLoading = false,
  saving = false,
  canEdit = false,
  onSave,
  onViewPastorReference,
}: ChurchInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<ContactPastorFields>(() =>
    fieldsFromReference(pastorReference),
  );
  const [callOpen, setCallOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const editable = canEdit && Boolean(onSave);

  const { requestClose: requestCloseCall } = useNavLayer(
    callOpen,
    () => setCallOpen(false),
    `church-info-call-${volunteerName}`,
  );

  const resetForm = () => {
    setFields(fieldsFromReference(pastorReference));
  };

  useEffect(() => {
    resetForm();
    setEditing(false);
    setSaveMessage(null);
  }, [volunteerName]);

  useEffect(() => {
    if (!editing) {
      resetForm();
    }
  }, [pastorReference, editing]);

  const handleSave = async () => {
    if (!onSave) return;

    try {
      await onSave({
        name: fields.name?.trim() || undefined,
        email: fields.email?.trim() || undefined,
        phone: fields.phone?.trim() || undefined,
        church: fields.church?.trim() || undefined,
      });
      setEditing(false);
      setSaveMessage('Saved');
      window.setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      // ContactDetailPanel shows the error banner.
    }
  };

  const displayName = pastorReference?.name?.trim();
  const displayEmail = pastorReference?.email?.trim();
  const displayPhone = pastorReference?.phone?.trim();
  const displayChurch = pastorReference?.church?.trim();
  const linkedCount = linkedItemIds.length;
  const hasLinkedReference = linkedCount > 0;
  const referenceButtonLabel =
    linkedCount > 1
      ? `Choose reference (${linkedCount}) →`
      : 'View reference →';

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-gradient-to-br from-crm-taupe-50 to-crm-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-crm-heading">
            Church InfoCard
          </h3>
          {editing ? (
            <input
              type="text"
              value={fields.church ?? ''}
              onChange={(e) =>
                setFields((current) => ({ ...current, church: e.target.value }))
              }
              placeholder="Church name"
              className="mt-2 w-full rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 py-2 text-base font-medium text-crm-heading outline-none focus:border-crm-slate"
            />
          ) : displayChurch ? (
            <p className="mt-1 text-base font-medium text-crm-heading">
              {displayChurch}
            </p>
          ) : (
            <p className="mt-1 text-sm text-crm-slate">Church not provided</p>
          )}
        </div>

        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={saving}
            className={editButtonClass}
          >
            Edit
          </button>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Pastor name">
          {editing ? (
            <input
              type="text"
              value={fields.name ?? ''}
              onChange={(e) =>
                setFields((current) => ({ ...current, name: e.target.value }))
              }
              className={inputClass}
            />
          ) : displayName ? (
            <span className="font-medium text-crm-heading">{displayName}</span>
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>

        <Field label="Email">
          {editing ? (
            <input
              type="email"
              value={fields.email ?? ''}
              onChange={(e) =>
                setFields((current) => ({ ...current, email: e.target.value }))
              }
              className={inputClass}
            />
          ) : displayEmail ? (
            <a
              href={`mailto:${displayEmail}`}
              className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
            >
              {displayEmail}
            </a>
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>

        <Field label="Phone">
          {editing ? (
            <input
              type="tel"
              value={fields.phone ?? ''}
              onChange={(e) =>
                setFields((current) => ({ ...current, phone: e.target.value }))
              }
              className={inputClass}
            />
          ) : displayPhone ? (
            <button
              type="button"
              onClick={() => setCallOpen(true)}
              className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
            >
              {displayPhone}
            </button>
          ) : (
            <span className="text-crm-slate">Not provided</span>
          )}
        </Field>

        <Field label="Pastor reference">
          {hasLinkedReference && onViewPastorReference ? (
            <button
              type="button"
              onClick={onViewPastorReference}
              disabled={drillDownLoading}
              className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline disabled:cursor-wait disabled:opacity-60"
            >
              {drillDownLoading ? 'Loading…' : referenceButtonLabel}
            </button>
          ) : (
            <span className="text-crm-slate">Not linked</span>
          )}
        </Field>
      </dl>

      {editing && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setEditing(false);
            }}
            disabled={saving}
            className={editButtonClass}
          >
            Cancel
          </button>
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-700">
              {saveMessage}
            </span>
          )}
        </div>
      )}

      {callOpen && displayPhone && (
        <ContactCallModal
          contactName={displayName ?? 'Pastor'}
          phone={displayPhone}
          onClose={requestCloseCall}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80">
      <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}
