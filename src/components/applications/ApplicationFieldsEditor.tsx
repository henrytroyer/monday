/**
 * ApplicationFieldsEditor.tsx — Edit application columns on Monday from CRM detail.
 */

import { useEffect, useState } from 'react';
import type { VolunteerDetail } from '../../types/volunteer';
import type { ApplicationEditableFields } from '../../services/crmApi';
import { updateApplicationFieldsOnMonday } from '../../services/crmApi';

interface ApplicationFieldsEditorProps {
  detail: VolunteerDetail;
  boardId: string;
  canEdit: boolean;
  longterm?: boolean;
  onSaved?: () => void;
}

export default function ApplicationFieldsEditor({
  detail,
  boardId,
  canEdit,
  longterm = false,
  onSaved,
}: ApplicationFieldsEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState(detail.email === '—' ? '' : detail.email);
  const [phone, setPhone] = useState(detail.phone === '—' ? '' : detail.phone);
  const [housing, setHousing] = useState(
    detail.housing === '—' ? '' : detail.housing,
  );
  const [coordinator, setCoordinator] = useState(
    detail.coordinator === '—' ? '' : detail.coordinator,
  );
  const [locationPreference, setLocationPreference] = useState(
    detail.locationPreference ?? '',
  );
  const [location, setLocation] = useState(detail.location ?? '');
  const [spouseName, setSpouseName] = useState(
    detail.couple?.partner?.name ?? '',
  );
  const [spouseEmail, setSpouseEmail] = useState(
    detail.couple?.partner?.email ?? '',
  );
  const [arrivalDate, setArrivalDate] = useState(
    detail.itinerary?.arrival?.date ?? '',
  );
  const [departureDate, setDepartureDate] = useState(
    detail.itinerary?.departure?.date ?? '',
  );

  useEffect(() => {
    setEmail(detail.email === '—' ? '' : detail.email);
    setPhone(detail.phone === '—' ? '' : detail.phone);
    setHousing(detail.housing === '—' ? '' : detail.housing);
    setCoordinator(detail.coordinator === '—' ? '' : detail.coordinator);
    setLocationPreference(detail.locationPreference ?? '');
    setLocation(detail.location ?? '');
    setSpouseName(detail.couple?.partner?.name ?? '');
    setSpouseEmail(detail.couple?.partner?.email ?? '');
    setArrivalDate(detail.itinerary?.arrival?.date ?? '');
    setDepartureDate(detail.itinerary?.departure?.date ?? '');
    setEditing(false);
    setError(null);
    setMessage(null);
  }, [detail.id]);

  if (!canEdit) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const fields: ApplicationEditableFields = {
      email,
      phone,
      housing,
      coordinator,
      locationPreference,
      location,
      spouseName,
      spouseEmail,
      arrivalDate,
      departureDate,
    };
    try {
      await updateApplicationFieldsOnMonday(boardId, detail.id, fields, {
        longterm,
      });
      setEditing(false);
      setMessage('Saved to monday.com — visible on the board item.');
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-crm-heading">
            Application fields
          </h3>
          <p className="mt-0.5 text-xs text-crm-slate">
            Writes to the same Monday columns you see on the board.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-crm-taupe/30 px-3 py-1.5 text-xs font-medium text-crm-heading hover:bg-crm-taupe-50"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-crm-slate hover:bg-crm-taupe-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-lg bg-crm-heading px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save to Monday'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-amber-800">{error}</p>
      )}
      {message && (
        <p className="mt-3 text-sm text-emerald-700">{message}</p>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Email"
          editing={editing}
          value={email}
          onChange={setEmail}
        />
        <Field
          label="Phone"
          editing={editing}
          value={phone}
          onChange={setPhone}
        />
        <Field
          label="Housing"
          editing={editing}
          value={housing}
          onChange={setHousing}
        />
        <Field
          label="Coordinator"
          editing={editing}
          value={coordinator}
          onChange={setCoordinator}
        />
        <Field
          label="Location preference"
          editing={editing}
          value={locationPreference}
          onChange={setLocationPreference}
        />
        <Field
          label="Confirmed location"
          editing={editing}
          value={location}
          onChange={setLocation}
        />
        <Field
          label="Spouse name"
          editing={editing}
          value={spouseName}
          onChange={setSpouseName}
        />
        <Field
          label="Spouse email"
          editing={editing}
          value={spouseEmail}
          onChange={setSpouseEmail}
        />
        <Field
          label="Arrival date"
          editing={editing}
          value={arrivalDate}
          onChange={setArrivalDate}
          type="date"
        />
        <Field
          label="Departure date"
          editing={editing}
          value={departureDate}
          onChange={setDepartureDate}
          type="date"
        />
      </dl>
    </section>
  );
}

function Field({
  label,
  editing,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="mt-1">
        {editing ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-crm-taupe/30 bg-crm-surface px-3 py-2 text-sm text-crm-heading"
          />
        ) : (
          <span className="text-sm font-medium text-crm-heading">
            {value.trim() || '—'}
          </span>
        )}
      </dd>
    </div>
  );
}
