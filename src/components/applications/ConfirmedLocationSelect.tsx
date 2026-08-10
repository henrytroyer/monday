/**
 * ConfirmedLocationSelect.tsx — Editable “Confirmed: …” location pill.
 * Writes the short-term / long-term Monday Location column immediately on change.
 */

import { useEffect, useMemo, useState } from 'react';
import { LONGTERM_FIELD_LOCATIONS } from '../../constants/longtermFieldLocations';
import {
  fetchAssignedLocationOptions,
  updateApplicationFieldsOnMonday,
} from '../../services/crmApi';
import { LOCATION_OPTIONS } from '../../types/volunteer';
import {
  displayConfirmedLocation,
  displayLocationPreferenceOnly,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import type { Volunteer } from '../../types/volunteer';

interface ConfirmedLocationSelectProps {
  volunteer: Volunteer;
  boardId: string | null;
  canEdit?: boolean;
  longterm?: boolean;
  onSaved?: () => void;
}

const CLEAR_VALUE = '__clear__';

export default function ConfirmedLocationSelect({
  volunteer,
  boardId,
  canEdit = false,
  longterm = false,
  onSaved,
}: ConfirmedLocationSelectProps) {
  const confirmed = hasConfirmedLocation(volunteer);
  const current = confirmed ? displayConfirmedLocation(volunteer) : '';
  const editable = canEdit && Boolean(boardId);

  const [options, setOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editable || !boardId) return;
    let cancelled = false;
    void fetchAssignedLocationOptions(boardId, { longterm })
      .then((labels) => {
        if (!cancelled) setOptions(labels);
      })
      .catch(() => {
        if (!cancelled) {
          setOptions(
            longterm
              ? [...LONGTERM_FIELD_LOCATIONS]
              : [...LOCATION_OPTIONS],
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editable, boardId, longterm]);

  const selectOptions = useMemo(() => {
    const fallback = longterm
      ? [...LONGTERM_FIELD_LOCATIONS]
      : [...LOCATION_OPTIONS];
    const base = options.length > 0 ? options : fallback;
    const merged = new Set(base);
    if (current.trim()) merged.add(current.trim());
    return Array.from(merged);
  }, [options, current, longterm]);

  async function handleChange(nextRaw: string) {
    if (!boardId || !editable || saving) return;
    const next = nextRaw === CLEAR_VALUE ? '' : nextRaw.trim();
    if (next === current) return;

    setSaving(true);
    setError(null);
    try {
      await updateApplicationFieldsOnMonday(
        boardId,
        volunteer.id,
        { location: next },
        { longterm },
      );
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update location');
    } finally {
      setSaving(false);
    }
  }

  if (!editable) {
    return confirmed ? (
      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
        Confirmed: {current}
      </span>
    ) : (
      <span className="rounded-full bg-crm-white px-3 py-1 text-sm text-crm-text">
        {displayLocationPreferenceOnly(volunteer)}
      </span>
    );
  }

  return (
    <div
      className="inline-flex flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <label className="sr-only" htmlFor={`confirmed-location-${volunteer.id}`}>
        Confirmed location
      </label>
      <select
        id={`confirmed-location-${volunteer.id}`}
        aria-label="Confirmed location"
        value={current}
        disabled={saving}
        onChange={(e) => void handleChange(e.target.value)}
        className={`max-w-[16rem] cursor-pointer truncate rounded-full border-0 px-3 py-1 text-sm font-medium outline-none transition focus:ring-2 focus:ring-green-700/30 disabled:cursor-wait disabled:opacity-60 ${
          confirmed
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-crm-white text-crm-text ring-1 ring-crm-taupe/25 hover:ring-crm-taupe/40'
        }`}
        title="Change confirmed location on monday.com"
      >
        {!confirmed && (
          <option value="">Set confirmed location…</option>
        )}
        {selectOptions.map((option) => (
          <option key={option} value={option}>
            {confirmed && option === current
              ? `Confirmed: ${option}`
              : option}
          </option>
        ))}
        {confirmed && (
          <option value={CLEAR_VALUE}>Clear confirmed location</option>
        )}
      </select>
      {error && (
        <span className="max-w-[16rem] text-[11px] text-amber-800" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
