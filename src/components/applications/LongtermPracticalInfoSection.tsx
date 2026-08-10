/**
 * LongtermPracticalInfoSection.tsx — On-field ops fields (housing, visa, vehicle, budget).
 * Persists to Portal Things via portalPracticalInfoSync.
 */

import { useEffect, useState, type ChangeEvent } from 'react';
import { canEditPortalThings } from '../../config/boards';
import {
  HOUSING_ADD_NEW_VALUE,
  LONGTERM_VISA_TYPES,
} from '../../constants/longtermPracticalInfo';
import {
  addCustomHousingOption,
  loadHousingOptionsFromPortal,
  loadPracticalInfoFromPortal,
  savePracticalInfoToPortal,
} from '../../services/portalPracticalInfoSync';
import type {
  LongtermBudgetFile,
  LongtermPracticalInfo,
  LongtermVisaType,
} from '../../types/longtermPracticalInfo';
import {
  downloadBudgetFile,
  fileToBudgetAttachment,
  formatBudgetFileSize,
  openBudgetFile,
} from '../../utils/longtermBudgetFile';
import {
  emptyPracticalInfo,
  normalizeBudgetLink,
} from '../../utils/longtermPracticalInfo';

const inputClass =
  'w-full rounded-lg border border-crm-taupe/25 bg-crm-white px-2.5 py-1.5 text-sm text-crm-heading outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20';

const editButtonClass =
  'rounded-xl border border-crm-taupe/25 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50';

interface LongtermPracticalInfoSectionProps {
  volunteerId: string;
  volunteerName: string;
  /** When false, view-only (still loads data). */
  canEdit?: boolean;
}

function vehicleLabel(value: boolean | null): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '—';
}

