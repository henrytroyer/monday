/**
 * VolunteerContactCard.tsx
 * Application identity card — email / phone / DOB / address are editable and
 * overwrite the matching monday.com item columns when applications are writable.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { VolunteerDetail } from '../../types/volunteer';
import {
  dateOfBirthToInputValue,
  formatDateOfBirth,
} from '../../utils/formatDateOfBirth';
import {
  buildGoogleMapsUrl,
  formatContactAddress,
} from '../../utils/formatContactAddress';
import { formatPhoneTelHref } from '../../utils/phoneFormat';
import { updateApplicationFieldsOnMonday } from '../../services/crmApi';
import FilePreviewModal from './FilePreviewModal';
import VolunteerFilesSection from './VolunteerFilesSection';
import {
  displayLocationPreferenceOnly,
  displayConfirmedLocation,
  hasConfirmedLocation,
} from '../../utils/volunteerLocation';
import VolunteerAvatar from './VolunteerAvatar';
import VolunteerTermDisplay from './VolunteerTermDisplay';

const inputClass =
  'w-full rounded-lg border border-crm-taupe/25 bg-crm-white px-2.5 py-1.5 text-sm text-crm-heading outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20';

const editButtonClass =
  'rounded-xl border border-crm-taupe/25 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50';

interface VolunteerContactCardProps {
  detail: VolunteerDetail;
  onEmailClick?: () => void;
  onPhoneClick?: () => void;
  beforeFiles?: ReactNode;
  besideFiles?: ReactNode;
  splitFilesRow?: boolean;
  boardId?: string | null;
  canUploadFiles?: boolean;
  onFilesUploaded?: () => void;
  /** When true with boardId, Email/Phone/DOB/Address can overwrite Monday. */
  canEdit?: boolean;
  longterm?: boolean;
  onContactSaved?: () => void;
}

