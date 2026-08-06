/**
 * UserSettingsPage.tsx — Operator-facing CRM settings (profile, email signature, prefs).
 */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import SignatureManagerDialog from '../components/email/dialogs/SignatureManagerDialog';
import PrivateNotesSecurityCard from '../components/settings/PrivateNotesSecurityCard';
import { useCurrentUser } from '../context/useCurrentUser';
import { useWorkFocus } from '../hooks/useWorkFocus';
import {
  WORK_FOCUSES,
  WORK_FOCUS_META,
  defaultLandingPageForFocus,
  type WorkFocus,
} from '../preferences/workFocus';
import {
  hasExplicitLandingPreference,
  readLandingPreference,
  writeLandingPreference,
} from '../preferences/workFocusStorage';
import { updateOwnOperatorProfile } from '../services/crmOperatorProfile';
import {
  getDefaultEmailSignature,
  listEmailSignatures,
} from '../utils/emailSignatures';
import { resizeImageForAvatar } from '../utils/resizeImageForAvatar';

const LANDING_OPTIONS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'applications', label: 'Short-term applications' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'longterm-applications', label: 'Long-term applications' },
  { id: 'email-templates', label: 'Email templates' },
  { id: 'email-campaigns', label: 'Email campaigns' },
  { id: 'history', label: 'History' },
] as const;

export function getUserDefaultLandingPage(focus?: WorkFocus): string {
  if (hasExplicitLandingPreference()) {
    return readLandingPreference() || 'contacts';
  }
  if (focus) return defaultLandingPageForFocus(focus);
  return 'contacts';
}

