/**
 * UserSettingsPage.tsx — Operator-facing CRM settings (profile, email signature, prefs).
 */

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import SignatureManagerDialog from '../components/email/dialogs/SignatureManagerDialog';
import PermissionGate from '../components/shared/PermissionGate';
import { useCurrentUser } from '../context/CurrentUserContext';
import { usePermissions } from '../context/PermissionsContext';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { CRM_ROLE_META } from '../permissions/roles';
import { updateOwnOperatorProfile } from '../services/crmRbacBoard';
import {
  getDefaultEmailSignature,
  listEmailSignatures,
} from '../utils/emailSignatures';
import { resizeImageForAvatar } from '../utils/resizeImageForAvatar';

const LANDING_PAGE_KEY = 'crm-user-default-landing-v1';

const LANDING_OPTIONS = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'applications', label: 'Short-term applications' },
  { id: 'recruitment', label: 'Recruitment' },
  { id: 'longterm-applications', label: 'Long-term applications' },
  { id: 'email-templates', label: 'Email templates' },
  { id: 'email-campaigns', label: 'Email campaigns' },
  { id: 'history', label: 'History' },
] as const;

function readLanding(): string {
  try {
    return localStorage.getItem(LANDING_PAGE_KEY) || 'contacts';
  } catch {
    return 'contacts';
  }
}

export function getUserDefaultLandingPage(): string {
  return readLanding();
}

export default function UserSettingsPage() {
  return (
    <PermissionGate permission="contacts.view">
      <UserSettingsInner />
    </PermissionGate>
  );
}

function UserSettingsInner() {
  const { user, displayName } = useCurrentUser();
  const { roles, operator, hasPermission, refresh } = usePermissions();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nameDraft, setNameDraft] = useState(displayName);
  const [photoDraft, setPhotoDraft] = useState<string | undefined>(
    user?.photoUrl,
  );
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureCount, setSignatureCount] = useState(0);
  const [defaultSigName, setDefaultSigName] = useState<string | null>(null);
  const [landing, setLanding] = useState(readLanding);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [landingNote, setLandingNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

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

  const canEditProfile = hasPermission('contacts.profile.self_edit');
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
      localStorage.setItem(LANDING_PAGE_KEY, next);
      setLandingNote('Default page saved for this browser.');
    } catch {
      setLandingNote('Could not save preference in this browser.');
    }
  }

  async function onPickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!canEditProfile) {
      showPermissionDenied();
      return;
    }
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
    if (!canEditProfile) {
      showPermissionDenied();
      return;
    }
    setSavingProfile(true);
    setError(null);
    setSavedNote(null);
    try {
      await updateOwnOperatorProfile({
        displayName: nameDraft.trim() || displayName,
        photoUrl: photoDraft ?? null,
      });
      await refresh();
      setSavedNote('Profile saved.');
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Permission denied. Reach out to the developer.';
      setError(text);
      showPermissionDenied(text);
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-crm-heading">User settings</h1>
        <p className="mt-2 text-sm text-crm-slate">
          Your CRM profile, email signature, and personal preferences.
        </p>
      </header>

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
              {canEditProfile && (
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
              )}
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
                  disabled={!canEditProfile}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm disabled:bg-crm-taupe-50"
                />
              </label>
              <div>
                <p className="text-crm-slate">Email</p>
                <p className="font-medium text-crm-heading">
                  {user?.email?.trim() || operator?.email || '—'}
                </p>
              </div>
              <div>
                <p className="text-crm-slate">Roles</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-lg bg-crm-indigo-50 px-2 py-0.5 text-xs font-medium text-crm-heading"
                      title={CRM_ROLE_META[role].description}
                    >
                      {CRM_ROLE_META[role].displayName}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-crm-slate">Status</p>
                <p className="font-medium capitalize text-crm-heading">
                  {operator?.status || 'active'}
                </p>
              </div>
            </div>
          </div>

          {canEditProfile && (
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
          )}
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