export default function VolunteerContactCard({
  detail,
  onEmailClick,
  onPhoneClick,
  beforeFiles,
  besideFiles,
  splitFilesRow = false,
  boardId = null,
  canUploadFiles = false,
  onFilesUploaded,
  canEdit = false,
  longterm = false,
  onContactSaved,
}: VolunteerContactCardProps) {
  const editable = canEdit && Boolean(boardId);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [email, setEmail] = useState(
    detail.email === '—' ? '' : detail.email,
  );
  const [phone, setPhone] = useState(
    detail.phone === '—' ? '' : detail.phone,
  );
  const [dateOfBirth, setDateOfBirth] = useState(
    dateOfBirthToInputValue(detail.demographics?.dateOfBirth),
  );
  const [addressStreet, setAddressStreet] = useState(
    detail.demographics?.address ?? '',
  );
  const [addressCity, setAddressCity] = useState(
    detail.demographics?.city ?? '',
  );
  const [addressState, setAddressState] = useState(
    detail.demographics?.state ?? '',
  );
  const [addressZip, setAddressZip] = useState(
    detail.demographics?.zip ?? '',
  );
  const [addressCountry, setAddressCountry] = useState(
    detail.demographics?.country ?? '',
  );

  const resetForm = () => {
    setEmail(detail.email === '—' ? '' : detail.email);
    setPhone(detail.phone === '—' ? '' : detail.phone);
    setDateOfBirth(dateOfBirthToInputValue(detail.demographics?.dateOfBirth));
    setAddressStreet(detail.demographics?.address ?? '');
    setAddressCity(detail.demographics?.city ?? '');
    setAddressState(detail.demographics?.state ?? '');
    setAddressZip(detail.demographics?.zip ?? '');
    setAddressCountry(detail.demographics?.country ?? '');
  };

  useEffect(() => {
    resetForm();
    setEditing(false);
    setSaveError(null);
    setSaveMessage(null);
  }, [detail.id]);

  useEffect(() => {
    if (!editing) resetForm();
  }, [detail, editing]);

  const formattedAddress = detail.demographics
    ? formatContactAddress(detail.demographics)
    : null;
  const displayDateOfBirth = formatDateOfBirth(detail.demographics?.dateOfBirth);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);

  const profilePreviewFile =
    detail.profilePhotoUrl != null && detail.profilePhotoUrl !== ''
      ? {
          id: 'profile-photo',
          name: 'Profile photo',
          url: detail.profilePhotoUrl,
          isImage: true,
        }
      : null;

  const handleSave = async () => {
    if (!boardId || !editable) return;
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      await updateApplicationFieldsOnMonday(
        boardId,
        detail.id,
        {
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
          addressStreet: addressStreet.trim(),
          addressCity: addressCity.trim(),
          addressState: addressState.trim(),
          addressZip: addressZip.trim(),
          addressCountry: addressCountry.trim(),
        },
        { longterm },
      );
      setEditing(false);
      setSaveMessage('Saved');
      window.setTimeout(() => setSaveMessage(null), 2500);
      onContactSaved?.();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-crm-taupe/20 bg-gradient-to-br from-crm-taupe-50 to-crm-surface p-6 shadow-sm">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <VolunteerAvatar
          name={detail.name}
          profilePhotoUrl={detail.profilePhotoUrl}
          size="lg"
          onClick={
            profilePreviewFile
              ? () => setProfilePreviewOpen(true)
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold text-crm-heading">{detail.name}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {hasConfirmedLocation(detail) ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                Confirmed: {displayConfirmedLocation(detail)}
              </span>
            ) : (
              <span className="rounded-full bg-crm-white px-3 py-1 text-sm text-crm-text">
                {displayLocationPreferenceOnly(detail)}
              </span>
            )}
            <VolunteerTermDisplay volunteer={detail} variant="pill" />
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
              {detail.status}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <Field label="Email" tall={editing}>
              {editing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  autoComplete="email"
                />
              ) : detail.email !== '—' ? (
                onEmailClick ? (
                  <button
                    type="button"
                    onClick={onEmailClick}
                    className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                  >
                    {detail.email}
                  </button>
                ) : (
                  <a
                    href={`mailto:${detail.email}`}
                    className="font-medium text-crm-heading underline-offset-2 hover:underline"
                  >
                    {detail.email}
                  </a>
                )
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Phone" tall={editing}>
              {editing ? (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  autoComplete="tel"
                />
              ) : detail.phone !== '—' ? (
                onPhoneClick ? (
                  <button
                    type="button"
                    onClick={onPhoneClick}
                    className="font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                  >
                    {detail.phone}
                  </button>
                ) : (
                  <a
                    href={formatPhoneTelHref(detail.phone) ?? '#'}
                    className="font-medium text-crm-heading underline-offset-2 hover:underline"
                  >
                    {detail.phone}
                  </a>
                )
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Date of birth" tall={editing}>
              {editing ? (
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass}
                />
              ) : displayDateOfBirth ? (
                <span className="font-medium text-crm-heading">
                  {displayDateOfBirth}
                </span>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
            <Field label="Address" tall={editing}>
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={addressStreet}
                    onChange={(e) => setAddressStreet(e.target.value)}
                    placeholder="Street"
                    className={inputClass}
                    autoComplete="street-address"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="City"
                      className={inputClass}
                      autoComplete="address-level2"
                    />
                    <input
                      type="text"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="State"
                      className={inputClass}
                      autoComplete="address-level1"
                    />
                    <input
                      type="text"
                      value={addressZip}
                      onChange={(e) => setAddressZip(e.target.value)}
                      placeholder="Zip"
                      className={inputClass}
                      autoComplete="postal-code"
                    />
                  </div>
                  <input
                    type="text"
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    placeholder="Country"
                    className={inputClass}
                    autoComplete="country-name"
                  />
                </div>
              ) : formattedAddress ? (
                <a
                  href={buildGoogleMapsUrl(formattedAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-3 whitespace-pre-line font-medium text-crm-heading underline-offset-2 hover:text-crm-heading hover:underline"
                >
                  {formattedAddress}
                </a>
              ) : (
                <span className="text-crm-slate">Not provided</span>
              )}
            </Field>
          </dl>

          {editable && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white transition hover:bg-crm-indigo-dark disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setEditing(false);
                      setSaveError(null);
                    }}
                    disabled={saving}
                    className={editButtonClass}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setSaveError(null);
                    setSaveMessage(null);
                  }}
                  className={editButtonClass}
                >
                  Edit contact details
                </button>
              )}
              {saveMessage && (
                <span className="text-sm text-emerald-700">{saveMessage}</span>
              )}
              {saveError && (
                <span className="text-sm text-amber-800">{saveError}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {beforeFiles && <div className="mt-5">{beforeFiles}</div>}

      {splitFilesRow ? (
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 md:items-stretch">
          <VolunteerFilesSection
            volunteerName={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            files={detail.files}
            showOtherFiles
            embeddedInGrid
            itemId={detail.id}
            boardId={boardId}
            canUpload={canUploadFiles}
            onUploaded={onFilesUploaded}
          />
          {besideFiles}
        </div>
      ) : (
        <div className="mt-5 md:w-1/2">
          <VolunteerFilesSection
            volunteerName={detail.name}
            profilePhotoUrl={detail.profilePhotoUrl}
            passportFile={detail.passportFile}
            childSafeguardingFile={detail.childSafeguardingFile}
            files={detail.files}
            showOtherFiles
            itemId={detail.id}
            boardId={boardId}
            canUpload={canUploadFiles}
            onUploaded={onFilesUploaded}
          />
        </div>
      )}

      {profilePreviewOpen && profilePreviewFile && (
        <FilePreviewModal
          file={profilePreviewFile}
          volunteerName={detail.name}
          onClose={() => setProfilePreviewOpen(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  tall = false,
}: {
  label: string;
  children: ReactNode;
  tall?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl bg-crm-surface/80 px-4 py-3 ring-1 ring-crm-taupe/20/80 ${
        tall ? 'min-h-24' : 'h-24'
      }`}
    >
      <dt className="text-xs font-medium uppercase tracking-wide text-crm-slate">
        {label}
      </dt>
      <dd className="mt-1 flex-1 overflow-hidden text-sm">{children}</dd>
    </div>
  );
}