export default function LongtermPracticalInfoSection({
  volunteerId,
  volunteerName,
  canEdit = false,
}: LongtermPracticalInfoSectionProps) {
  const editable = canEdit && canEditPortalThings();
  const [info, setInfo] = useState<LongtermPracticalInfo>(() =>
    emptyPracticalInfo(volunteerId),
  );
  const [housingOptions, setHousingOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [housingLocation, setHousingLocation] = useState('');
  const [visaType, setVisaType] = useState<'' | LongtermVisaType>('');
  const [usesI58Vehicle, setUsesI58Vehicle] = useState<'' | 'yes' | 'no'>('');
  const [budgetLink, setBudgetLink] = useState('');
  const [budgetFile, setBudgetFile] = useState<LongtermBudgetFile | null>(null);
  const [addingHousing, setAddingHousing] = useState(false);
  const [newHousingLabel, setNewHousingLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditing(false);
    setMessage(null);

    void Promise.all([
      loadPracticalInfoFromPortal(volunteerId),
      loadHousingOptionsFromPortal(),
    ])
      .then(([loaded, options]) => {
        if (cancelled) return;
        setInfo(loaded);
        setHousingOptions(options);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
        setInfo(emptyPracticalInfo(volunteerId));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [volunteerId]);

  function beginEdit() {
    setHousingLocation(info.housingLocation ?? '');
    setVisaType(info.visaType ?? '');
    setUsesI58Vehicle(
      info.usesI58Vehicle === true
        ? 'yes'
        : info.usesI58Vehicle === false
          ? 'no'
          : '',
    );
    setBudgetLink(info.budgetLink ?? '');
    setBudgetFile(info.budgetFile);
    setAddingHousing(false);
    setNewHousingLabel('');
    setError(null);
    setMessage(null);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setAddingHousing(false);
    setNewHousingLabel('');
    setError(null);
  }

  async function handleHousingSelect(value: string) {
    if (value === HOUSING_ADD_NEW_VALUE) {
      setAddingHousing(true);
      setNewHousingLabel('');
      return;
    }
    setHousingLocation(value);
    setAddingHousing(false);
  }

  async function confirmAddHousing() {
    try {
      setError(null);
      const options = await addCustomHousingOption(newHousingLabel);
      setHousingOptions(options);
      const label = newHousingLabel.trim();
      setHousingLocation(label);
      setAddingHousing(false);
      setNewHousingLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add housing');
    }
  }

  async function handleBudgetFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setError(null);
      const attachment = await fileToBudgetAttachment(file);
      setBudgetFile(attachment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach PDF');
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      let link: string | null = null;
      try {
        link = normalizeBudgetLink(budgetLink);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid budget link');
        setSaving(false);
        return;
      }

      const next: LongtermPracticalInfo = {
        volunteerId,
        housingLocation: housingLocation.trim() || null,
        visaType: visaType || null,
        usesI58Vehicle:
          usesI58Vehicle === 'yes'
            ? true
            : usesI58Vehicle === 'no'
              ? false
              : null,
        budgetLink: link,
        budgetFile,
        updatedAt: new Date().toISOString(),
      };

      const saved = await savePracticalInfoToPortal(next, {
        volunteerName,
      });
      setInfo(saved);
      setEditing(false);
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-crm-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-crm-heading">
            Practical information
          </h3>
          <p className="mt-1 text-sm text-crm-slate">
            Housing, visa, vehicle, and personal budget for on-field volunteers.
          </p>
        </div>
        {editable && !editing && !loading && (
          <button
            type="button"
            onClick={beginEdit}
            className={editButtonClass}
          >
            Edit
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-crm-slate">Loading…</p>
      ) : editing ? (
        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Housing location
            </span>
            <select
              className={inputClass}
              value={addingHousing ? HOUSING_ADD_NEW_VALUE : housingLocation}
              onChange={(e) => void handleHousingSelect(e.target.value)}
            >
              <option value="">Select housing…</option>
              {housingOptions.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              <option value={HOUSING_ADD_NEW_VALUE}>Add new…</option>
            </select>
          </label>

          {addingHousing && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
                  New housing name
                </span>
                <input
                  className={inputClass}
                  value={newHousingLabel}
                  onChange={(e) => setNewHousingLabel(e.target.value)}
                  placeholder="e.g. Harbor House"
                />
              </label>
              <button
                type="button"
                className="rounded-xl bg-crm-indigo px-3 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
                onClick={() => void confirmAddHousing()}
                disabled={!newHousingLabel.trim()}
              >
                Add
              </button>
              <button
                type="button"
                className={editButtonClass}
                onClick={() => {
                  setAddingHousing(false);
                  setNewHousingLabel('');
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Visa type
            </span>
            <select
              className={inputClass}
              value={visaType}
              onChange={(e) =>
                setVisaType(e.target.value as '' | LongtermVisaType)
              }
            >
              <option value="">Select visa…</option>
              {LONGTERM_VISA_TYPES.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Using i58 vehicle
            </legend>
            <div className="flex flex-wrap gap-4 text-sm text-crm-heading">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="i58-vehicle"
                  checked={usesI58Vehicle === 'yes'}
                  onChange={() => setUsesI58Vehicle('yes')}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="i58-vehicle"
                  checked={usesI58Vehicle === 'no'}
                  onChange={() => setUsesI58Vehicle('no')}
                />
                No
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="i58-vehicle"
                  checked={usesI58Vehicle === ''}
                  onChange={() => setUsesI58Vehicle('')}
                />
                Unset
              </label>
            </div>
          </fieldset>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Personal budget link
            </span>
            <input
              className={inputClass}
              type="url"
              value={budgetLink}
              onChange={(e) => setBudgetLink(e.target.value)}
              placeholder="https://…"
            />
          </label>

          <div className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Personal budget PDF
            </span>
            {budgetFile ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-crm-heading">
                  {budgetFile.fileName}
                </span>
                <span className="text-crm-slate">
                  ({formatBudgetFileSize(budgetFile.sizeBytes)})
                </span>
                <button
                  type="button"
                  className="text-crm-indigo underline"
                  onClick={() => openBudgetFile(budgetFile)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="text-crm-indigo underline"
                  onClick={() => downloadBudgetFile(budgetFile)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className="text-amber-800 underline"
                  onClick={() => setBudgetFile(null)}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-sm text-crm-slate">No PDF attached.</p>
            )}
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => void handleBudgetFileChange(e)}
              className="block w-full text-sm text-crm-slate file:mr-3 file:rounded-lg file:border-0 file:bg-crm-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-crm-heading"
            />
          </div>

          {error && (
            <p className="text-sm text-amber-800" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || addingHousing}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className={editButtonClass}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Housing location
            </dt>
            <dd className="mt-0.5 text-sm text-crm-heading">
              {info.housingLocation || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Visa type
            </dt>
            <dd className="mt-0.5 text-sm text-crm-heading">
              {info.visaType || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Using i58 vehicle
            </dt>
            <dd className="mt-0.5 text-sm text-crm-heading">
              {vehicleLabel(info.usesI58Vehicle)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
              Personal budget
            </dt>
            <dd className="mt-0.5 space-y-1 text-sm text-crm-heading">
              {info.budgetLink ? (
                <a
                  href={info.budgetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-crm-indigo underline break-all"
                >
                  {info.budgetLink}
                </a>
              ) : null}
              {info.budgetFile ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>{info.budgetFile.fileName}</span>
                  <button
                    type="button"
                    className="text-crm-indigo underline"
                    onClick={() => openBudgetFile(info.budgetFile!)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="text-crm-indigo underline"
                    onClick={() => downloadBudgetFile(info.budgetFile!)}
                  >
                    Download
                  </button>
                </div>
              ) : null}
              {!info.budgetLink && !info.budgetFile ? '—' : null}
            </dd>
          </div>
        </dl>
      )}

      {!editing && error && (
        <p className="mt-3 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}
      {!editing && message && (
        <p className="mt-3 text-sm text-emerald-700">{message}</p>
      )}
    </div>
  );
}