export default function UserSettingsPage() {
  const { user, displayName } = useCurrentUser();
  const {
    focus,
    derivedFocus,
    override,
    label: focusLabel,
    description: focusDescription,
    setOverride,
  } = useWorkFocus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nameDraft, setNameDraft] = useState(displayName);
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(
    user?.photoUrl,
  );
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);
  const [defaultSigName, setDefaultSigName] = useState<string | null>(null);
  const [landing, setLanding] = useState(() => getUserDefaultLandingPage(focus));
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [landingNote, setLandingNote] = useState<string | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!hasExplicitLandingPreference()) {
      setLanding(defaultLandingPageForFocus(focus));
    }
  }, [focus]);

  useEffect(() => {
    setNameDraft(displayName);
    setPhotoDraft(user?.photoUrl);
  }, [displayName, user?.photoUrl]);

  useEffect(() => {
    void import('../services/portalEmailSignaturesSync')
      .then(({ syncEmailSignaturesFromPortal }) =>
        syncEmailSignaturesFromPortal(),
      )
      .catch(() => undefined)
      .finally(() => {
        setSignatureCount(listEmailSignatures().length);
        setDefaultSigName(getDefaultEmailSignature()?.name ?? null);
      });
  }, []);

  const initials =
    nameDraft
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?';

  function saveLanding(next: string) {
    setLanding(next);
    try {
      writeLandingPreference(next);
      setLandingNote('Default page saved for this browser.');
    } catch {
      setLandingNote('Could not save preference in this browser.');
    }
  }

  function saveWorkFocus(next: string) {
    if (next === 'auto') {
      setOverride(null);
      setFocusNote(
        `Using default focus (${WORK_FOCUS_META[derivedFocus].label}).`,
      );
      return;
    }
    if (WORK_FOCUSES.includes(next as WorkFocus)) {
      setOverride(next as WorkFocus);
      setFocusNote(
        `Work focus set to ${WORK_FOCUS_META[next as WorkFocus].label} for this browser.`,
      );
    }
  }

  async function onPickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageForAvatar(file);
      setPhotoDraft(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read image.');
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    setSavedNote(null);
    try {
      await updateOwnOperatorProfile({
        displayName: nameDraft.trim() || displayName,
        photoUrl: photoDraft ?? null,
      });
      setSavedNote('Profile saved.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save profile.',
      );
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-crm-heading">User settings</h1>
        <p className="mt-2 text-sm text-crm-slate">
          Your CRM profile, private notes security, email signature, and
          personal preferences.
        </p>
      </header>

      <PrivateNotesSecurityCard />

      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
          Profile
        </h2>
        <form
          onSubmit={(e) => void handleSaveProfile(e)}
          className="mt-4 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {photoDraft ? (
                <img
                  src={photoDraft}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover ring-1 ring-crm-taupe/25"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-crm-indigo-100 text-sm font-semibold text-crm-heading ring-1 ring-crm-taupe/20">
                  {initials}
                </span>
              )}
              <div className="mt-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-crm-taupe/30 px-2 py-1 text-[11px] text-crm-heading hover:bg-crm-taupe-50"
                >
                  Change photo
                </button>
                {photoDraft && (
                  <button
                    type="button"
                    onClick={() => setPhotoDraft(undefined)}
                    className="rounded-lg px-2 py-1 text-[11px] text-crm-slate hover:bg-crm-taupe-50"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void onPickPhoto(e)}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-3 text-sm">
              <label className="block text-crm-heading">
                Name
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
                />
              </label>
              <div>
                <p className="text-crm-slate">Email</p>
                <p className="font-medium text-crm-heading">
                  {user?.email?.trim() || '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-60"
            >
              {savingProfile ? 'Saving…' : 'Save profile'}
            </button>
            {error && <p className="text-xs text-amber-800">{error}</p>}
            {savedNote && !error && (
              <p className="text-xs text-crm-heading">{savedNote}</p>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
              Email signature
            </h2>
            <p className="mt-1 text-sm text-crm-slate">
              {signatureCount === 0
                ? 'No signatures saved yet.'
                : `${signatureCount} signature${signatureCount === 1 ? '' : 's'}${
                    defaultSigName ? ` · default: ${defaultSigName}` : ''
                  }`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSignatureOpen(true)}
            className="rounded-xl bg-crm-indigo px-3 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
          >
            Manage signatures
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
          Work focus
        </h2>
        <p className="mt-2 text-sm text-crm-heading">
          Work focus: {focusLabel}
        </p>
        <p className="mt-1 text-xs text-crm-slate">{focusDescription}</p>
        <p className="mt-1 text-xs text-crm-slate">
          Browser preference
          {override
            ? ` · custom (default: ${WORK_FOCUS_META[derivedFocus].label})`
            : ' · default layout'}
          . Detail panels put your job first (Finance → donations/billing; HR →
          applications/terms).
        </p>
        <label className="mt-4 block text-sm text-crm-heading">
          Focus for this browser
          <select
            value={override ?? 'auto'}
            onChange={(e) => saveWorkFocus(e.target.value)}
            className="mt-1.5 w-full max-w-md rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
          >
            <option value="auto">
              Default ({WORK_FOCUS_META[derivedFocus].label})
            </option>
            {WORK_FOCUSES.map((id) => (
              <option key={id} value={id}>
                {WORK_FOCUS_META[id].label}
              </option>
            ))}
          </select>
        </label>
        {focusNote && (
          <p className="mt-2 text-xs text-crm-heading">{focusNote}</p>
        )}
      </section>

      <section className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
          Preferences
        </h2>
        <label className="mt-4 block text-sm text-crm-heading">
          Default landing page
          <select
            value={landing}
            onChange={(e) => saveLanding(e.target.value)}
            className="mt-1.5 w-full max-w-md rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
          >
            {LANDING_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-crm-slate">
          Used when this browser opens the CRM with no saved navigation state.
          {!hasExplicitLandingPreference()
            ? ` Currently seeded from work focus (${focusLabel} → ${
                LANDING_OPTIONS.find(
                  (o) => o.id === defaultLandingPageForFocus(focus),
                )?.label ?? 'Contacts'
              }).`
            : ''}
        </p>
        {landingNote && (
          <p className="mt-2 text-xs text-crm-heading">{landingNote}</p>
        )}
      </section>

      <SignatureManagerDialog
        open={signatureOpen}
        onClose={() => {
          setSignatureOpen(false);
          setSignatureCount(listEmailSignatures().length);
          setDefaultSigName(getDefaultEmailSignature()?.name ?? null);
        }}
        onInsert={() => setSignatureOpen(false)}
        onSignaturesChange={() => {
          setSignatureCount(listEmailSignatures().length);
          setDefaultSigName(getDefaultEmailSignature()?.name ?? null);
        }}
      />
    </div>
  );
}
